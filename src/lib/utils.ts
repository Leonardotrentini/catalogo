import { PRODUCT_COLORS } from "./constants";

export function toSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "loja";
}

export function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === min) return 0;
  const l = (max + min) / 2;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

export function isLightHex(hex: string): boolean {
  const { r, g, b } = parseHex(hex);
  return luminance(r, g, b) > 0.65;
}

export function normalizeHex(hex: string): string {
  const q = hex.trim().toLowerCase();
  if (!q.startsWith("#")) return `#${q}`;
  return q;
}

export function colorNameFromHex(
  hex: string,
  customColors?: { name: string; hex: string }[],
): string {
  const norm = normalizeHex(hex);
  const found = PRODUCT_COLORS.find((c) => normalizeHex(c.hex) === norm);
  if (found) return found.name;
  const custom = customColors?.find((c) => normalizeHex(c.hex) === norm);
  if (custom?.name.trim()) return custom.name.trim();
  return norm.toUpperCase();
}

export function formatMoney(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

export function parsePrice(value: string): number {
  const n = parseFloat(value.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
