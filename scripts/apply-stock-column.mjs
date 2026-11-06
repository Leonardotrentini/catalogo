import dns from "node:dns";
import fs from "node:fs";
import pg from "pg";

dns.setDefaultResultOrder("ipv4first");

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const line = env.split(/\r?\n/).find((entry) => entry.startsWith("DATABASE_URL="));
if (!line) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}
const connectionString = line.slice("DATABASE_URL=".length).trim();
const parsed = new URL(connectionString);
const hostname = parsed.hostname;
const { address } = await dns.promises.lookup(hostname, { family: 4 });
parsed.hostname = address;
const client = new pg.Client({
  connectionString: parsed.toString(),
  ssl: { rejectUnauthorized: false, servername: hostname },
});

await client.connect();
await client.query("alter table public.products add column if not exists stock jsonb");
const check = await client.query(
  "select column_name, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'stock'",
);
console.log(JSON.stringify(check.rows));
await client.end();
