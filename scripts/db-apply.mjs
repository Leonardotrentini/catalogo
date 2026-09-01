import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não definida em .env.local");
  process.exit(1);
}

const files = [
  path.join(root, "supabase", "schema.sql"),
  path.join(root, "supabase", "migrations", "20260831_volume_discounts.sql"),
  path.join(root, "supabase", "migrations", "20260901_auth_multitenant.sql"),
  path.join(root, "supabase", "migrations", "20260901_catalog_media_storage.sql"),
];

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const sql = fs.readFileSync(file, "utf8");
  console.log(`Aplicando ${path.basename(file)}...`);
  await client.query(sql);
  console.log(`  ok`);
}

const tables = await client.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
    and table_type = 'BASE TABLE'
  order by table_name
`);

const columns = await client.query(`
  select column_name, data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'products'
  order by ordinal_position
`);

const counts = await client.query(`
  select
    (select count(*)::int from public.catalogs) as catalogs,
    (select count(*)::int from public.products) as products
`);

console.log("\nTabelas:", tables.rows.map((r) => r.table_name).join(", "));
console.log("Colunas products:", columns.rows.map((r) => r.column_name).join(", "));
console.log("Registros:", counts.rows[0]);

await client.end();
