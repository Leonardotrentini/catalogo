import { NextResponse } from "next/server";
import { couponDiscountAmount, normalizeCouponCode } from "@/lib/coupons";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: {
    slug?: string;
    code?: string;
    customerName?: string;
    customerPhone?: string;
    pieces?: number;
    registeredTotal?: number;
    subtotal?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const slug = body.slug?.trim();
  const code = normalizeCouponCode(body.code ?? "");
  if (!slug || !code) {
    return NextResponse.json({ error: "Informe o cupom." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: catalog, error: catalogError } = await admin
    .from("catalogs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: 500 });
  if (!catalog) return NextResponse.json({ error: "Catálogo não encontrado." }, { status: 404 });

  const { data: influencer, error } = await admin
    .from("influencers")
    .select("id, name, coupon_code, discount_percent, active")
    .eq("catalog_id", catalog.id)
    .eq("coupon_code", code)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!influencer || influencer.active === false) {
    return NextResponse.json({ error: "Cupom inválido ou inativo." }, { status: 404 });
  }

  const subtotal = Math.max(0, Number(body.subtotal) || 0);
  const discountPercent = Number(influencer.discount_percent) || 0;
  const couponDiscount = couponDiscountAmount(subtotal, discountPercent);
  const total = Math.max(0, subtotal - couponDiscount);

  const { data: sale, error: saleError } = await admin
    .from("coupon_sales")
    .insert({
      catalog_id: catalog.id,
      influencer_id: influencer.id,
      coupon_code: influencer.coupon_code,
      customer_name: (body.customerName ?? "").trim(),
      customer_phone: (body.customerPhone ?? "").trim(),
      pieces: Math.max(0, Math.floor(Number(body.pieces) || 0)),
      total,
      registered_total: Math.max(0, Number(body.registeredTotal) || subtotal),
      coupon_discount: couponDiscount,
      source: "whatsapp",
    })
    .select("id")
    .single();
  if (saleError) return NextResponse.json({ error: saleError.message }, { status: 500 });

  return NextResponse.json({
    saleId: sale.id,
    influencerId: influencer.id,
    influencerName: influencer.name,
    couponCode: influencer.coupon_code,
    discountPercent,
    couponDiscount,
    total,
  });
}
