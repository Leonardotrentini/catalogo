import { NextResponse } from "next/server";
import { DEFAULT_BRAND, DEFAULT_COLORS } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

type Params = { params: Promise<{ id: string }> };

type UpdateBody = {
  fullName?: string;
  email?: string;
  password?: string;
  catalogSlug?: string | null;
  role?: "tenant" | "super_admin";
  is_active?: boolean;
};

async function syncTenantCatalog(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  catalogSlug: string,
  previousSlug: string | null,
) {
  const { data: slugTaken } = await admin
    .from("profiles")
    .select("id")
    .eq("catalog_slug", catalogSlug)
    .neq("id", userId)
    .maybeSingle();

  if (slugTaken) {
    return { error: "Este slug já está em uso por outro usuário" };
  }

  const { data: ownedCatalog } = await admin
    .from("catalogs")
    .select("id, slug")
    .eq("owner_id", userId)
    .maybeSingle();

  if (ownedCatalog) {
    const { data: catalogSlugTaken } = await admin
      .from("catalogs")
      .select("id")
      .eq("slug", catalogSlug)
      .neq("id", ownedCatalog.id)
      .maybeSingle();

    if (catalogSlugTaken) {
      return { error: "Este endereço já está em uso" };
    }

    await admin
      .from("catalogs")
      .update({ slug: catalogSlug, updated_at: new Date().toISOString() })
      .eq("id", ownedCatalog.id);

    return { catalogSlug };
  }

  const { data: catalogExists } = await admin
    .from("catalogs")
    .select("id, owner_id")
    .eq("slug", catalogSlug)
    .maybeSingle();

  if (catalogExists && catalogExists.owner_id && catalogExists.owner_id !== userId) {
    return { error: "Este slug já pertence a outro catálogo" };
  }

  if (!catalogExists) {
    await admin.from("catalogs").insert({
      slug: catalogSlug,
      brand: DEFAULT_BRAND,
      colors: DEFAULT_COLORS,
      owner_id: userId,
    });
  } else {
    await admin.from("catalogs").update({ owner_id: userId }).eq("slug", catalogSlug);
  }

  if (previousSlug && previousSlug !== catalogSlug) {
    await admin
      .from("catalogs")
      .update({ owner_id: null })
      .eq("slug", previousSlug)
      .eq("owner_id", userId);
  }

  return { catalogSlug };
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = (await request.json()) as UpdateBody;
  const admin = createSupabaseAdminClient();

  const { data: existing, error: loadError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const isSelf = id === auth.user!.id;
  const nextRole = body.role ?? existing.role;
  const nextActive = body.is_active ?? existing.is_active;

  if (isSelf && nextRole !== "super_admin") {
    return NextResponse.json({ error: "Você não pode remover seu próprio acesso de super admin" }, { status: 400 });
  }
  if (isSelf && nextActive === false) {
    return NextResponse.json({ error: "Você não pode desativar sua própria conta" }, { status: 400 });
  }

  if (nextRole === "tenant" && body.catalogSlug !== undefined) {
    const catalogSlug = toSlug(String(body.catalogSlug ?? "").trim());
    if (!catalogSlug) {
      return NextResponse.json({ error: "Slug do catálogo é obrigatório para lojistas" }, { status: 400 });
    }
    const sync = await syncTenantCatalog(admin, id, catalogSlug, existing.catalog_slug);
    if ("error" in sync) return NextResponse.json({ error: sync.error }, { status: 409 });
  }

  const authUpdates: { email?: string; password?: string; user_metadata?: { full_name: string } } = {};
  const email = body.email?.trim().toLowerCase();
  if (email && email !== existing.email) authUpdates.email = email;

  const password = body.password?.trim();
  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 });
    }
    authUpdates.password = password;
  }

  const fullName = body.fullName !== undefined ? body.fullName.trim() : existing.full_name;
  authUpdates.user_metadata = { full_name: fullName };

  if (Object.keys(authUpdates).length > 0) {
    const { error: authError } = await admin.auth.admin.updateUserById(id, authUpdates);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  const profileUpdates: Record<string, unknown> = {
    full_name: fullName,
    role: nextRole,
    is_active: nextActive,
    updated_at: new Date().toISOString(),
  };

  if (email) profileUpdates.email = email;

  if (nextRole === "super_admin") {
    profileUpdates.catalog_slug = null;
  } else if (body.catalogSlug !== undefined) {
    profileUpdates.catalog_slug = toSlug(String(body.catalogSlug).trim());
  } else if (nextRole === "tenant" && !existing.catalog_slug) {
    return NextResponse.json({ error: "Slug do catálogo é obrigatório para lojistas" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("profiles")
    .update(profileUpdates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireSuperAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  if (id === auth.user!.id) {
    return NextResponse.json({ error: "Você não pode excluir a si mesmo" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
