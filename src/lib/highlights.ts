import type { BrandHighlight, HighlightIcon, HighlightStyle } from "./types";

export const HIGHLIGHT_STYLES: { id: HighlightStyle; label: string; description: string }[] = [
  { id: "pill", label: "Pill", description: "Ícone colorido + texto em cápsula" },
  { id: "minimal", label: "Minimal", description: "Limpo, borda sutil" },
  { id: "outline", label: "Outline", description: "Contorno dourado" },
  { id: "glass", label: "Glass", description: "Vidro fosco translúcido" },
];

export const HIGHLIGHT_ICONS: { id: HighlightIcon; label: string }[] = [
  { id: "globe", label: "Brasil / Envio" },
  { id: "message", label: "WhatsApp" },
  { id: "shield", label: "CNPJ / Segurança" },
  { id: "card", label: "Pagamento" },
  { id: "truck", label: "Entrega" },
  { id: "star", label: "Qualidade" },
  { id: "package", label: "Atacado" },
  { id: "clock", label: "Rapidez" },
  { id: "award", label: "Premium" },
  { id: "heart", label: "Favorito" },
];

export const HIGHLIGHT_PRESETS: Omit<BrandHighlight, "id">[] = [
  { label: "Todo Brasil", icon: "globe", enabled: true },
  { label: "Via WhatsApp", icon: "message", enabled: true },
  { label: "CNPJ ativo", icon: "shield", enabled: true },
  { label: "Pix & Cartão", icon: "card", enabled: true },
  { label: "Envio rápido", icon: "truck", enabled: false },
  { label: "Qualidade premium", icon: "star", enabled: false },
  { label: "Atacado direto", icon: "package", enabled: false },
];

export function createHighlightId(): string {
  return `hl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function defaultHighlights(): BrandHighlight[] {
  return HIGHLIGHT_PRESETS.filter((p) => p.enabled).map((p) => ({
    ...p,
    id: createHighlightId(),
  }));
}

export function normalizeHighlights(raw: unknown): BrandHighlight[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultHighlights();
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Partial<BrandHighlight>;
      if (!row.label?.trim()) return null;
      return {
        id: row.id || createHighlightId(),
        label: row.label.trim(),
        icon: (row.icon as HighlightIcon) || "star",
        enabled: row.enabled !== false,
      };
    })
    .filter(Boolean) as BrandHighlight[];
}

export function normalizeHighlightStyle(raw: unknown): HighlightStyle {
  if (raw === "pill" || raw === "minimal" || raw === "outline" || raw === "glass") return raw;
  return "pill";
}

const ICON_PATHS: Record<HighlightIcon, string> = {
  globe:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm7.93 9h-3.4a12.3 12.3 0 0 0-1.01-4.24A8.02 8.02 0 0 1 19.93 11ZM12 4c.9 1.2 1.63 2.78 1.9 4.5H10.1C10.37 6.78 11.1 5.2 12 4ZM8.48 6.76A12.3 12.3 0 0 0 7.47 11H4.07a8.02 8.02 0 0 1 4.41-4.24ZM4.07 13h3.4c.22 1.54.62 2.98 1.01 4.24A8.02 8.02 0 0 1 4.07 13Zm7.93 7c-.9-1.2-1.63-2.78-1.9-4.5h3.8c-.27 1.72-1 3.3-1.9 4.5Zm3.52-1.76c.39-1.26.79-2.7 1.01-4.24h3.4a8.02 8.02 0 0 1-4.41 4.24Z",
  message:
    "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z",
  shield:
    "M12 2 4 5v6c0 5.25 3.4 10.15 8 11 4.6-.85 8-5.75 8-11V5l-8-3Zm-1 14-3.5-3.5L9.5 10.5 11 12l3.5-3.5L16 10l-5 6Z",
  card: "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Zm2 0v2h14V5H5Zm0 4v8h14V9H5Z",
  truck:
    "M3 6h11v9H3V6Zm13 0h3l2 3v6h-5V6ZM7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  star: "M12 2l2.9 6.26L22 9.27l-5 4.87L18.2 22 12 18.56 5.8 22 7 14.14l-5-4.87 7.1-1.01L12 2Z",
  package:
    "M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.2 6.5 3.6L12 11.4 5.5 7.8 12 4.2ZM5 9.3l6 3.3v6.9l-6-3.3V9.3Zm14 0v6.9l-6 3.3v-6.9l6-3.3Z",
  clock:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v4.6l3.5 2.1-.9 1.5L11 12V7h2Z",
  award:
    "M12 2l2.2 4.5L19 7.2l-3.5 3.4.8 4.9L12 13.8 7.7 15.5l.8-4.9L5 7.2l4.8-.7L12 2Zm0 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  heart:
    "M12 21s-7-4.6-9.5-9.2C.7 8.2 2.6 5 5.8 5c1.7 0 3.3.9 4.2 2.3C10.9 5.9 12.5 5 14.2 5c3.2 0 5.1 3.2 3.3 6.8C19 16.4 12 21 12 21Z",
};

const ICON_COLORS: Record<HighlightIcon, { bg: string; fg: string }> = {
  globe: { bg: "#0d3b20", fg: "#34d399" },
  message: { bg: "#1a3322", fg: "#25D366" },
  shield: { bg: "#1a2744", fg: "#60a5fa" },
  card: { bg: "#3a2a0d", fg: "#f59e0b" },
  truck: { bg: "#1e293b", fg: "#38bdf8" },
  star: { bg: "#3b2f0d", fg: "#fbbf24" },
  package: { bg: "#2a1f3d", fg: "#c084fc" },
  clock: { bg: "#1f2937", fg: "#a78bfa" },
  award: { bg: "#3f1d2e", fg: "#fb7185" },
  heart: { bg: "#3f1d2e", fg: "#f472b6" },
};

export function highlightIconColors(icon: HighlightIcon) {
  return ICON_COLORS[icon] ?? { bg: "#1a3322", fg: "#C9A84C" };
}

export function getHighlightIconPath(icon: HighlightIcon): string {
  return ICON_PATHS[icon];
}
