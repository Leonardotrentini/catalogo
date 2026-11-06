import type { GalleryItem, Product, ProductImage, VideoItem } from "./types";

export function normalizeImages(images: Array<string | ProductImage> | undefined): ProductImage[] {
  return (images ?? []).map((img) => (typeof img === "string" ? { src: img } : img));
}

export type MediaSlot =
  | { kind: "image"; index: number; src: string; color?: string; order: number }
  | {
      kind: "video";
      index: number;
      src: string;
      color?: string;
      order: number;
      videoType: VideoItem["type"];
      name?: string;
    };

function hasExplicitOrder(images: ProductImage[], videos: VideoItem[]): boolean {
  return images.some((img) => img.order != null) || videos.some((v) => v.order != null);
}

/**
 * Fallback when `order` is missing.
 * Grid thumb is always the first *photo* (`productThumbSrc`).
 * `coverType` must NOT bury YouTube — old CAPA clicks saved cover_type=image.
 */
function legacyOrder(kind: "image" | "video", index: number, hasVideos: boolean): number {
  if (hasVideos) return kind === "video" ? index : 1000 + index;
  return index;
}

function slotSort(a: MediaSlot, b: MediaSlot): number {
  if (a.order !== b.order) return a.order - b.order;
  if (a.kind !== b.kind) return a.kind === "video" ? -1 : 1;
  return a.index - b.index;
}

/** Unified media list for admin drag + public gallery. */
export function buildMediaSlots(product: Pick<Product, "images" | "videos" | "coverType">): MediaSlot[] {
  const images = normalizeImages(product.images);
  const videos = product.videos ?? [];
  const hasVideos = videos.length > 0;
  const useExplicit = hasExplicitOrder(images, videos);

  // If only images were stamped with order (video never got one), ignore those
  // stamps and fall back to video-first — otherwise YouTube stays stuck at the end.
  const videoMissingOrder = hasVideos && videos.some((v) => v.order == null);
  const imagesHaveOrder = images.some((img) => img.order != null);
  const ignorePartialOrders = videoMissingOrder && imagesHaveOrder;

  const slots: MediaSlot[] = [
    ...images.map((img, index) => ({
      kind: "image" as const,
      index,
      src: img.src,
      color: img.color,
      order:
        useExplicit && !ignorePartialOrders && img.order != null
          ? img.order
          : legacyOrder("image", index, hasVideos),
    })),
    ...videos.map((video, index) => ({
      kind: "video" as const,
      index,
      src: video.src,
      color: video.color,
      order:
        useExplicit && !ignorePartialOrders && video.order != null
          ? video.order
          : legacyOrder("video", index, hasVideos),
      videoType: video.type,
      name: video.name,
    })),
  ];

  return slots.sort(slotSort);
}

/** Apply a dragged slot order back into images/videos + coverType. */
export function applyMediaSlotOrder(
  images: ProductImage[],
  videos: VideoItem[],
  slots: MediaSlot[],
): { images: ProductImage[]; videos: VideoItem[]; coverType: "video" | "image" } {
  const nextImages = images.map((img) => ({ ...img }));
  const nextVideos = videos.map((v) => ({ ...v }));

  slots.forEach((slot, order) => {
    if (slot.kind === "image") {
      nextImages[slot.index] = { ...nextImages[slot.index], order };
    } else {
      nextVideos[slot.index] = { ...nextVideos[slot.index], order };
    }
  });

  const coverType = slots[0]?.kind === "video" ? "video" : "image";
  return { images: nextImages, videos: nextVideos, coverType };
}

/** Stamp sequential `order` + coverType from current gallery order (load/save). */
export function normalizeProductMedia(
  product: Pick<Product, "images" | "videos" | "coverType">,
): { images: ProductImage[]; videos: VideoItem[]; coverType: "video" | "image" } {
  const images = normalizeImages(product.images);
  const videos = [...(product.videos ?? [])];
  return applyMediaSlotOrder(images, videos, buildMediaSlots({ ...product, images, videos }));
}

/** Move a video to the start of the gallery (opens product on that video). */
export function moveVideoToStart(
  images: ProductImage[],
  videos: VideoItem[],
  videoIndex = 0,
): { images: ProductImage[]; videos: VideoItem[]; coverType: "video" | "image" } {
  const slots = buildMediaSlots({ images, videos, coverType: "video" });
  const from = slots.findIndex((s) => s.kind === "video" && s.index === videoIndex);
  if (from <= 0) {
    return applyMediaSlotOrder(images, videos, slots);
  }
  return applyMediaSlotOrder(images, videos, reorder(slots, from, 0));
}

export function prefersVideoCover(product: Pick<Product, "videos" | "coverType" | "images">): boolean {
  if (product.videos.length === 0) return false;
  return buildMediaSlots(product)[0]?.kind === "video";
}

export function nextMediaOrder(images: ProductImage[], videos: VideoItem[]): number {
  const orders = [
    ...images.map((img, i) => img.order ?? i),
    ...videos.map((v, i) => v.order ?? i),
  ];
  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}

export function buildGallery(product: Product): GalleryItem[] {
  return buildMediaSlots(product).map((slot) => {
    if (slot.kind === "image") {
      return { kind: "image", src: slot.src, color: slot.color };
    }
    return {
      kind: "video",
      src: slot.src,
      color: slot.color,
      videoType: slot.videoType,
      name: slot.name,
    };
  });
}

export function filterGalleryByColor(items: GalleryItem[], color: string): GalleryItem[] {
  if (!color) return items;
  const matched = items.filter((item) => !item.color || item.color === color);
  return matched.length > 0 ? matched : items;
}

/** Image used on grids/home — first photo by gallery order (never video). */
export function productThumbSrc(product: Product): string {
  const firstImage = buildMediaSlots(product).find((slot) => slot.kind === "image");
  return firstImage?.src ?? normalizeImages(product.images)[0]?.src ?? "";
}

/** True when product has any playable video (YouTube link or leftover file). */
export function productThumbIsVideo(product: Product): boolean {
  return product.videos.some((v) => Boolean(v.src));
}

export function productThumbPoster(product: Product): string {
  return productThumbSrc(product);
}

export function colorImageForCart(product: Product, color: string): string {
  const images = normalizeImages(product.images);
  const match = images.find((img) => img.color && colorsMatch(img.color, color));
  return match?.src ?? productThumbSrc(product) ?? images[0]?.src ?? "";
}

function colorsMatch(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Index in gallery for the photo tagged with the selected color (falls back to first image). */
export function galleryIndexForColor(product: Product, items: GalleryItem[], color: string): number {
  if (!color || items.length === 0) return 0;

  const tagged = items.findIndex(
    (item) => item.kind === "image" && item.color && colorsMatch(item.color, color),
  );
  if (tagged >= 0) return tagged;

  const preferredSrc = colorImageForCart(product, color);
  const bySrc = items.findIndex((item) => item.kind === "image" && item.src === preferredSrc);
  if (bySrc >= 0) return bySrc;

  return 0;
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
