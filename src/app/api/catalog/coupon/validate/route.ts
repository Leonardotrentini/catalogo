import { NextResponse } from "next/server";
import { applyCouponPercent, couponDiscountAmount, normalizeCouponCode } from "@/lib/coupons";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  let body: { slug?: string; code?: string; subtotal?: number };
  try {
    body = (await request.json()) as { slug?: string; code?: string; subtotal?: number };
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const slug = body.slug?.trim();
  const code = normalizeCouponCode(body.code ?? "");
  const subtotal = Math.max(0, Number(body.subtotal) || 0);
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

  const discountPercent = Number(influencer.discount_percent) || 0;
  const discount = couponDiscountAmount(subtotal, discountPercent);
  const total = applyCouponPercent(subtotal, discountPercent);

  return NextResponse.json({
    influencerId: influencer.id,
    influencerName: influencer.name,
    couponCode: influencer.coupon_code,
    discountPercent,
    discount,
    total,
  });
}
