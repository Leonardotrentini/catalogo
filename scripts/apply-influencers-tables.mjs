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
const sql = fs.readFileSync(
  new URL("../supabase/migrations/20261104_influencers_coupons.sql", import.meta.url),
  "utf8",
);

const parsed = new URL(connectionString);
const hostname = parsed.hostname;
let client;
try {
  const { address } = await dns.promises.lookup(hostname, { family: 4 });
  parsed.hostname = address;
  client = new pg.Client({
    connectionString: parsed.toString(),
    ssl: { rejectUnauthorized: false, servername: hostname },
  });
  await client.connect();
  await client.query(sql);
  const check = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_name in ('influencers', 'coupon_sales') order by table_name",
  );
  console.log(JSON.stringify(check.rows));
  await client.end();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  console.log("\nCole este SQL no Supabase → SQL Editor:\n");
  console.log(sql);
  process.exit(1);
}
