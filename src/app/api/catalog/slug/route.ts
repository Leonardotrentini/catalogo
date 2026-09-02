import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toSlug } from "@/lib/utils";

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as { catalogId?: string; slug?: string };
  const catalogId = body.catalogId?.trim();
  const nextSlug = toSlug(body.slug?.trim() ?? "");

  if (!catalogId || !nextSlug) {
    return NextResponse.json({ error: "Catálogo e slug são obrigatórios" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    return NextResponse.json({ error: "Conta inativa" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data: catalog, error: catalogError } = await admin
    .from("catalogs")
    .select("id, slug, owner_id")
    .eq("id", catalogId)
    .maybeSingle();

  if (catalogError) return NextResponse.json({ error: catalogError.message }, { status: 500 });
  if (!catalog) return NextResponse.json({ error: "Catálogo não encontrado" }, { status: 404 });

  const isSuperAdmin = profile.role === "super_admin";
  const isOwner = catalog.owner_id === user.id;
  if (!isSuperAdmin && !isOwner) {
    return NextResponse.json({ error: "Sem permissão para alterar este catálogo" }, { status: 403 });
  }

  if (catalog.slug === nextSlug) {
    return NextResponse.json({ slug: nextSlug });
  }

  const { data: slugTaken } = await admin
    .from("catalogs")
    .select("id")
    .eq("slug", nextSlug)
    .neq("id", catalogId)
    .maybeSingle();

  if (slugTaken) {
    return NextResponse.json({ error: "Este endereço já está em uso" }, { status: 409 });
  }

  const ownerId = catalog.owner_id;
  if (ownerId) {
    const { data: profileTaken } = await admin
      .from("profiles")
      .select("id")
      .eq("catalog_slug", nextSlug)
      .neq("id", ownerId)
      .maybeSingle();

    if (profileTaken) {
      return NextResponse.json({ error: "Este endereço já está em uso" }, { status: 409 });
    }
  }

  const { error: updateCatalogError } = await admin
    .from("catalogs")
    .update({ slug: nextSlug, updated_at: new Date().toISOString() })
    .eq("id", catalogId);

  if (updateCatalogError) {
    return NextResponse.json({ error: updateCatalogError.message }, { status: 500 });
  }

  if (ownerId) {
    const { error: updateProfileError } = await admin
      .from("profiles")
      .update({ catalog_slug: nextSlug, updated_at: new Date().toISOString() })
      .eq("id", ownerId);

    if (updateProfileError) {
      return NextResponse.json({ error: updateProfileError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ slug: nextSlug });
}
