import { DEFAULT_BRAND, DEFAULT_COLORS } from "@/lib/constants";
import type { Brand, BrandColors, Product, ProductImage, VideoItem } from "@/lib/types";
import { getSupabase } from "./client";

export const DEFAULT_CATALOG_SLUG = "default";

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
  };
}

export async function loadCatalog(slug = DEFAULT_CATALOG_SLUG): Promise<{
  catalogId: string;
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

  if (!catalog) {
    const inserted = await getSupabase()
      .from("catalogs")
      .insert({
        slug,
        brand: DEFAULT_BRAND,
        colors: DEFAULT_COLORS,
      })
      .select("id, slug, brand, colors, is_published")
      .single();

    if (inserted.error) throw inserted.error;
    catalog = inserted.data;
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
    brand: { ...DEFAULT_BRAND, ...(row.brand ?? {}) },
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
