export function normalizeCouponCode(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9_-]/g, "");
}

export function couponDiscountAmount(subtotal: number, discountPercent: number): number {
  if (subtotal <= 0 || discountPercent <= 0) return 0;
  const pct = Math.min(100, Math.max(0, discountPercent));
  return Math.round(subtotal * (pct / 100) * 100) / 100;
}

export function applyCouponPercent(subtotal: number, discountPercent: number): number {
  return Math.max(0, Math.round((subtotal - couponDiscountAmount(subtotal, discountPercent)) * 100) / 100);
}
