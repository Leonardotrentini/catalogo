import type { CouponSale, Influencer } from "@/lib/types";
import { normalizeCouponCode } from "@/lib/coupons";
import { getSupabase } from "./client";

type InfluencerRow = {
  id: string;
  catalog_id: string;
  name: string;
  phone: string;
  coupon_code: string;
  discount_percent: number | string;
  active: boolean;
  notes: string;
  created_at?: string;
  updated_at?: string;
};

type SaleRow = {
  id: string;
  catalog_id: string;
  influencer_id: string | null;
  coupon_code: string;
  customer_name: string;
  customer_phone: string;
  pieces: number;
  total: number | string;
  registered_total: number | string;
  coupon_discount: number | string;
  source: string;
  created_at: string;
};

function mapInfluencer(row: InfluencerRow, stats?: { count: number; total: number }): Influencer {
  return {
    id: row.id,
    catalogId: row.catalog_id,
    name: row.name ?? "",
    phone: row.phone ?? "",
    couponCode: row.coupon_code ?? "",
    discountPercent: Number(row.discount_percent) || 0,
    active: row.active !== false,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    salesCount: stats?.count,
    salesTotal: stats?.total,
  };
}

function mapSale(row: SaleRow): CouponSale {
  return {
    id: row.id,
    catalogId: row.catalog_id,
    influencerId: row.influencer_id,
    couponCode: row.coupon_code,
    customerName: row.customer_name ?? "",
    customerPhone: row.customer_phone ?? "",
    pieces: Number(row.pieces) || 0,
    total: Number(row.total) || 0,
    registeredTotal: Number(row.registered_total) || 0,
    couponDiscount: Number(row.coupon_discount) || 0,
    source: row.source ?? "whatsapp",
    createdAt: row.created_at,
  };
}

export async function listInfluencers(catalogId: string): Promise<Influencer[]> {
  const { data, error } = await getSupabase()
    .from("influencers")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const { data: sales, error: salesError } = await getSupabase()
    .from("coupon_sales")
    .select("influencer_id, total")
    .eq("catalog_id", catalogId);
  if (salesError) throw salesError;

  const stats = new Map<string, { count: number; total: number }>();
  for (const sale of sales ?? []) {
    if (!sale.influencer_id) continue;
    const current = stats.get(sale.influencer_id) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += Number(sale.total) || 0;
    stats.set(sale.influencer_id, current);
  }

  return ((data as InfluencerRow[] | null) ?? []).map((row) =>
    mapInfluencer(row, stats.get(row.id) ?? { count: 0, total: 0 }),
  );
}

export async function listCouponSales(
  catalogId: string,
  influencerId?: string,
): Promise<CouponSale[]> {
  let query = getSupabase()
    .from("coupon_sales")
    .select("*")
    .eq("catalog_id", catalogId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (influencerId) query = query.eq("influencer_id", influencerId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data as SaleRow[] | null) ?? []).map(mapSale);
}

export async function upsertInfluencer(
  catalogId: string,
  input: {
    id?: string;
    name: string;
    phone?: string;
    couponCode: string;
    discountPercent: number;
    active?: boolean;
    notes?: string;
  },
): Promise<Influencer> {
  const couponCode = normalizeCouponCode(input.couponCode);
  if (!couponCode) throw new Error("Informe o cupom do influenciador.");
  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome do influenciador.");
  const discountPercent = Math.min(100, Math.max(0, Number(input.discountPercent) || 0));

  const payload = {
    catalog_id: catalogId,
    name,
    phone: (input.phone ?? "").trim(),
    coupon_code: couponCode,
    discount_percent: discountPercent,
    active: input.active !== false,
    notes: (input.notes ?? "").trim(),
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await getSupabase()
      .from("influencers")
      .update(payload)
      .eq("id", input.id)
      .eq("catalog_id", catalogId)
      .select("*")
      .single();
    if (error) throw error;
    return mapInfluencer(data as InfluencerRow);
  }

  const { data, error } = await getSupabase()
    .from("influencers")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return mapInfluencer(data as InfluencerRow);
}

export async function deleteInfluencer(catalogId: string, id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("influencers")
    .delete()
    .eq("id", id)
    .eq("catalog_id", catalogId);
  if (error) throw error;
}

export async function addManualCouponSale(
  catalogId: string,
  input: {
    influencerId: string;
    customerName?: string;
    pieces: number;
    total: number;
  },
): Promise<CouponSale> {
  const { data: influencer, error: influencerError } = await getSupabase()
    .from("influencers")
    .select("*")
    .eq("id", input.influencerId)
    .eq("catalog_id", catalogId)
    .maybeSingle();
  if (influencerError) throw influencerError;
  if (!influencer) throw new Error("Influenciador não encontrado.");

  const { data, error } = await getSupabase()
    .from("coupon_sales")
    .insert({
      catalog_id: catalogId,
      influencer_id: influencer.id,
      coupon_code: influencer.coupon_code,
      customer_name: (input.customerName ?? "").trim(),
      customer_phone: "",
      pieces: Math.max(0, Math.floor(input.pieces) || 0),
      total: Math.max(0, Number(input.total) || 0),
      registered_total: Math.max(0, Number(input.total) || 0),
      coupon_discount: 0,
      source: "manual",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapSale(data as SaleRow);
}
