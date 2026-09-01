import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_BRAND, DEFAULT_COLORS } from "@/lib/constants";
import { toSlug } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }

  const { data: existing } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing) {
    return NextResponse.json(existing satisfies Profile);
  }

  const superEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const isSuper = superEmail && user.email.toLowerCase() === superEmail;
  const role = isSuper ? "super_admin" : "tenant";

  const admin = createSupabaseAdminClient();
  let catalogSlug: string | null = null;

  if (!isSuper) {
    const base = toSlug(user.email.split("@")[0] || "loja") || "loja";
    catalogSlug = base;
    let attempt = catalogSlug;
    let n = 1;

    while (true) {
      const { data: taken } = await admin.from("profiles").select("id").eq("catalog_slug", attempt).maybeSingle();
      if (!taken) {
        catalogSlug = attempt;
        break;
      }
      n += 1;
      attempt = `${base}${n}`;
    }

    const { data: catalogExists } = await admin
      .from("catalogs")
      .select("id")
      .eq("slug", catalogSlug)
      .maybeSingle();

    if (!catalogExists) {
      const { error: catalogError } = await admin.from("catalogs").insert({
        slug: catalogSlug,
        brand: DEFAULT_BRAND,
        colors: DEFAULT_COLORS,
        owner_id: user.id,
      });
      if (catalogError) {
        return NextResponse.json({ error: catalogError.message }, { status: 500 });
      }
    } else {
      await admin.from("catalogs").update({ owner_id: user.id }).eq("slug", catalogSlug);
    }
  }

  const { data: profile, error } = await admin
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
      role,
      catalog_slug: catalogSlug,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(profile satisfies Profile);
}
