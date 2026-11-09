import { DEFAULT_COLORS } from "@/lib/constants";
import type { BrandColors, CatalogColors, ColorSurface } from "@/lib/types";

const PALETTE_KEYS = ["primary", "accent", "text", "card"] as const;

function readPalette(raw: unknown, fallback: BrandColors): BrandColors {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next = { ...fallback };
  for (const key of PALETTE_KEYS) {
    const value = src[key];
    if (typeof value === "string" && value.trim()) next[key] = value;
  }
  return next;
}

/** Normaliza o jsonb `catalogs.colors` (home + overrides opcionais). */
export function normalizeCatalogColors(raw: unknown): CatalogColors {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const base = readPalette(src, DEFAULT_COLORS);
  const product =
    src.product && typeof src.product === "object"
      ? readPalette(src.product, base)
      : undefined;
  const cart =
    src.cart && typeof src.cart === "object" ? readPalette(src.cart, base) : undefined;

  return {
    ...base,
    ...(product ? { product } : {}),
    ...(cart ? { cart } : {}),
  };
}

export function baseBrandColors(colors: CatalogColors): BrandColors {
  return {
    primary: colors.primary,
    accent: colors.accent,
    text: colors.text,
    card: colors.card,
  };
}

/** Resolve a paleta efetiva de cada superfície (produto/carrinho herdam a home se não tiverem override). */
export function surfaceColors(colors: CatalogColors, surface: ColorSurface): BrandColors {
  const base = baseBrandColors(colors);
  if (surface === "home") return base;
  const override = surface === "product" ? colors.product : colors.cart;
  return override ? { ...base, ...override } : base;
}

export function patchSurfaceColors(
  colors: CatalogColors,
  surface: ColorSurface,
  patch: Partial<BrandColors>,
): CatalogColors {
  if (surface === "home") {
    const nextHome = { ...baseBrandColors(colors), ...patch };
    return {
      ...nextHome,
      ...(colors.product ? { product: colors.product } : {}),
      ...(colors.cart ? { cart: colors.cart } : {}),
    };
  }

  const current = surfaceColors(colors, surface);
  return {
    ...colors,
    [surface]: { ...current, ...patch },
  };
}

export function resetSurfaceColors(colors: CatalogColors, surface: ColorSurface): CatalogColors {
  if (surface === "home") return colors;
  const next = { ...colors };
  delete next[surface];
  return next;
}

export function surfaceHasCustomColors(colors: CatalogColors, surface: ColorSurface): boolean {
  if (surface === "home") return true;
  return Boolean(surface === "product" ? colors.product : colors.cart);
}
