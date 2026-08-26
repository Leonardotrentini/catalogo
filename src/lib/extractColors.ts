import { luminance, parseHex, saturation } from "./utils";
import type { BrandColors } from "./types";

function toHex(n: number): string {
  return Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export async function extractColorsFromDataUrl(dataUrl: string): Promise<string[]> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, 100, 100);
  const { data } = ctx.getImageData(0, 0, 100, 100);

  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const lum = luminance(r, g, b);
    if (lum > 0.95 || lum < 0.05) continue;
    const qr = Math.min(255, Math.round(r / 32) * 32);
    const qg = Math.min(255, Math.round(g / 32) * 32);
    const qb = Math.min(255, Math.round(b / 32) * 32);
    const key = `${qr},${qg},${qb}`;
    const existing = buckets.get(key);
    if (existing) existing.count += 1;
    else buckets.set(key, { r: qr, g: qg, b: qb, count: 1 });
  }

  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const unique: { r: number; g: number; b: number }[] = [];

  for (const c of sorted) {
    const tooClose = unique.some((u) => {
      const d = Math.sqrt((u.r - c.r) ** 2 + (u.g - c.g) ** 2 + (u.b - c.b) ** 2);
      return d < 60;
    });
    if (!tooClose) unique.push(c);
    if (unique.length >= 6) break;
  }

  return unique.map((c) => rgbToHex(c.r, c.g, c.b));
}

export function mapExtractedToBrand(hexes: string[]): BrandColors {
  if (hexes.length === 0) {
    return {
      primary: "#0A1F18",
      accent: "#C9A84C",
      text: "#ffffff",
      card: "#122E23",
    };
  }

  const parsed = hexes.map((hex) => {
    const rgb = parseHex(hex);
    return {
      hex,
      ...rgb,
      lum: luminance(rgb.r, rgb.g, rgb.b),
      sat: saturation(rgb.r, rgb.g, rgb.b),
    };
  });

  const darkest = parsed.reduce((a, b) => (a.lum < b.lum ? a : b));
  const mostSat = parsed.reduce((a, b) => (a.sat > b.sat ? a : b));
  const mid =
    parsed.find((c) => c.lum >= 0.15 && c.lum <= 0.6) ??
    parsed[Math.floor(parsed.length / 2)];

  return {
    primary: darkest.hex,
    accent: mostSat.hex,
    card: mid.hex,
    text: "#ffffff",
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
