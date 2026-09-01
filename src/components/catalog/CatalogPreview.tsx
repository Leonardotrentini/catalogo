"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { Brand, BrandColors, CartItem, Product, ProductColorEntry } from "@/lib/types";
import {
  colorNameFromHex,
  digitsOnly,
  formatMoney,
  parsePrice,
  withAlpha,
} from "@/lib/utils";
import {
  buildGallery,
  colorImageForCart,
  galleryIndexForColor,
  productThumbIsVideo,
  productThumbPoster,
  productThumbSrc,
} from "@/lib/media";
import { ProductThumbMedia, VideoCoverThumb } from "@/components/ProductThumbMedia";
import { HighlightStrip } from "@/components/HighlightStrip";
import { InstagramIcon } from "@/components/InstagramIcon";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { defaultHighlights } from "@/lib/highlights";
import {
  cartGrandTotal,
  cartLineDiscountedTotal,
  cartLineRegisteredTotal,
  cartLineSavings,
  cartRegisteredGrandTotal,
  cartTotalPieces,
  cartTotalSavings,
  lowestTierUnitPrice,
  normalizeVolumeDiscounts,
  unitPriceForQty,
  hasVolumePricing,
} from "@/lib/pricing";
import { getYoutubeEmbedUrl } from "@/lib/youtube";
import { normalizeSellers, primaryWhatsAppDigits } from "@/lib/sellers";

