import { NextResponse } from "next/server";
import { applyStockSale, normalizeStock, stockTotal, usesStockMatrix } from "@/lib/stock";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { StockLine } from "@/lib/types";

type SaleItem = {
  productId?: number;
  color?: string;
  size?: string;
  qty?: number;
};

export async function POST(request: Request) {
  let body: { slug?: string; items?: SaleItem[] };
  try {
    body = (await request.json()) as { slug?: string; items?: SaleItem[] };
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const slug = body.slug?.trim();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!slug || items.length === 0) {
    return NextResponse.json({ error: "Catálogo e itens são obrigatórios." }, { status: 400 });
  }

  const sales = items
    .map((item) => ({
      productId: Number(item.productId),
      color: typeof item.color === "string" ? item.color : "",
      size: typeof item.size === "string" ? item.size : "",
      qty: Math.max(0, Math.floor(Number(item.qty) || 0)),
    }))
    .filter((item) => item.productId > 0 && item.qty > 0);

  if (sales.length === 0) {
    return NextResponse.json({ error: "Nenhuma peça para baixar do estoque." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: catalog, error: catalogError } = await admin
    .from("catalogs")
    .select("id, brand")
    .eq("slug", slug)
    .maybeSingle();

  if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: 500 });
  if (!catalog) return NextResponse.json({ error: "Catálogo não encontrado." }, { status: 404 });

  const brand = catalog.brand as { stockControl?: boolean } | null;
  if (brand?.stockControl !== true) {
    return NextResponse.json({ products: [] });
  }

  const ids = [...new Set(sales.map((item) => item.productId))];
  const { data: rows, error: productsError } = await admin
    .from("products")
    .select("id, stock, name")
    .eq("catalog_id", catalog.id)
    .in("id", ids);

  if (productsError) return NextResponse.json({ error: productsError.message }, { status: 500 });

  const byId = new Map((rows ?? []).map((row) => [Number(row.id), row]));
  const updates: { id: number; stock: StockLine[]; qty: number }[] = [];

  for (const productId of ids) {
    const row = byId.get(productId);
    const stock = normalizeStock(row?.stock);
    if (!row || !usesStockMatrix({ stock })) continue;

    const productSales = sales
      .filter((item) => item.productId === productId)
      .map(({ color, size, qty }) => ({ color, size, qty }));
    const applied = applyStockSale(stock ?? [], productSales);
    if (!applied.ok) {
      const where = [applied.color, applied.size].filter(Boolean).join(" ");
      return NextResponse.json(
        {
          error: where
            ? `Estoque insuficiente em ${where}. Restam ${applied.left}.`
            : `Estoque insuficiente. Restam ${applied.left}.`,
        },
        { status: 409 },
      );
    }
    updates.push({ id: productId, stock: applied.stock, qty: stockTotal(applied.stock) });
  }

  for (const update of updates) {
    const { error } = await admin
      .from("products")
      .update({
        stock: update.stock,
        qty: update.qty,
        updated_at: new Date().toISOString(),
      })
      .eq("id", update.id)
      .eq("catalog_id", catalog.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: updates });
}
