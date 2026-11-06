import type { Product, StockLine } from "@/lib/types";

function sameColor(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function normalizeStock(value: unknown): StockLine[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return undefined;
  const lines: StockLine[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as { color?: unknown; size?: unknown; qty?: unknown };
    const qty = Math.max(0, Math.floor(Number(record.qty) || 0));
    lines.push({
      color: typeof record.color === "string" ? record.color : "",
      size: typeof record.size === "string" ? record.size : "",
      qty,
    });
  }
  return lines;
}

export function usesStockMatrix(product: Pick<Product, "stock">): boolean {
  return Array.isArray(product.stock);
}

export function syncStockGrid(
  stock: StockLine[] | undefined,
  colors: string[],
  sizes: string[],
): StockLine[] {
  const colorAxis = colors.length > 0 ? colors : [""];
  const sizeAxis = sizes.length > 0 ? sizes : [""];
  return colorAxis.flatMap((color) =>
    sizeAxis.map((size) => {
      const current = stock?.find((line) => sameColor(line.color, color) && line.size === size);
      return { color, size, qty: current?.qty ?? 0 };
    }),
  );
}

export function stockTotal(stock: StockLine[] | undefined): number {
  return (stock ?? []).reduce((sum, line) => sum + Math.max(0, line.qty), 0);
}

export function lineQty(product: Pick<Product, "stock">, color: string, size: string): number {
  if (!usesStockMatrix(product)) return Number.POSITIVE_INFINITY;
  const line = product.stock?.find((entry) => sameColor(entry.color, color) && entry.size === size);
  return line?.qty ?? 0;
}

export function sizeStock(product: Product, size: string): number {
  if (!usesStockMatrix(product)) return 0;
  return (product.stock ?? [])
    .filter((line) => line.size === size)
    .reduce((sum, line) => sum + line.qty, 0);
}

export function availableColors(product: Product): string[] {
  if (!usesStockMatrix(product)) return product.colors;
  return product.colors.filter((color) =>
    (product.stock ?? []).some((line) => sameColor(line.color, color) && line.qty > 0),
  );
}

export function availableSizes(product: Product, color?: string): string[] {
  if (!usesStockMatrix(product)) return product.sizes;
  return product.sizes.filter((size) =>
    (product.stock ?? []).some((line) => {
      if (line.size !== size || line.qty <= 0) return false;
      if (!color) return true;
      return sameColor(line.color, color);
    }),
  );
}

export function isListedInCatalog(product: Product): boolean {
  if (!usesStockMatrix(product)) return true;
  return stockTotal(product.stock) > 0;
}

export function applyStockSale(
  stock: StockLine[],
  sales: { color: string; size: string; qty: number }[],
): { ok: true; stock: StockLine[] } | { ok: false; color: string; size: string; left: number } {
  const next = stock.map((line) => ({ ...line }));
  for (const sale of sales) {
    const line = next.find((entry) => sameColor(entry.color, sale.color) && entry.size === sale.size);
    const left = line?.qty ?? 0;
    if (!line || left < sale.qty) {
      return { ok: false, color: sale.color, size: sale.size, left };
    }
    line.qty = left - sale.qty;
  }
  return { ok: true, stock: next };
}
