import { notFound } from "next/navigation";
import { CatalogPreview } from "@/components/catalog/CatalogPreview";
import { loadPublishedCatalog } from "@/lib/supabase/catalog-server";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPublishedCatalog(slug);
  const name = data?.brand.name?.trim() || slug;
  return {
    title: name,
    description: `Catálogo digital de ${name}`,
  };
}

export default async function PublicCatalogPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadPublishedCatalog(slug);

  if (!data) notFound();

  return (
    <div className="min-h-screen" style={{ background: data.colors.primary }}>
      <CatalogPreview brand={data.brand} colors={data.colors} products={data.products} publicMode />
    </div>
  );
}
