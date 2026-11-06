import type { CartItem } from "@/lib/types";

/** wa.me links get cut by the phone when the URL is too long. */
const WHATSAPP_URL_LIMIT = 3800;

export function formatSizeQty(size: string, qty: number): string {
  const label = size.trim() || "—";
  // "G1" + 3 must not become "G13". Letters only stay as P3, GG3.
  if (/\d/.test(label)) return `${label}×${qty}`;
  return `${label}${qty}`;
}

/** One block per product, one line per color: "Preto: P3 · M1 · GG2". */
export function formatOrderLines(cart: CartItem[]): string {
  const products: {
    id: number;
    name: string;
    colors: { name: string; sizes: { size: string; qty: number }[] }[];
  }[] = [];

  for (const item of cart) {
    let product = products.find((entry) => entry.id === item.productId);
    if (!product) {
      product = { id: item.productId, name: item.name, colors: [] };
      products.push(product);
    }
    const colorName = item.colorName.trim() || "Sem cor";
    let color = product.colors.find((entry) => entry.name === colorName);
    if (!color) {
      color = { name: colorName, sizes: [] };
      product.colors.push(color);
    }
    const size = item.size.trim() || "—";
    const existing = color.sizes.find((entry) => entry.size === size);
    if (existing) existing.qty += item.qty;
    else color.sizes.push({ size, qty: item.qty });
  }

  return products
    .map((product) => {
      const lines = product.colors.map(
        (color) =>
          `${color.name}: ${color.sizes.map((entry) => formatSizeQty(entry.size, entry.qty)).join(" · ")}`,
      );
      return `*${product.name}*\n${lines.join("\n")}`;
    })
    .join("\n\n");
}

export function buildWhatsAppOrderMessage(input: {
  brandName: string;
  customerName: string;
  customerPhone: string;
  cep: string;
  sellerName: string;
  pieces: number;
  registeredTotal: string;
  savings: string;
  total: string;
  cart: CartItem[];
  couponCode?: string;
  influencerName?: string;
  couponDiscount?: string;
}): string {
  const piecesLabel = input.pieces === 1 ? "1 peça" : `${input.pieces} peças`;
  const hasDiscount = Number(input.savings) > 0;
  const summary = hasDiscount
    ? `${piecesLabel}\nValor registrado: R$ ${input.registeredTotal}\nEconomia: R$ ${input.savings}\n*Total com desconto: R$ ${input.total}*`
    : `${piecesLabel}\n*Total: R$ ${input.total}*`;
  const couponBlock =
    input.couponCode
      ? `\nCupom: *${input.couponCode}*` +
        (input.influencerName ? `\nInfluenciador: ${input.influencerName}` : "") +
        (input.couponDiscount && Number(input.couponDiscount) > 0
          ? `\nDesconto do cupom: R$ ${input.couponDiscount}`
          : "") +
        `\n`
      : "";
  return (
    `🛒 *NOVO PEDIDO — ${input.brandName || "Catálogo"}*\n\n` +
    `Nome: ${input.customerName}\n` +
    `WhatsApp: +${input.customerPhone}\n` +
    `CEP: ${input.cep}\n` +
    `Vendedor: ${input.sellerName}\n` +
    `${couponBlock}\n` +
    `${summary}\n` +
    `Leitura: letra = tamanho, número = quantidade de peças. Ex.: P3 = 3 peças no P.\n\n` +
    formatOrderLines(input.cart)
  );
}

export function whatsAppOrderUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function whatsAppOrderFits(phone: string, message: string): boolean {
  return whatsAppOrderUrl(phone, message).length <= WHATSAPP_URL_LIMIT;
}