export function CatalogPreview({
  brand,
  colors: colorsProp,
  setColors,
  products,
  publicMode = false,
  customProductColors,
}: {
  brand: Brand;
  colors: BrandColors;
  setColors?: Dispatch<SetStateAction<BrandColors>>;
  products: Product[];
  publicMode?: boolean;
  customProductColors?: ProductColorEntry[];
}) {
  const palette = customProductColors ?? brand.customProductColors ?? [];
  const colorLabel = (hex: string) => colorNameFromHex(hex, palette);
  const [localColors, setLocalColors] = useState(colorsProp);
  const colors = publicMode ? localColors : colorsProp;
  const updateColors = publicMode ? setLocalColors : setColors!;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartBump, setCartBump] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<number | null>(null);

  const storeName = brand.name.trim() || "Sua loja";
  const categories = useMemo(() => {
    const names = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return names.map((name) => {
      const items = products.filter((p) => p.category === name);
      const withThumb = items.find((p) => productThumbSrc(p));
      return {
        name,
        count: items.length,
        cover: withThumb ? productThumbSrc(withThumb) : "",
        coverVideo: withThumb ? productThumbIsVideo(withThumb) : false,
        coverPoster: withThumb ? productThumbPoster(withThumb) : "",
      };
    });
  }, [products]);

  const categoryProducts = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : [];

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(item: Omit<CartItem, "key">, options?: { silent?: boolean }) {
    const key = `${item.productId}-${item.color}-${item.size}`;
    setCart((prev) => {
      const found = prev.find((c) => c.key === key);
      if (found) {
        return prev.map((c) => (c.key === key ? { ...c, qty: c.qty + item.qty } : c));
      }
      return [...prev, { ...item, key }];
    });
    setCartBump(true);
    setTimeout(() => setCartBump(false), 450);
    if (!options?.silent) {
      setToast(item.name);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div>
      {!publicMode && (
        <div className="mb-4 flex flex-wrap gap-3">
          <MiniPicker label="Fundo" value={colors.primary} onChange={(v) => updateColors((prev) => ({ ...prev, primary: v }))} />
          <MiniPicker label="Destaque" value={colors.accent} onChange={(v) => updateColors((prev) => ({ ...prev, accent: v }))} />
          <MiniPicker label="Cards" value={colors.card} onChange={(v) => updateColors((prev) => ({ ...prev, card: v }))} />
          <MiniPicker label="Texto" value={colors.text} onChange={(v) => updateColors((prev) => ({ ...prev, text: v }))} />
        </div>
      )}

      <div
        className="relative mx-auto overflow-hidden"
        style={{
          maxWidth: publicMode ? 480 : 390,
          width: publicMode ? "100%" : undefined,
          borderRadius: publicMode ? 0 : 20,
          border: publicMode ? "none" : "1px solid rgba(255,255,255,0.06)",
          boxShadow: publicMode ? "none" : "0 24px 64px rgba(0,0,0,0.55)",
          background: colors.primary,
          color: colors.text,
          minHeight: publicMode ? "100dvh" : 720,
        }}
      >
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
          style={{
            background: withAlpha(colors.primary, 0.82),
            backdropFilter: "blur(12px)",
            color: colors.text,
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {activeCategory ? (
              <button
                type="button"
                className="flex min-h-11 items-center gap-1 text-left"
                onClick={() => setActiveCategory(null)}
                style={{ color: colors.text }}
              >
                <span className="text-[18px]">‹</span>
                <span className="truncate text-[14px] font-bold">{activeCategory}</span>
                <span className="text-[12px] opacity-50">({categoryProducts.length})</span>
              </button>
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                {brand.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logo} alt="" className="h-7 w-7 rounded object-contain" />
                ) : null}
                <span className="truncate text-[14px] font-bold">{storeName}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={cartCount > 0 ? `Sacola com ${cartCount} itens` : "Abrir sacola"}
            className={`relative flex h-11 w-11 items-center justify-center rounded-[10px] ${cartBump ? "cart-bounce" : ""}`}
            style={{
              border: `1px solid ${colors.accent}`,
              color: colors.text,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 6h15l-1.5 9h-12z" />
              <path d="M6 6 5 3H2" />
              <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            {cartCount > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{ background: colors.accent, color: colors.primary }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </header>

        {!activeCategory ? (
          <HomeView
            brand={brand}
            colors={colors}
            storeName={storeName}
            categories={categories}
            onOpenCategory={setActiveCategory}
            onOpenCart={() => setCartOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3">
            {categoryProducts.map((product) => (
              <button
                type="button"
                key={product.id}
                onMouseDown={() => setPressedId(product.id)}
                onMouseUp={() => setPressedId(null)}
                onMouseLeave={() => setPressedId(null)}
                onTouchStart={() => setPressedId(product.id)}
                onTouchEnd={() => setPressedId(null)}
                onClick={() => setActiveProduct(product)}
                className="overflow-hidden text-left transition hover:brightness-110"
                style={{
                  background: colors.card,
                  borderRadius: 14,
                  transform: pressedId === product.id ? "scale(0.97)" : "scale(1)",
                  transition: "transform 0.12s ease",
                  color: colors.text,
                  outline: pressedId === product.id ? `2px solid ${colors.accent}` : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                <div
                  className="flex aspect-square w-full items-center justify-center"
                  style={{ background: withAlpha(colors.primary, 0.55) }}
                >
                  {productThumbSrc(product) ? (
                    <ProductThumbMedia product={product} />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{ background: `linear-gradient(135deg, ${colors.card}, ${colors.primary})` }}
                    />
                  )}
                </div>
                <div className="p-2.5">
                  <div className="truncate text-[13px] font-bold">{product.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-[16px] font-bold" style={{ color: colors.accent }}>
                      R$ {formatMoney(product.price)}
                    </span>
                    {hasVolumePricing(product) && lowestTierUnitPrice(product) != null && (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                        style={{ background: withAlpha(colors.accent, 0.15), color: colors.accent }}
                      >
                        A partir de R$ {formatMoney(lowestTierUnitPrice(product)!)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {product.colors.slice(0, 4).map((c) => (
                      <span key={c} className="h-3 w-3 rounded-full border border-white/10" style={{ background: c }} />
                    ))}
                    {product.colors.length > 4 && (
                      <span className="text-[11px] opacity-60">+{product.colors.length - 4}</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {toast && (
          <div
            className="absolute left-3 right-3 top-16 z-30 flex items-center justify-between gap-2 rounded-[12px] px-3 py-3 text-[13px]"
            style={{ background: colors.card, color: colors.text, border: `1px solid ${withAlpha(colors.accent, 0.4)}` }}
          >
            <span>✓ {toast} adicionado</span>
            <button
              type="button"
              className="min-h-11 font-semibold"
              style={{ color: colors.accent }}
              onClick={() => {
                setToast(null);
                setCartOpen(true);
              }}
            >
              Ver carrinho →
            </button>
          </div>
        )}

        {activeProduct && (
          <ProductSheet
            product={activeProduct}
            colors={colors}
            cart={cart}
            colorLabel={colorLabel}
            onClose={() => setActiveProduct(null)}
            onAdd={(item, options) => addToCart(item, options)}
            onOpenCart={() => {
              setActiveProduct(null);
              setActiveCategory(null);
              setCartOpen(true);
            }}
            onGoHome={() => {
              setActiveProduct(null);
              setActiveCategory(null);
            }}
          />
        )}

        {cartOpen && (
          <CartSheet
            brand={brand}
            colors={colors}
            cart={cart}
            products={products}
            setCart={setCart}
            onClose={() => setCartOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

function MiniPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[#999] transition hover:text-white">
      <span className="relative h-[22px] w-[22px]">
        <span className="block h-[22px] w-[22px] rounded-md border border-white/10" style={{ background: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
      {label}
    </label>
  );
}

function HomeView({
  brand,
  colors,
  storeName,
  categories,
  onOpenCategory,
  onOpenCart,
}: {
  brand: Brand;
  colors: BrandColors;
  storeName: string;
  categories: { name: string; count: number; cover: string; coverVideo: boolean; coverPoster: string }[];
  onOpenCategory: (name: string) => void;
  onOpenCart: () => void;
}) {
  const embed = getYoutubeEmbedUrl(brand.videoUrl);
  const ig = brand.instagram.replace(/^@/, "").trim();
  const instagramHref = ig.includes("instagram.com")
    ? ig.startsWith("http")
      ? ig
      : `https://${ig}`
    : `https://instagram.com/${ig}`;
  const whatsappDigits = primaryWhatsAppDigits(brand);

  return (
    <div className="pb-8">
      <div className="relative h-[160px] overflow-hidden">
        {brand.banner ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.banner} alt="" className="h-full w-full object-cover" />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, ${colors.primary}, transparent)`,
              }}
            />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="text-[28px] font-bold tracking-[0.06em]">{storeName}</div>
            <div className="mt-1 text-[13px]" style={{ color: colors.accent }}>
              Atacado de moda • Catálogo digital
            </div>
          </div>
        )}
      </div>

      <HighlightStrip
        items={brand.highlights ?? defaultHighlights()}
        style={brand.highlightStyle ?? "pill"}
        colors={colors}
      />

      <div className={`grid gap-2.5 px-4 ${categories.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {categories.map((cat) => (
          <button
            type="button"
            key={cat.name}
            onClick={() => onOpenCategory(cat.name)}
            className="relative overflow-hidden rounded-[14px] text-left transition hover:brightness-110 active:scale-[0.98]"
            style={{ background: colors.card, cursor: "pointer" }}
          >
            <div
              className={`relative w-full ${categories.length === 1 ? "aspect-[4/5]" : "aspect-[4/5]"}`}
              style={{ background: withAlpha(colors.primary, 0.65) }}
            >
              {cat.coverVideo && cat.cover ? (
                <VideoCoverThumb src={cat.cover} poster={cat.coverPoster} />
              ) : cat.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.cover} alt="" className="h-full w-full object-contain" />
              ) : (
                <div
                  className="h-full w-full"
                  style={{ background: `linear-gradient(135deg, ${colors.accent}55, ${colors.primary})` }}
                />
              )}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 45%, transparent 100%)",
                }}
              />
              <div className="absolute bottom-2 left-2 right-2">
                <div className="text-[14px] font-bold uppercase tracking-[0.04em]">{cat.name}</div>
                <div className="text-[12px]" style={{ color: colors.accent }}>
                  +{cat.count} modelos
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {embed && (
        <div className="px-4 pt-6">
          <div
            className="mb-2 text-[12px] uppercase tracking-[0.08em]"
            style={{ color: withAlpha(colors.text, 0.55) }}
          >
            Padrão de qualidade
          </div>
          <div className="relative overflow-hidden rounded-[14px] bg-black" style={{ height: 180 }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: colors.accent }}>
                <div
                  className="ml-1 h-0 w-0 border-y-[8px] border-l-[14px] border-y-transparent"
                  style={{ borderLeftColor: colors.primary }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 pt-5">
        <button
          type="button"
          onClick={onOpenCart}
          className="flex h-14 w-full items-center justify-center rounded-[12px] text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
          style={{ background: brand.checkoutButtonColor ?? "#25D366" }}
        >
          {brand.checkoutButtonText?.trim() || "Finalizar pedido"}
        </button>
      </div>

      <footer className="mt-6 space-y-2 px-4">
        {brand.instagram && (
          <a
            href={instagramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-[10px] text-[13px] transition hover:brightness-110 active:scale-[0.99]"
            style={{ color: withAlpha(colors.text, 0.8) }}
          >
            <InstagramIcon size={24} />
            <span>
              Instagram <span style={{ color: colors.accent }}>@{ig}</span>
            </span>
          </a>
        )}
        {brand.cnpj && (
          <div className="px-0.5 text-[12px]" style={{ color: withAlpha(colors.text, 0.55) }}>
            CNPJ {brand.cnpj}
          </div>
        )}
        {whatsappDigits && (
          <a
            href={`https://wa.me/${whatsappDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-[10px] text-[13px] transition hover:brightness-110 active:scale-[0.99]"
            style={{ color: withAlpha(colors.text, 0.8) }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "#1a3322" }}
            >
              <WhatsAppIcon size={14} color="#25D366" />
            </span>
            WhatsApp
          </a>
        )}
      </footer>
    </div>
  );
}

function ProductSheet({
  product,
  colors,
  cart,
  colorLabel,
  onClose,
  onAdd,
  onOpenCart,
  onGoHome,
}: {
  product: Product;
  colors: BrandColors;
  cart: CartItem[];
  colorLabel: (hex: string) => string;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, "key">, options?: { silent?: boolean }) => void;
  onOpenCart: () => void;
  onGoHome: () => void;
}) {
  const initialColor = product.colors[0] ?? "";
  const [index, setIndex] = useState(() =>
    galleryIndexForColor(product, buildGallery(product), initialColor),
  );
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [pickQty, setPickQty] = useState(1);
  const [pending, setPending] = useState<
    { id: string; color: string; colorName: string; size: string; qty: number }[]
  >([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [addedPieces, setAddedPieces] = useState(0);

  const gallery = useMemo(() => buildGallery(product), [product]);

  const current = gallery[index] ?? gallery[0];
  const cartPieces = cartTotalPieces(cart);
  const pendingPieces = pending.reduce((sum, item) => sum + item.qty, 0);
  const tierQty = cartPieces + pendingPieces + pickQty;
  const pricingQty = cartPieces + pendingPieces;
  const displayUnitPrice = unitPriceForQty(product, tierQty);
  const pendingUnitPrice = unitPriceForQty(product, pricingQty);
  const pendingTotal = pendingUnitPrice * pendingPieces;
  const volumeTiers = normalizeVolumeDiscounts(product.volumeDiscounts, product.price);
  const baseUnitPrice = parsePrice(product.price);
  const hasTierPrice = displayUnitPrice < baseUnitPrice;

  function selectColor(next: string) {
    setColor(next);
    setIndex(galleryIndexForColor(product, gallery, next));
  }

  function pendingKey(colorValue: string, sizeValue: string) {
    return `${colorValue}__${sizeValue}`;
  }

  function addToPendingList() {
    const colorValue = color || "";
    const sizeValue = size || "—";
    const colorName = colorValue ? colorLabel(colorValue) : "—";
    const key = pendingKey(colorValue, sizeValue);

    setPending((prev) => {
      const existing = prev.find((item) => pendingKey(item.color, item.size) === key);
      if (existing) {
        return prev.map((item) =>
          pendingKey(item.color, item.size) === key
            ? { ...item, qty: item.qty + pickQty }
            : item,
        );
      }
      return [
        ...prev,
        {
          id: `${key}_${Date.now()}`,
          color: colorValue,
          colorName,
          size: sizeValue,
          qty: pickQty,
        },
      ];
    });
    setPickQty(1);
  }

  function updatePendingQty(id: string, delta: number) {
    setPending((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item,
        )
        .filter((item) => item.qty > 0),
    );
  }

  function removePending(id: string) {
    setPending((prev) => prev.filter((item) => item.id !== id));
  }

  function confirmAddToCart() {
    const pieces = pending.reduce((sum, item) => sum + item.qty, 0);
    pending.forEach((item) => {
      onAdd(
        {
          productId: product.id,
          name: product.name,
          color: item.color,
          colorName: item.colorName,
          size: item.size,
          qty: item.qty,
          price: product.price,
          image: colorImageForCart(product, item.color),
        },
        { silent: true },
      );
    });
    setConfirmOpen(false);
    setPending([]);
    setAddedPieces(pieces);
    setSuccessOpen(true);
  }

  function finishAndOpenCart() {
    setSuccessOpen(false);
    onOpenCart();
  }

  function continueShopping() {
    setSuccessOpen(false);
    onGoHome();
  }

  const yt = current?.kind === "video" ? getYoutubeEmbedUrl(current.src) : null;
  const isFileVideo =
    current?.kind === "video" &&
    (current.videoType === "file" || current.src.startsWith("data:") || current.src.startsWith("blob:"));

  const canInclude =
    (product.colors.length === 0 || color) && (product.sizes.length === 0 || size);

  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
        aria-label="Fechar"
      />
      <div
        className="sheet-up absolute bottom-0 left-0 right-0 overflow-y-auto"
        style={{
          background: "#111113",
          borderRadius: "20px 20px 0 0",
          maxHeight: "92vh",
          color: colors.text,
        }}
      >
        <div className="mx-auto mt-[10px] h-1 w-9 rounded-[2px] bg-[#333]" />
        <div className="relative mt-3 h-[320px] bg-black">
          {current?.kind === "video" && isFileVideo ? (
            <video
              key={current.src}
              src={current.src}
              className="h-full w-full object-contain"
              controls
              autoPlay
              playsInline
            />
          ) : current?.kind === "video" && yt ? (
            <iframe
              src={`${yt}?autoplay=1`}
              title={current.name ?? "Vídeo"}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : current?.kind === "video" ? (
            <video
              key={current.src}
              src={current.src}
              className="h-full w-full object-contain"
              controls
              autoPlay
              playsInline
            />
          ) : current?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.src}
              alt=""
              className="h-full w-full cursor-pointer object-contain"
              onClick={() => gallery.length > 0 && setIndex((index + 1) % gallery.length)}
            />
          ) : (
            <div className="h-full w-full" style={{ background: colors.card }} />
          )}
          {gallery.length > 0 && (
            <div
              className="absolute left-3 top-3 rounded-[8px] px-2 py-1 text-[12px]"
              style={{ background: "rgba(0,0,0,0.5)" }}
            >
              {Math.min(index + 1, gallery.length)}/{gallery.length}
              {current?.kind === "video" ? " · VIDEO" : ""}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-[10px] text-white transition hover:bg-white/20"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          >
            ✕
          </button>
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={() => setIndex((index - 1 + gallery.length) % gallery.length)}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[22px] text-white transition hover:scale-105"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Próximo"
                onClick={() => setIndex((index + 1) % gallery.length)}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[22px] text-white transition hover:scale-105"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
              >
                ›
              </button>
            </>
          )}
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {gallery.map((item, i) => (
              <button
                type="button"
                key={`${item.kind}-${item.src}-${i}`}
                onClick={() => setIndex(i)}
                className="h-3 rounded-full transition hover:scale-125"
                style={{
                  width: i === index ? 20 : 10,
                  minWidth: i === index ? 20 : 10,
                  background: i === index ? colors.accent : withAlpha(colors.text, 0.35),
                  outline: i === index ? `2px solid ${colors.accent}` : "none",
                  outlineOffset: 2,
                  cursor: "pointer",
                }}
                aria-label={item.kind === "video" ? "Vídeo" : "Foto"}
              />
            ))}
          </div>
        </div>

        <div className="px-4 pb-8 pt-4">
          <div className="text-[11px] uppercase tracking-[0.06em] text-[#555]">{product.category}</div>
          <h2 className="mt-1 text-[20px] font-bold leading-[1.2]">{product.name}</h2>
          <div className="mt-2 text-[24px] font-bold" style={{ color: colors.accent }}>
            {hasTierPrice ? (
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="text-[16px] font-medium text-[#6B7A72] line-through">
                  R$ {formatMoney(product.price)}
                </span>
                <span>R$ {formatMoney(displayUnitPrice)}</span>
              </span>
            ) : (
              <>R$ {formatMoney(product.price)}</>
            )}
          </div>
          {volumeTiers.length > 0 && (
            <div className="mt-2 rounded-[10px] border border-[#1E3A2E] bg-[#0A1F18] px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-[#A8B5AE]">Desconto por quantidade</div>
                {cartPieces > 0 && (
                  <span className="text-[10px] text-[#6B7A72]">
                    {cartPieces} no carrinho · total {tierQty} peça(s)
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {volumeTiers.map((tier) => (
                  <span
                    key={`${tier.minQty}-${tier.unitPrice}`}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background:
                        tierQty >= tier.minQty
                          ? withAlpha(colors.accent, 0.2)
                          : withAlpha(colors.text, 0.06),
                      color: tierQty >= tier.minQty ? colors.accent : "#6B7A72",
                      border: `1px solid ${
                        tierQty >= tier.minQty ? withAlpha(colors.accent, 0.4) : "#1E3A2E"
                      }`,
                    }}
                  >
                    {tier.minQty}+ peças → R$ {formatMoney(tier.unitPrice)}/un.
                  </span>
                ))}
              </div>
              {hasTierPrice && (
                <div className="mt-1.5 text-[11px] text-[#6B7A72]">
                  De R$ {formatMoney(product.price)} por{" "}
                  <span className="font-semibold" style={{ color: colors.accent }}>
                    R$ {formatMoney(displayUnitPrice)}/un.
                  </span>
                  {cartPieces > 0 && (
                    <span> (inclui peças já no carrinho)</span>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="mt-1 text-[11px] text-[#555]">Disponível: {product.qty} unidades</div>
          {product.description && (
            <p
              className="mt-3 text-[14px] leading-[1.6] text-[#888]"
              style={{ borderLeft: `2px solid ${withAlpha(colors.accent, 0.33)}`, paddingLeft: 12 }}
            >
              {product.description}
            </p>
          )}

          {product.colors.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-[12px]">Cor: {color ? colorLabel(color) : "—"}</div>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((c) => {
                  const selected = color === c;
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => selectColor(c)}
                      className="h-10 w-10 rounded-[12px] transition hover:scale-110 active:scale-95"
                      style={{
                        background: c,
                        outline: selected ? `2px solid ${colors.accent}` : `1px solid ${withAlpha(colors.text, 0.2)}`,
                        outlineOffset: 2,
                        cursor: "pointer",
                        boxShadow: selected ? `0 0 0 4px ${withAlpha(colors.accent, 0.25)}` : "none",
                      }}
                      aria-pressed={selected}
                      title={colorLabel(c)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {product.sizes.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-[12px]">Tamanho</div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => {
                  const selected = size === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSize(s)}
                      className="h-11 min-w-12 rounded-[10px] px-4 text-[15px] font-bold transition hover:scale-[1.03] active:scale-95"
                      style={{
                        border: selected ? `2px solid ${colors.accent}` : `1px solid ${withAlpha(colors.text, 0.2)}`,
                        background: selected ? withAlpha(colors.accent, 0.15) : "transparent",
                        color: colors.text,
                        cursor: "pointer",
                        boxShadow: selected ? `0 0 0 3px ${withAlpha(colors.accent, 0.2)}` : "none",
                      }}
                      aria-pressed={selected}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-[12px] border border-[#1E3A2E] bg-[#0A1F18] p-3">
            <div className="mb-2 text-[12px] font-semibold text-[#A8B5AE]">Quantidade desta seleção</div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPickQty((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#2a2a2e] text-lg"
              >
                −
              </button>
              <span className="min-w-8 text-center text-[16px] font-bold">{pickQty}</span>
              <button
                type="button"
                onClick={() => setPickQty((q) => q + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-[#2a2a2e] text-lg"
              >
                +
              </button>
              <button
                type="button"
                disabled={!canInclude}
                onClick={addToPendingList}
                className="ml-auto h-10 rounded-[10px] border border-[#C9A84C] px-4 text-[13px] font-semibold text-[#C9A84C] disabled:opacity-40"
              >
                + Incluir
              </button>
            </div>
          </div>

          {pending.length > 0 && (
            <div className="mt-4 rounded-[12px] border border-[rgba(201,168,76,0.2)] bg-[#0F281F] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#C9A84C]">Sua seleção</span>
                <span className="text-[11px] text-[#6B7A72]">
                  {pendingPieces} nova(s) · {pricingQty} no total
                </span>
              </div>
              <div className="space-y-2">
                {pending.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-[10px] border border-[#1E3A2E] bg-[#0A1F18] px-2 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">
                        {item.colorName} · Tam {item.size}
                      </div>
                      <div className="text-[12px]" style={{ color: colors.accent }}>
                        R$ {formatMoney(pendingUnitPrice)}/un.
                        {item.qty > 1 && (
                          <span className="text-[#6B7A72]">
                            {" "}
                            · R$ {formatMoney(pendingUnitPrice * item.qty)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updatePendingQty(item.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#2a2a2e]"
                      >
                        −
                      </button>
                      <span className="min-w-5 text-center text-[13px] font-bold">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updatePendingQty(item.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#2a2a2e]"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(item.id)}
                      className="flex h-8 w-8 items-center justify-center text-[#ef4444]"
                      aria-label="Remover item"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-[#1E3A2E] pt-2 text-[13px]">
                <span className="text-[#6B7A72]">
                  Subtotal{hasTierPrice ? ` · R$ ${formatMoney(pendingUnitPrice)}/un.` : ""}
                </span>
                <span className="font-bold" style={{ color: colors.accent }}>
                  R$ {formatMoney(pendingTotal)}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={pending.length === 0}
            onClick={() => setConfirmOpen(true)}
            className="mt-6 flex h-14 w-full items-center justify-center rounded-[14px] text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
            style={{
              background: colors.accent,
              color: colors.primary,
              cursor: pending.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Adicionar ao carrinho{pendingPieces > 0 ? ` (${pendingPieces})` : ""}
          </button>
        </div>
      </div>

      {confirmOpen && (
        <div className="absolute inset-0 z-50 flex items-end justify-center p-4">
          <button
            type="button"
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={() => setConfirmOpen(false)}
            aria-label="Fechar confirmação"
          />
          <div
            className="relative w-full max-w-[360px] rounded-[16px] border border-[rgba(201,168,76,0.2)] bg-[#111113] p-4"
            style={{ color: colors.text }}
          >
            <h3 className="text-[16px] font-bold">Confirmar itens</h3>
            <p className="mt-1 text-[12px] text-[#6B7A72]">
              Revise sua seleção antes de adicionar ao carrinho.
            </p>
            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-[10px] bg-[#0A1F18] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{product.name}</div>
                    <div className="text-[11px] text-[#6B7A72]">
                      {item.colorName} · Tam {item.size} · {item.qty} un.
                    </div>
                  </div>
                  <div className="shrink-0 text-[13px] font-bold" style={{ color: colors.accent }}>
                    R$ {formatMoney(pendingUnitPrice * item.qty)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#1E3A2E] pt-3">
              <span className="text-[13px] text-[#6B7A72]">
                Total ({pendingPieces} novas · {pricingQty} no total
                {hasTierPrice ? ` · R$ ${formatMoney(pendingUnitPrice)}/un.` : ""})
              </span>
              <span className="text-[18px] font-bold" style={{ color: colors.accent }}>
                R$ {formatMoney(pendingTotal)}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="h-11 flex-1 rounded-[10px] border border-[#2a2a2e] text-[13px]"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmAddToCart}
                className="h-11 flex-1 rounded-[10px] text-[13px] font-semibold"
                style={{ background: colors.accent, color: colors.primary }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {successOpen && (
        <div className="absolute inset-0 z-[60] flex items-end justify-center p-4">
          <button
            type="button"
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={continueShopping}
            aria-label="Fechar"
          />
          <div
            className="relative w-full max-w-[360px] rounded-[16px] border border-[rgba(201,168,76,0.2)] bg-[#111113] p-4"
            style={{ color: colors.text }}
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-[18px]"
                style={{ background: withAlpha(colors.accent, 0.15), color: colors.accent }}
              >
                ✓
              </span>
              <div>
                <h3 className="text-[16px] font-bold">Adicionado ao carrinho!</h3>
                <p className="text-[12px] text-[#6B7A72]">
                  {addedPieces} peça{addedPieces === 1 ? "" : "s"} de {product.name}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[13px] text-[#A8B5AE]">O que deseja fazer agora?</p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={finishAndOpenCart}
                className="flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-semibold"
                style={{ background: "#25D366", color: "#fff" }}
              >
                Finalizar compra
              </button>
              <button
                type="button"
                onClick={continueShopping}
                className="flex h-12 w-full items-center justify-center rounded-[12px] border border-[#2a2a2e] text-[14px] font-semibold"
              >
                Selecionar mais produtos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CartSheet({
  brand,
  colors,
  cart,
  products,
  setCart,
  onClose,
}: {
  brand: Brand;
  colors: BrandColors;
  cart: CartItem[];
  products: Product[];
  setCart: (next: CartItem[]) => void;
  onClose: () => void;
}) {
  const [customerPhone, setCustomerPhone] = useState("+55 ");
  const [customerName, setCustomerName] = useState("");
  const [customerCep, setCustomerCep] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const sellers = useMemo(() => normalizeSellers(brand), [brand]);
  const [sellerId, setSellerId] = useState("");

  useEffect(() => {
    if (sellers.length === 0) {
      setSellerId("");
      return;
    }
    setSellerId((current) =>
      sellers.some((seller) => seller.id === current) ? current : sellers[0].id,
    );
  }, [sellers]);

  const pieces = cart.reduce((s, i) => s + i.qty, 0);
  const total = cartGrandTotal(cart, products);
  const registeredTotal = cartRegisteredGrandTotal(cart);
  const totalSavings = cartTotalSavings(cart, products);

  const groupedBySize = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const item of cart) {
      const size = item.size || "—";
      const list = map.get(size) ?? [];
      list.push(item);
      map.set(size, list);
    }
    return [...map.entries()];
  }, [cart]);

  const summaryLabel = useMemo(() => {
    const names = [...new Set(cart.map((item) => item.name.toUpperCase()))];
    if (names.length === 0) return "";
    if (names.length === 1) return `${pieces}x ${names[0]}`;
    return `${pieces}x ITENS (${names.length} modelos)`;
  }, [cart, pieces]);

  function formatCep(value: string) {
    const digits = digitsOnly(value).slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  function productStock(productId: number) {
    return products.find((p) => p.id === productId)?.qty ?? 99;
  }

  function updateQty(item: CartItem, delta: number) {
    const max = productStock(item.productId);
    setCart(
      cart
        .map((c) =>
          c.key === item.key ? { ...c, qty: Math.min(max, Math.max(0, c.qty + delta)) } : c,
        )
        .filter((c) => c.qty > 0),
    );
  }

  function sendWhatsApp() {
    setFormError(null);
    const phone = digitsOnly(customerPhone);
    const cep = digitsOnly(customerCep);
    const name = customerName.trim();

    if (phone.length < 10) {
      setFormError("Informe um WhatsApp válido com DDD.");
      return;
    }
    if (!name) {
      setFormError("Informe seu nome completo.");
      return;
    }
    if (cep.length !== 8) {
      setFormError("Informe um CEP válido (8 dígitos).");
      return;
    }

    const seller = sellers.find((item) => item.id === sellerId) ?? sellers[0];
    const storePhone = seller?.phone ?? "";
    if (!storePhone) {
      setFormError("Nenhum vendedor configurado na loja.");
      return;
    }
    if (sellers.length > 1 && !sellerId) {
      setFormError("Selecione um vendedor para enviar o pedido.");
      return;
    }

    const itemLines = cart.map((item, idx) => {
      const product = products.find((p) => p.id === item.productId);
      const registered = cartLineRegisteredTotal(item);
      const discounted = product
        ? cartLineDiscountedTotal(item, cart, product)
        : registered;
      const savings = product ? cartLineSavings(item, cart, product) : 0;
      const unit = product
        ? formatMoney(unitPriceForQty(product, cartTotalPieces(cart)))
        : formatMoney(item.price);
      return (
        `*Item ${idx + 1}*\n` +
        `Produto: ${item.name}\n` +
        `Cor: ${item.colorName}\n` +
        `Tamanho: ${item.size}\n` +
        `Quantidade: ${item.qty}\n` +
        `Valor registrado: R$ ${registered.toFixed(2)}\n` +
        `Com desconto progressivo: R$ ${discounted.toFixed(2)}\n` +
        (savings > 0 ? `Economia: R$ ${savings.toFixed(2)}\n` : "") +
        `Valor unit.: R$ ${unit}\n` +
        `Subtotal: R$ ${discounted.toFixed(2)}`
      );
    });

    const msg =
      `🛒 *NOVO PEDIDO — ${brand.name || "Catálogo"}*\n\n` +
      `*Dados do cliente*\n` +
      `Nome: ${name}\n` +
      `WhatsApp: +${phone}\n` +
      `CEP: ${formatCep(customerCep)}\n` +
      `Vendedor: ${seller.name}\n\n` +
      `*Itens do pedido*\n\n` +
      `${itemLines.join("\n\n")}\n\n` +
      `━━━━━━━━━━━━━━━\n` +
      `Valor registrado: R$ ${registeredTotal.toFixed(2)}\n` +
      (totalSavings > 0 ? `Economia total: R$ ${totalSavings.toFixed(2)}\n` : "") +
      `💰 *Total com desconto: R$ ${total.toFixed(2)}*\n` +
      `📦 *${pieces} peça${pieces === 1 ? "" : "s"}*\n\n` +
      `_Pedido enviado pelo catálogo digital_`;

    window.open(`https://wa.me/${storePhone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const inputClass =
    "h-12 w-full rounded-[10px] border border-[#2a2a2e] bg-[#0A1F18] px-3 text-[14px] outline-none focus:border-[#25D366]";

  return (
    <div className="absolute inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
        aria-label="Fechar"
      />
      <div
        className="sheet-up absolute bottom-0 left-0 right-0 flex max-h-[92vh] flex-col overflow-hidden"
        style={{ background: colors.primary, borderRadius: "20px 20px 0 0", color: colors.text }}
      >
        <div className="mx-auto mt-[10px] h-1 w-9 rounded-[2px] bg-[#333]" />

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <h2 className="pt-2 text-[22px] font-bold" style={{ color: "#25D366" }}>
            Carrinho
          </h2>

          {cart.length === 0 ? (
            <div className="py-10 text-center">
              <div
                className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: colors.card }}
              >
                <span className="text-[18px] opacity-50">○</span>
              </div>
              <div className="text-[14px]">Seu carrinho está vazio</div>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 h-11 rounded-[10px] px-4 text-[13px] font-semibold"
                style={{ background: colors.accent, color: colors.primary }}
              >
                Continuar comprando
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {groupedBySize.map(([size, items]) => (
                <div
                  key={size}
                  className="overflow-hidden rounded-[12px] border border-[#1E3A2E]"
                  style={{ background: colors.card }}
                >
                  <div className="border-b border-[#1E3A2E] px-3 py-2 text-[12px] font-semibold text-[#A8B5AE]">
                    Tamanho {size}
                  </div>
                  <div className="divide-y divide-[#1E3A2E]">
                    {items.map((item) => {
                      const product = products.find((p) => p.id === item.productId);
                      const registeredTotal = cartLineRegisteredTotal(item);
                      const discountedTotal = product
                        ? cartLineDiscountedTotal(item, cart, product)
                        : registeredTotal;
                      const savings = product ? cartLineSavings(item, cart, product) : 0;
                      const registeredUnit = parsePrice(item.price);
                      const discountedUnit = product
                        ? unitPriceForQty(product, cartTotalPieces(cart))
                        : registeredUnit;
                      const max = productStock(item.productId);
                      return (
                        <div key={item.key} className="flex gap-3 p-3">
                          <div
                            className="h-14 w-14 shrink-0 overflow-hidden rounded-[8px]"
                            style={{ background: withAlpha(colors.primary, 0.6) }}
                          >
                            {item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.image} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-bold">
                              •{item.name.toUpperCase()} — {item.colorName.toUpperCase()}
                            </div>
                            <div className="mt-1 text-[12px]">
                              {savings > 0 ? (
                                <span className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[#6B7A72] line-through">
                                    R$ {formatMoney(registeredUnit)}/un.
                                  </span>
                                  <span className="font-bold" style={{ color: colors.accent }}>
                                    R$ {formatMoney(discountedUnit)}/un.
                                  </span>
                                </span>
                              ) : (
                                <span className="font-bold" style={{ color: colors.accent }}>
                                  R$ {formatMoney(registeredUnit)}/un.
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-[11px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[#6B7A72]">Valor registrado (total)</span>
                                <span className="font-medium text-[#A8B5AE] line-through">
                                  R$ {formatMoney(registeredTotal)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[#6B7A72]">Com desconto progressivo</span>
                                <span className="font-bold" style={{ color: colors.accent }}>
                                  R$ {formatMoney(discountedTotal)}
                                </span>
                              </div>
                              {savings > 0 && (
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[#6B7A72]">Você economiza</span>
                                  <span className="font-semibold text-[#25D366]">
                                    R$ {formatMoney(savings)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#2a2a2e] text-[16px]"
                                onClick={() => updateQty(item, -1)}
                              >
                                −
                              </button>
                              <span className="min-w-4 text-center text-[14px] font-bold">{item.qty}</span>
                              <button
                                type="button"
                                disabled={item.qty >= max}
                                className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#2a2a2e] text-[16px] disabled:opacity-40"
                                onClick={() => updateQty(item, 1)}
                              >
                                +
                              </button>
                              <span className="text-[11px] text-[#6B7A72]">máx. {max}</span>
                              <button
                                type="button"
                                className="ml-auto flex h-8 w-8 items-center justify-center text-[#ef4444]"
                                onClick={() => setCart(cart.filter((c) => c.key !== item.key))}
                                aria-label="Remover item"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div
                className="rounded-[12px] border px-3 py-3"
                style={{ borderColor: "#25D366", background: withAlpha("#25D366", 0.08) }}
              >
                <div className="text-[11px] font-bold tracking-[0.08em]" style={{ color: "#25D366" }}>
                  RESUMO DO PEDIDO
                </div>
                <div className="mt-2 text-[14px] font-bold">{summaryLabel}</div>
                <div className="text-[12px] text-[#A8B5AE]">{pieces} peças no total</div>
                <div className="mt-3 space-y-1.5 border-t border-[#1E3A2E] pt-2 text-[12px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#6B7A72]">Valor registrado (total)</span>
                    <span className="font-medium text-[#A8B5AE] line-through">
                      R$ {registeredTotal.toFixed(2)}
                    </span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#6B7A72]">Economia total</span>
                      <span className="font-semibold text-[#25D366]">
                        R$ {totalSavings.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-end justify-between border-t border-[#1E3A2E] pt-2">
                  <span className="text-[12px] text-[#A8B5AE]">Valor com desconto progressivo</span>
                  <span className="text-[22px] font-bold" style={{ color: colors.accent }}>
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              {sellers.length > 1 && (
                <div className="space-y-2">
                  <span className="block text-[12px] text-[#A8B5AE]">
                    Enviar para <span className="text-[#ef4444]">*</span>
                  </span>
                  <div className="space-y-2">
                    {sellers.map((seller) => {
                      const selected = sellerId === seller.id;
                      return (
                        <button
                          key={seller.id}
                          type="button"
                          onClick={() => setSellerId(seller.id)}
                          className="flex w-full items-center gap-3 rounded-[10px] border px-3 py-3 text-left transition"
                          style={{
                            borderColor: selected ? colors.accent : "#2a2a2e",
                            background: selected ? withAlpha(colors.accent, 0.12) : colors.card,
                            boxShadow: selected ? `0 0 0 1px ${withAlpha(colors.accent, 0.35)}` : "none",
                          }}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                            style={{
                              borderColor: selected ? colors.accent : "#555",
                              background: selected ? colors.accent : "transparent",
                            }}
                          >
                            {selected && (
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: colors.primary }}
                              />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-semibold">{seller.name}</span>
                            <span className="block text-[12px] text-[#6B7A72]">WhatsApp</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[12px] text-[#A8B5AE]">
                    WhatsApp <span className="text-[#ef4444]">*</span>
                  </span>
                  <input
                    type="tel"
                    className={inputClass}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+55 00 00000-0000"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] text-[#A8B5AE]">
                    Seu nome <span className="text-[#ef4444]">*</span>
                  </span>
                  <input
                    type="text"
                    className={inputClass}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nome completo"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px] text-[#A8B5AE]">
                    CEP para frete <span className="text-[#ef4444]">*</span>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={inputClass}
                    value={customerCep}
                    onChange={(e) => setCustomerCep(formatCep(e.target.value))}
                    placeholder="00000-000"
                  />
                  <p className="mt-1 text-[11px] text-[#6B7A72]">
                    Informe o CEP para ver preço e prazo — PAC e SEDEX
                  </p>
                </label>
              </div>

              {formError && (
                <p className="rounded-[8px] border border-[#ef444433] bg-[#ef444418] px-3 py-2 text-[12px] text-[#ef4444]">
                  {formError}
                </p>
              )}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-white/5 px-4 py-4">
            <button
              type="button"
              onClick={sendWhatsApp}
              className="flex h-14 w-full items-center justify-center rounded-[12px] text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
              style={{ background: "#25D366", boxShadow: "0 8px 24px rgba(37,211,102,0.28)" }}
            >
              Enviar pedido no WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
