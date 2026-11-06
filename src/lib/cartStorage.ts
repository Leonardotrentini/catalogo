import type { CartItem } from "@/lib/types";

function storageKey(slug: string): string {
  return `vesto-cart:${slug}`;
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.key === "string" &&
    typeof item.productId === "number" &&
    typeof item.name === "string" &&
    typeof item.color === "string" &&
    typeof item.colorName === "string" &&
    typeof item.size === "string" &&
    typeof item.qty === "number" &&
    item.qty > 0 &&
    typeof item.price === "string" &&
    typeof item.image === "string"
  );
}

export function readStoredCart(slug: string): CartItem[] {
  if (typeof window === "undefined" || !slug) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(slug));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isCartItem);
  } catch {
    return [];
  }
}

export function writeStoredCart(slug: string, cart: CartItem[]): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(cart));
  } catch {
    // Storage full or blocked — the in-memory cart still works for this visit.
  }
}
