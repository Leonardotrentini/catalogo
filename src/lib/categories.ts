import type { Product } from "@/lib/types";

export function normalizeCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const names: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const name = entry.trim();
    if (!name) continue;
    if (!names.some((item) => item.toLowerCase() === name.toLowerCase())) names.push(name);
  }
  return names;
}

/** Pastas da loja: lista salva + categorias já usadas nos produtos. */
export function mergeCatalogCategories(
  stored: string[] | undefined,
  products: Pick<Product, "category">[],
): string[] {
  const fromProducts = products.map((product) => product.category.trim()).filter(Boolean);
  return normalizeCategories([...(stored ?? []), ...fromProducts]);
}

export function countProductsInCategory(
  products: Pick<Product, "category">[],
  category: string,
): number {
  const key = category.trim().toLowerCase();
  return products.filter((product) => product.category.trim().toLowerCase() === key).length;
}

export function duplicateProductDraft(product: Product): Omit<Product, "id"> {
  return {
    name: `${product.name.trim() || "Produto"} (cópia)`,
    category: product.category,
    qty: product.qty,
    sizes: [...product.sizes],
    price: product.price,
    colors: [...product.colors],
    images: product.images.map((image) => ({ ...image })),
    videos: product.videos.map((video) => ({ ...video })),
    description: product.description,
    coverType: product.coverType,
    volumeDiscounts: product.volumeDiscounts?.map((tier) => ({ ...tier })),
    stock: product.stock?.map((line) => ({ ...line })),
  };
}
