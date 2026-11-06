import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "catalog-media";
const DRY_RUN = process.argv.includes("--dry-run");
const APPLY = process.argv.includes("--apply");

function storagePathFromUrl(url) {
  if (typeof url !== "string" || !url) return null;
  if (url.startsWith("data:")) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}

function collectFromMedia(arr, into) {
  for (const item of arr ?? []) {
    const src = item?.src || item?.url || item?.path || "";
    const path = storagePathFromUrl(src);
    if (path) into.add(path);
  }
}

async function listAll(prefix = "") {
  const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    offset: 0,
  });
  if (error) throw error;
  const files = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata?.size == null) {
      files.push(...(await listAll(path)));
    } else {
      files.push({
        path,
        size: Number(item.metadata.size) || 0,
        mime: item.metadata.mimetype ?? null,
      });
    }
  }
  return files;
}

const { data: catalogs, error: cErr } = await admin
  .from("catalogs")
  .select("id, slug, brand, is_published");
if (cErr) throw cErr;

const { data: products, error: pErr } = await admin
  .from("products")
  .select("id, catalog_id, images, videos");
if (pErr) throw pErr;

const referenced = new Set();

for (const c of catalogs ?? []) {
  const brand = c.brand ?? {};
  for (const key of ["logo", "banner"]) {
    const path = storagePathFromUrl(brand[key]);
    if (path) referenced.add(path);
  }
}

for (const p of products ?? []) {
  collectFromMedia(p.images, referenced);
  collectFromMedia(p.videos, referenced);
}

const allFiles = await listAll("");
const orphans = allFiles.filter((f) => !referenced.has(f.path));
const kept = allFiles.filter((f) => referenced.has(f.path));

const sum = (arr) => arr.reduce((s, f) => s + f.size, 0);
const mb = (n) => +(n / 1024 / 1024).toFixed(3);

const byCatalog = {};
for (const f of orphans) {
  const catId = f.path.split("/")[0];
  const slug = (catalogs ?? []).find((c) => c.id === catId)?.slug ?? catId;
  byCatalog[slug] ??= { count: 0, bytes: 0 };
  byCatalog[slug].count += 1;
  byCatalog[slug].bytes += f.size;
}

console.log(
  JSON.stringify(
    {
      mode: APPLY ? "APPLY" : "DRY_RUN",
      totals: {
        filesInStorage: allFiles.length,
        referenced: referenced.size,
        keptFiles: kept.length,
        orphanFiles: orphans.length,
        keptMB: mb(sum(kept)),
        orphanMB: mb(sum(orphans)),
      },
      orphansByCatalog: Object.fromEntries(
        Object.entries(byCatalog).map(([k, v]) => [k, { ...v, MB: mb(v.bytes) }]),
      ),
      orphanSample: orphans.slice(0, 30).map((f) => ({
        path: f.path,
        MB: mb(f.size),
        mime: f.mime,
      })),
    },
    null,
    2,
  ),
);

if (!APPLY) {
  console.log("\nNada foi apagado. Rode com --apply para remover só os órfãos.");
  process.exit(0);
}

if (orphans.length === 0) {
  console.log("Nenhum órfão para apagar.");
  process.exit(0);
}

// Safety: never delete a path that is referenced
const toDelete = orphans.map((f) => f.path).filter((p) => !referenced.has(p));
const chunkSize = 50;
let deleted = 0;
for (let i = 0; i < toDelete.length; i += chunkSize) {
  const chunk = toDelete.slice(i, i + chunkSize);
  const { error } = await admin.storage.from(BUCKET).remove(chunk);
  if (error) {
    console.error("Erro ao apagar chunk:", error.message);
    process.exit(1);
  }
  deleted += chunk.length;
  console.log(`Apagados ${deleted}/${toDelete.length}`);
}

console.log(`Concluído. Removidos ${deleted} arquivos órfãos (~${mb(sum(orphans))} MB).`);
console.log("Nenhum arquivo referenciado por catálogos/produtos ativos foi tocado.");
