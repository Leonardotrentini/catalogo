import type { CartItem, Product, VolumeDiscount } from "./types";
import { formatMoney, parsePrice } from "./utils";

type RawVolumeDiscount = Partial<VolumeDiscount> & { percent?: number };

export function normalizeVolumeDiscounts(raw: unknown, basePrice?: string): VolumeDiscount[] {
  if (!Array.isArray(raw)) return [];
  const base = basePrice ? parsePrice(basePrice) : 0;

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as RawVolumeDiscount;
      const minQty = Number(row.minQty);
      if (!Number.isFinite(minQty) || minQty < 1) return null;

      let unitPrice: string | null = null;
      if (row.unitPrice != null && String(row.unitPrice).trim() !== "") {
        const parsed = parsePrice(String(row.unitPrice));
        if (parsed > 0) unitPrice = formatMoney(parsed);
      } else if (row.percent != null && base > 0) {
        const percent = Number(row.percent);
        if (Number.isFinite(percent) && percent > 0 && percent <= 100) {
          unitPrice = formatMoney(base * (1 - percent / 100));
        }
      }

      if (!unitPrice) return null;
      return { minQty: Math.floor(minQty), unitPrice };
    })
    .filter(Boolean)
    .sort((a, b) => a!.minQty - b!.minQty) as VolumeDiscount[];
}

export function unitPriceForQty(
  product: Pick<Product, "price" | "volumeDiscounts">,
  qty: number,
): number {
  const base = parsePrice(product.price);
  const tiers = normalizeVolumeDiscounts(product.volumeDiscounts, product.price);
  if (qty <= 0 || tiers.length === 0) return base;

  let applied = base;
  for (const tier of tiers) {
    if (qty >= tier.minQty) applied = parsePrice(tier.unitPrice);
  }
  return applied;
}

export function lineTotalForProduct(
  product: Pick<Product, "price" | "volumeDiscounts">,
  qty: number,
): number {
  return unitPriceForQty(product, qty) * qty;
}

export function lowestTierUnitPrice(product: Pick<Product, "price" | "volumeDiscounts">): number | null {
  const tiers = normalizeVolumeDiscounts(product.volumeDiscounts, product.price);
  if (tiers.length === 0) return null;
  return Math.min(...tiers.map((tier) => parsePrice(tier.unitPrice)));
}

export function hasVolumePricing(product: Pick<Product, "price" | "volumeDiscounts">): boolean {
  return normalizeVolumeDiscounts(product.volumeDiscounts, product.price).length > 0;
}

export function productQtyInCart(cart: CartItem[], productId: number): number {
  return cart.reduce((sum, item) => (item.productId === productId ? sum + item.qty : sum), 0);
}

export function cartTotalPieces(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

export function cartLineRegisteredTotal(item: CartItem): number {
  return parsePrice(item.price) * item.qty;
}

export function cartLineDiscountedTotal(
  item: CartItem,
  cart: CartItem[],
  product: Pick<Product, "price" | "volumeDiscounts" | "id">,
): number {
  return cartLineSubtotal(item, cart, product);
}

export function cartLineSavings(
  item: CartItem,
  cart: CartItem[],
  product: Pick<Product, "price" | "volumeDiscounts" | "id">,
): number {
  return Math.max(0, cartLineRegisteredTotal(item) - cartLineDiscountedTotal(item, cart, product));
}

export function cartRegisteredGrandTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + cartLineRegisteredTotal(item), 0);
}

export function cartTotalSavings(cart: CartItem[], products: Product[]): number {
  return Math.max(0, cartRegisteredGrandTotal(cart) - cartGrandTotal(cart, products));
}

export function cartLineSubtotal(
  item: CartItem,
  cart: CartItem[],
  product: Pick<Product, "price" | "volumeDiscounts" | "id">,
): number {
  const unit = unitPriceForQty(product, cartTotalPieces(cart));
  return unit * item.qty;
}

export function cartGrandTotal(cart: CartItem[], products: Product[]): number {
  const totalQty = cartTotalPieces(cart);
  let total = 0;
  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    const unit = product ? unitPriceForQty(product, totalQty) : parsePrice(item.price);
    total += unit * item.qty;
  }
  return total;
}
