import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq).trim()] ??= trimmed.slice(eq + 1).trim();
  }
}

loadEnvLocal();

function parsePrice(value) {
  return Number(String(value).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
}

function formatMoney(value) {
  const n = typeof value === "string" ? parsePrice(value) : value;
  return n.toFixed(2);
}

function normalizeVolumeDiscounts(raw, basePrice) {
  if (!Array.isArray(raw)) return [];
  const base = basePrice ? parsePrice(basePrice) : 0;
  return raw
    .map((item) => {
      const minQty = Number(item.minQty);
      if (!Number.isFinite(minQty) || minQty < 1) return null;
      let unitPrice = null;
      if (item.unitPrice != null && String(item.unitPrice).trim() !== "") {
        const parsed = parsePrice(String(item.unitPrice));
        if (parsed > 0) unitPrice = formatMoney(parsed);
      } else if (item.percent != null && base > 0) {
        unitPrice = formatMoney(base * (1 - Number(item.percent) / 100));
      }
      if (!unitPrice) return null;
      return { minQty: Math.floor(minQty), unitPrice };
    })
    .filter(Boolean)
    .sort((a, b) => a.minQty - b.minQty);
}

function unitPriceForQty(product, qty) {
  const base = parsePrice(product.price);
  const tiers = normalizeVolumeDiscounts(product.volumeDiscounts, product.price);
  let applied = base;
  for (const tier of tiers) {
    if (qty >= tier.minQty) applied = parsePrice(tier.unitPrice);
  }
  return applied;
}

function lineTotalForProduct(product, qty) {
  return unitPriceForQty(product, qty) * qty;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = createClient(url, key);

const { data, error } = await client.from("products").select("*").eq("name", "over").single();
if (error) throw error;

const product = {
  id: data.id,
  name: data.name,
  price: data.price,
  volumeDiscounts: normalizeVolumeDiscounts(data.volume_discounts, data.price),
};

console.log("Produto:", product.name, "| preço base R$", product.price);
console.log(
  "Faixas:",
  product.volumeDiscounts.map((t) => `${t.minQty}+ → R$ ${t.unitPrice}/un.`).join(", "),
);
console.log("");

for (const qty of [1, 4, 5, 9, 10, 19, 20, 25]) {
  const unit = unitPriceForQty(product, qty);
  const total = lineTotalForProduct(product, qty);
  console.log(`${qty} peças → R$ ${unit.toFixed(2)}/un. → total R$ ${total.toFixed(2)}`);
}
