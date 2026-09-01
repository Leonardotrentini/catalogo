import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ProductImage, VideoItem } from "@/lib/types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 48 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1400;

function randomId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível processar a imagem."));
    img.src = url;
  });
}

export async function compressImageFile(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Arquivo de imagem inválido.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Imagem muito grande (máx. ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)}MB).`);
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Não foi possível comprimir a imagem.");
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Falha ao comprimir imagem."))),
        "image/jpeg",
        0.85,
      );
    });
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function uploadCatalogBlob(
  catalogId: string,
  blob: Blob,
  folder: "images" | "videos",
  ext: string,
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const path = `${catalogId}/${folder}/${randomId()}.${ext}`;
  const { error } = await supabase.storage.from("catalog-media").upload(path, blob, {
    cacheControl: "3600",
    upsert: false,
    contentType: blob.type || undefined,
  });
  if (error) {
    throw new Error(error.message.includes("Bucket not found")
      ? "Storage não configurado. Contate o suporte."
      : `Falha no upload: ${error.message}`);
  }
  const { data } = supabase.storage.from("catalog-media").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadImageFile(catalogId: string, file: File): Promise<string> {
  const blob = await compressImageFile(file);
  return uploadCatalogBlob(catalogId, blob, "images", "jpg");
}

export async function uploadVideoFile(catalogId: string, file: File): Promise<string> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(`Vídeo muito grande (máx. ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB).`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  return uploadCatalogBlob(catalogId, file, "videos", ext);
}

function isRemoteUrl(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

export async function ensureImageUploaded(
  catalogId: string,
  image: ProductImage,
): Promise<ProductImage> {
  if (isRemoteUrl(image.src)) return image;
  if (!image.src.startsWith("data:")) {
    throw new Error("Formato de imagem inválido. Faça upload novamente.");
  }
  const blob = await dataUrlToBlob(image.src);
  const url = await uploadCatalogBlob(catalogId, blob, "images", "jpg");
  return { ...image, src: url };
}

export async function ensureVideoUploaded(
  catalogId: string,
  video: VideoItem,
): Promise<VideoItem> {
  if (video.type === "link") return video;
  if (isRemoteUrl(video.src)) return video;
  if (!video.src.startsWith("data:")) {
    throw new Error("Formato de vídeo inválido. Faça upload novamente.");
  }
  const blob = await dataUrlToBlob(video.src);
  if (blob.size > MAX_VIDEO_BYTES) {
    throw new Error(`Vídeo muito grande (máx. ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)}MB).`);
  }
  const url = await uploadCatalogBlob(catalogId, blob, "videos", "mp4");
  return { ...video, src: url };
}

export async function prepareProductMediaForSave(
  catalogId: string,
  images: ProductImage[],
  videos: VideoItem[],
  onProgress?: (message: string) => void,
): Promise<{ images: ProductImage[]; videos: VideoItem[] }> {
  const pendingImages = images.filter((img) => !isRemoteUrl(img.src)).length;
  const pendingVideos = videos.filter((v) => v.type === "file" && !isRemoteUrl(v.src)).length;
  const total = pendingImages + pendingVideos;
  let done = 0;

  const uploadedImages: ProductImage[] = [];
  for (const image of images) {
    if (!isRemoteUrl(image.src)) {
      onProgress?.(`Enviando imagem ${done + 1} de ${total}…`);
    }
    uploadedImages.push(await ensureImageUploaded(catalogId, image));
    if (!isRemoteUrl(image.src)) done += 1;
  }

  const uploadedVideos: VideoItem[] = [];
  for (const video of videos) {
    if (video.type === "file" && !isRemoteUrl(video.src)) {
      onProgress?.(`Enviando vídeo ${done + 1} de ${total}…`);
    }
    uploadedVideos.push(await ensureVideoUploaded(catalogId, video));
    if (video.type === "file" && !isRemoteUrl(video.src)) done += 1;
  }

  return { images: uploadedImages, videos: uploadedVideos };
}

export function estimateDataUrlPayloadBytes(images: ProductImage[], videos: VideoItem[]): number {
  let bytes = 0;
  for (const img of images) {
    if (img.src.startsWith("data:")) bytes += img.src.length;
  }
  for (const v of videos) {
    if (v.type === "file" && v.src.startsWith("data:")) bytes += v.src.length;
  }
  return bytes;
}
