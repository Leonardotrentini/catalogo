import { redirect } from "next/navigation";
import { CatalogPreview } from "@/components/catalog/CatalogPreview";
import { CatalogSetupGate } from "@/components/CatalogSetupGate";
import { loadPublishedCatalog } from "@/lib/supabase/catalog-server";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const data = await loadPublishedCatalog(slug);
    const name = data?.brand.name?.trim() || slug;
    return {
      title: name,
      description: `Catálogo digital de ${name}`,
    };
  } catch {
    return {
      title: "Vesto Catálogo",
      description: "Catálogo digital",
    };
  }
}

export default async function PublicCatalogPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadPublishedCatalog(slug);

  if (!data) {
    return <CatalogSetupGate slug={slug} />;
  }

  return (
    <div className="min-h-screen" style={{ background: data.colors.primary }}>
      <CatalogPreview brand={data.brand} colors={data.colors} products={data.products} publicMode />
    </div>
  );
}
