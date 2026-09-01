import type { GalleryItem, Product, ProductImage } from "./types";

export function normalizeImages(images: Array<string | ProductImage> | undefined): ProductImage[] {
  return (images ?? []).map((img) => (typeof img === "string" ? { src: img } : img));
}

export function prefersVideoCover(product: Pick<Product, "videos" | "coverType">): boolean {
  if (product.videos.length === 0) return false;
  return product.coverType !== "image";
}

export function buildGallery(product: Product): GalleryItem[] {
  const images: GalleryItem[] = normalizeImages(product.images).map((img) => ({
    kind: "image",
    src: img.src,
    color: img.color,
  }));
  const videos: GalleryItem[] = product.videos.map((v) => ({
    kind: "video",
    src: v.src,
    color: v.color,
    videoType: v.type,
    name: v.name,
  }));
  if (prefersVideoCover(product)) return [...videos, ...images];
  return [...images, ...videos];
}

export function filterGalleryByColor(items: GalleryItem[], color: string): GalleryItem[] {
  if (!color) return items;
  const matched = items.filter((item) => !item.color || item.color === color);
  return matched.length > 0 ? matched : items;
}

export function productThumbSrc(product: Product): string {
  const images = normalizeImages(product.images);
  if (prefersVideoCover(product)) {
    const file = product.videos.find((v) => v.type === "file");
    if (file) return file.src;
  }
  return images[0]?.src ?? "";
}

export function productThumbIsVideo(product: Product): boolean {
  return prefersVideoCover(product) && product.videos.some((v) => v.type === "file");
}

export function productThumbPoster(product: Product): string {
  return normalizeImages(product.images)[0]?.src ?? "";
}

export function colorImageForCart(product: Product, color: string): string {
  const images = normalizeImages(product.images);
  const match = images.find((img) => img.color === color);
  return match?.src ?? images[0]?.src ?? "";
}

export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
