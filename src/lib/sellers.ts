import type { Brand, BrandSeller } from "./types";
import { digitsOnly } from "./utils";

export function newSellerId(): string {
  return `seller-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeSellers(brand: Pick<Brand, "sellers" | "whatsapp">): BrandSeller[] {
  const fromList = (brand.sellers ?? [])
    .map((seller) => ({
      id: seller.id || newSellerId(),
      name: seller.name?.trim() ?? "",
      phone: digitsOnly(seller.phone ?? ""),
    }))
    .filter((seller) => seller.name || seller.phone);

  if (fromList.length > 0) return fromList;

  const legacy = digitsOnly(brand.whatsapp);
  if (legacy) {
    return [{ id: "legacy", name: "Atendimento", phone: legacy }];
  }

  return [];
}

export function primaryWhatsAppDigits(brand: Pick<Brand, "sellers" | "whatsapp">): string {
  const sellers = normalizeSellers(brand);
  return sellers[0]?.phone ?? digitsOnly(brand.whatsapp);
}

export function normalizeBrandSellers(sellers: BrandSeller[] | undefined): BrandSeller[] {
  return (sellers ?? [])
    .map((seller) => ({
      id: seller.id || newSellerId(),
      name: seller.name?.trim() ?? "",
      phone: digitsOnly(seller.phone ?? ""),
    }))
    .filter((seller) => seller.name && seller.phone);
}
