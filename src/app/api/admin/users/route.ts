import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_BRAND, DEFAULT_COLORS } from "@/lib/constants";
import { toSlug } from "@/lib/utils";

async function requireSuperAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "super_admin" || !profile?.is_active) {
    return { error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }

  return { user };
}

export async function GET() {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, full_name, role, catalog_slug, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    fullName?: string;
    catalogSlug?: string;
    role?: "tenant" | "super_admin";
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const fullName = body.fullName?.trim() ?? "";
  const role = body.role ?? "tenant";

  if (!email || !password) {
    return NextResponse.json({ error: "E-mail e senha são obrigatórios" }, { status: 400 });
  }

  if (role === "tenant" && !body.catalogSlug?.trim()) {
    return NextResponse.json({ error: "Slug do catálogo é obrigatório para lojistas" }, { status: 400 });
  }

  const catalogSlug = role === "tenant" ? toSlug(body.catalogSlug!.trim()) : null;
  if (role === "tenant" && !catalogSlug) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  if (catalogSlug) {
    const { data: slugTaken } = await admin.from("profiles").select("id").eq("catalog_slug", catalogSlug).maybeSingle();
    if (slugTaken) {
      return NextResponse.json({ error: "Este slug já está em uso" }, { status: 409 });
    }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message ?? "Erro ao criar usuário" }, { status: 500 });
  }

  if (catalogSlug) {
    const { data: catalogExists } = await admin
      .from("catalogs")
      .select("id")
      .eq("slug", catalogSlug)
      .maybeSingle();

    if (!catalogExists) {
      await admin.from("catalogs").insert({
        slug: catalogSlug,
        brand: DEFAULT_BRAND,
        colors: DEFAULT_COLORS,
        owner_id: created.user.id,
      });
    } else {
      await admin.from("catalogs").update({ owner_id: created.user.id }).eq("slug", catalogSlug);
    }
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .insert({
      id: created.user.id,
      email,
      full_name: fullName,
      role,
      catalog_slug: catalogSlug,
      is_active: true,
    })
    .select("*")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json(profile, { status: 201 });
}
