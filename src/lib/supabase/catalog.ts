import { DEFAULT_BRAND, DEFAULT_COLORS } from "@/lib/constants";
import { normalizeHighlightStyle, normalizeHighlights } from "@/lib/highlights";
import { normalizeVolumeDiscounts } from "@/lib/pricing";
import { normalizeBrandSellers, normalizeSellers, primaryWhatsAppDigits } from "@/lib/sellers";
import type { Brand, BrandColors, Product, ProductImage, VideoItem } from "@/lib/types";
import { getSupabase } from "./client";

export const DEFAULT_CATALOG_SLUG = "default";

function normalizeBrand(raw: Partial<Brand> | null | undefined): Brand {
  const merged = { ...DEFAULT_BRAND, ...(raw ?? {}) };
  const sellers = normalizeBrandSellers(
    merged.sellers?.length ? merged.sellers : normalizeSellers(merged),
  );
  return {
    ...merged,
    sellers,
    whatsapp: primaryWhatsAppDigits({ ...merged, sellers }),
    highlights: normalizeHighlights(merged.highlights),
    highlightStyle: normalizeHighlightStyle(merged.highlightStyle),
    checkoutButtonText: merged.checkoutButtonText?.trim() || DEFAULT_BRAND.checkoutButtonText,
    checkoutButtonColor: merged.checkoutButtonColor?.trim() || DEFAULT_BRAND.checkoutButtonColor,
    customProductColors: Array.isArray(merged.customProductColors)
      ? merged.customProductColors
          .filter((c) => c && typeof c.name === "string" && typeof c.hex === "string")
          .map((c) => ({ name: c.name.trim(), hex: c.hex.trim().toLowerCase() }))
      : [],
  };
}

type CatalogRow = {
  id: string;
  slug: string;
  brand: Brand;
  colors: BrandColors;
  is_published: boolean;
};

type ProductRow = {
  id: number;
  catalog_id: string;
  name: string;
  category: string;
  qty: number;
  sizes: string[] | null;
  price: string;
  colors: string[] | null;
  images: ProductImage[] | null;
  videos: VideoItem[] | null;
  description: string;
  cover_type: "video" | "image" | null;
  volume_discounts?: unknown;
  sort_order: number;
};

function mapProduct(row: ProductRow): Product {
  return {
    id: Number(row.id),
    name: row.name ?? "",
    category: row.category ?? "",
    qty: row.qty ?? 0,
    sizes: row.sizes ?? [],
    price: row.price ?? "",
    colors: row.colors ?? [],
    images: row.images ?? [],
    videos: row.videos ?? [],
    description: row.description ?? "",
    coverType: row.cover_type ?? undefined,
    volumeDiscounts: normalizeVolumeDiscounts(row.volume_discounts, row.price),
  };
}

export async function loadCatalog(
  slug = DEFAULT_CATALOG_SLUG,
  options?: { createIfMissing?: boolean; ownerId?: string },
): Promise<{
  catalogId: string;
  slug: string;
  brand: Brand;
  colors: BrandColors;
  products: Product[];
  isPublished: boolean;
}> {
  let { data: catalog, error } = await getSupabase()
    .from("catalogs")
    .select("id, slug, brand, colors, is_published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;

  if (!catalog && options?.createIfMissing && options.ownerId) {
    const inserted = await getSupabase()
      .from("catalogs")
      .insert({
        slug,
        brand: DEFAULT_BRAND,
        colors: DEFAULT_COLORS,
        owner_id: options.ownerId,
      })
      .select("id, slug, brand, colors, is_published")
      .single();

    if (inserted.error) throw inserted.error;
    catalog = inserted.data;
  }

  if (!catalog) {
    throw new Error(`Catálogo "${slug}" não encontrado.`);
  }

  const row = catalog as CatalogRow;

  const { data: productRows, error: productsError } = await getSupabase()
    .from("products")
    .select("*")
    .eq("catalog_id", row.id)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (productsError) throw productsError;

  return {
    catalogId: row.id,
    slug: row.slug,
    brand: normalizeBrand(row.brand),
    colors: { ...DEFAULT_COLORS, ...(row.colors ?? {}) },
    products: (productRows as ProductRow[] | null)?.map(mapProduct) ?? [],
    isPublished: Boolean(row.is_published),
  };
}

export async function saveBrandAndColors(
  catalogId: string,
  brand: Brand,
  colors: BrandColors,
): Promise<void> {
  const { error } = await getSupabase()
    .from("catalogs")
    .update({
      brand,
      colors,
      updated_at: new Date().toISOString(),
    })
    .eq("id", catalogId);

  if (error) throw error;
}

export async function publishCatalog(catalogId: string, slug: string): Promise<void> {
  const { error } = await getSupabase()
    .from("catalogs")
    .update({
      slug: slug || DEFAULT_CATALOG_SLUG,
      is_published: true,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", catalogId);

  if (error) throw error;
}

export async function upsertProduct(
  catalogId: string,
  product: Omit<Product, "id"> & { id?: number },
  sortOrder?: number,
): Promise<Product> {
  const payload = {
    catalog_id: catalogId,
    name: product.name,
    category: product.category,
    qty: product.qty,
    sizes: product.sizes,
    price: product.price,
    colors: product.colors,
    images: product.images,
    videos: product.videos,
    description: product.description,
    cover_type: product.coverType ?? null,
    volume_discounts: normalizeVolumeDiscounts(product.volumeDiscounts, product.price),
    sort_order: sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (product.id) {
    const { data, error } = await getSupabase()
      .from("products")
      .update(payload)
      .eq("id", product.id)
      .eq("catalog_id", catalogId)
      .select("*")
      .single();

    if (error) throw error;
    return mapProduct(data as ProductRow);
  }

  const { data, error } = await getSupabase().from("products").insert(payload).select("*").single();
  if (error) throw error;
  return mapProduct(data as ProductRow);
}

export async function deleteProduct(catalogId: string, productId: number): Promise<void> {
  const { error } = await getSupabase()
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("catalog_id", catalogId);

  if (error) throw error;
}
