import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
function readEnv(name) {
  const line = env.split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
  if (!line) throw new Error(`${name} ausente`);
  return line.slice(name.length + 1).trim();
}

const supabase = createClient(readEnv("NEXT_PUBLIC_SUPABASE_URL"), readEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.from("catalogs").select("id, slug, brand");
if (error) throw error;

let updated = 0;
for (const row of data ?? []) {
  const brand = row.brand && typeof row.brand === "object" ? row.brand : {};
  if (brand.stockControl === false) continue;
  const { error: updateError } = await supabase
    .from("catalogs")
    .update({
      brand: { ...brand, stockControl: false },
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);
  if (updateError) throw updateError;
  updated += 1;
  console.log(`${row.slug}: desligado`);
}

console.log(`atualizados ${updated} de ${data?.length ?? 0}`);
