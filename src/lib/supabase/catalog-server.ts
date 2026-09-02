import { DEFAULT_BRAND, DEFAULT_COLORS } from "@/lib/constants";
import { normalizeHighlightStyle, normalizeHighlights } from "@/lib/highlights";
import { normalizeVolumeDiscounts } from "@/lib/pricing";
import { normalizeBrandSellers, normalizeSellers, primaryWhatsAppDigits } from "@/lib/sellers";
import type { Brand, BrandColors, Product, ProductImage, VideoItem } from "@/lib/types";
import { createSupabaseAdminClient } from "./admin";
import { createSupabasePublicServerClient } from "./public-server";

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

function getCatalogDb() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return createSupabasePublicServerClient();
  }
}

export async function loadPublishedCatalog(slug: string): Promise<{
  brand: Brand;
  colors: BrandColors;
  products: Product[];
} | null> {
  try {
    const supabase = getCatalogDb();

    const { data: catalog, error } = await supabase
      .from("catalogs")
      .select("id, slug, brand, colors, is_published")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      console.error("[loadPublishedCatalog] catalogs:", error.message);
      return null;
    }
    if (!catalog) return null;

    const row = catalog as CatalogRow;

    const { data: productRows, error: productsError } = await supabase
      .from("products")
      .select("*")
      .eq("catalog_id", row.id)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (productsError) {
      console.error("[loadPublishedCatalog] products:", productsError.message);
      return null;
    }

    return {
      brand: normalizeBrand(row.brand),
      colors: { ...DEFAULT_COLORS, ...(row.colors ?? {}) },
      products: (productRows as ProductRow[] | null)?.map(mapProduct) ?? [],
    };
  } catch (err) {
    console.error("[loadPublishedCatalog]", err);
    return null;
  }
}
