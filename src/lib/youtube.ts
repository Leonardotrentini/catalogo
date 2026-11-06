import type { BrandVideoPosition } from "@/lib/types";

const YT_ID_RE =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/)|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/;

export function getYoutubeId(url: string): string | null {
  const cleaned = url.trim();
  if (!cleaned) return null;
  const match = cleaned.match(YT_ID_RE);
  return match ? match[1] : null;
}

export function getYoutubeEmbedUrl(url: string): string | null {
  const id = getYoutubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}

export function getYoutubeThumbnailUrl(url: string): string | null {
  const id = getYoutubeId(url);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Capa leve para aparecer rápido no celular. */
export function getYoutubePosterUrl(url: string): string | null {
  const id = getYoutubeId(url);
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

/** Título acima do vídeo. Campo vazio esconde; catálogo antigo mantém o texto padrão. */
export function presentationVideoTitle(title: string | undefined): string {
  if (title === undefined) return "Padrão de qualidade";
  return title.trim();
}

/** Embed URL optimized for fast mobile autoplay (muted). */
export function buildYoutubePlayerSrc(
  url: string,
  options?: { autoplay?: boolean; muted?: boolean },
): string | null {
  const id = getYoutubeId(url);
  if (!id) return null;
  const autoplay = options?.autoplay !== false;
  const muted = options?.muted !== false;
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: muted ? "1" : "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
  });
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/** Home presentation: player normal, começa só no clique. */
export function buildPresentationEmbed(url: string): string | null {
  const id = getYoutubeId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    autoplay: "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function isYoutubeShort(url: string): boolean {
  return /\/shorts\//i.test(url);
}

export const BRAND_VIDEO_POSITIONS = [
  { id: "top", label: "Abaixo do banner" },
  { id: "after-highlights", label: "Depois dos destaques" },
  { id: "after-categories", label: "Depois das categorias" },
  { id: "before-footer", label: "Depois do botão" },
] as const;

export function normalizeVideoPosition(value: unknown): BrandVideoPosition {
  return BRAND_VIDEO_POSITIONS.some((item) => item.id === value)
    ? (value as BrandVideoPosition)
    : "after-categories";
}

/** Canonical watch URL kept in product data. */
export function normalizeYoutubeUrl(url: string): string | null {
  const id = getYoutubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/watch?v=${id}`;
}
