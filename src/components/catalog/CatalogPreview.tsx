"use client";

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
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
import { ProductThumbMedia } from "@/components/ProductThumbMedia";
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
import { buildPresentationEmbed, buildYoutubePlayerSrc, getYoutubeEmbedUrl, getYoutubeId, getYoutubePosterUrl, getYoutubeThumbnailUrl, isYoutubeShort, normalizeVideoPosition, presentationVideoTitle } from "@/lib/youtube";
import { normalizeSellers, primaryWhatsAppDigits } from "@/lib/sellers";
import { readStoredCart, writeStoredCart } from "@/lib/cartStorage";
import { availableColors, availableSizes, isListedInCatalog, lineQty, usesStockMatrix } from "@/lib/stock";
import { buildWhatsAppOrderMessage, whatsAppOrderFits, whatsAppOrderUrl } from "@/lib/whatsappOrder";

/** Cores derivadas da paleta da marca (home, produto e carrinho). */
function catalogTheme(colors: BrandColors) {
  return {
    muted: withAlpha(colors.text, 0.55),
    soft: withAlpha(colors.text, 0.72),
    faint: withAlpha(colors.text, 0.4),
    border: withAlpha(colors.text, 0.14),
    borderAccent: withAlpha(colors.accent, 0.28),
    handle: withAlpha(colors.text, 0.28),
    controlBorder: withAlpha(colors.text, 0.22),
  } as const;
}

export function CatalogPreview({
  brand,
  colors: colorsProp,
  setColors,
  products,
  publicMode = false,
  catalogSlug,
  customProductColors,
}: {
  brand: Brand;
  colors: BrandColors;
  setColors?: Dispatch<SetStateAction<BrandColors>>;
  products: Product[];
  publicMode?: boolean;
  catalogSlug?: string;
  customProductColors?: ProductColorEntry[];
}) {
  const [liveProducts, setLiveProducts] = useState(products);
  useEffect(() => {
    setLiveProducts(products);
  }, [products]);
  const shelfProducts =
    publicMode && brand.stockControl === true
      ? liveProducts.filter(isListedInCatalog)
      : liveProducts;
  const palette = customProductColors ?? brand.customProductColors ?? [];
  const colorLabel = (hex: string) => colorNameFromHex(hex, palette);
  const [localColors, setLocalColors] = useState(colorsProp);
  const colors = publicMode ? localColors : colorsProp;
  const updateColors = publicMode ? setLocalColors : setColors!;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const persistCart = publicMode && Boolean(catalogSlug);
  const [cartReady, setCartReady] = useState(!persistCart);
  const [cartBump, setCartBump] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pressedId, setPressedId] = useState<number | null>(null);
  const [openCartAfterProductClose, setOpenCartAfterProductClose] = useState(false);

  useEffect(() => {
    if (!persistCart || !catalogSlug) return;
    setCart(readStoredCart(catalogSlug));
    setCartReady(true);
  }, [persistCart, catalogSlug]);

  useEffect(() => {
    if (!cartReady || !persistCart || !catalogSlug) return;
    writeStoredCart(catalogSlug, cart);
  }, [cart, cartReady, persistCart, catalogSlug]);

  useEffect(() => {
    if (!publicMode) return;
    if (!cartOpen && !activeProduct) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [activeProduct, cartOpen, publicMode]);

  useEffect(() => {
    if (!openCartAfterProductClose || activeProduct) return;
    setCartOpen(true);
    setOpenCartAfterProductClose(false);
  }, [activeProduct, openCartAfterProductClose]);

  useEffect(() => {
    if (!publicMode) return;

    const state = window.history.state ?? {};
    if (cartOpen) {
      if (state.vestoView !== "cart") window.history.pushState({ vestoView: "cart" }, "");
      return;
    }
    if (activeProduct) {
      if (state.vestoView !== "product" || state.productId !== activeProduct.id) {
        window.history.pushState(
          { vestoView: "product", category: activeCategory, productId: activeProduct.id },
          "",
        );
      }
      return;
    }
    if (activeCategory && (state.vestoView !== "category" || state.category !== activeCategory)) {
      window.history.pushState({ vestoView: "category", category: activeCategory }, "");
    }
  }, [publicMode, cartOpen, activeProduct, activeCategory]);

  useEffect(() => {
    if (!publicMode) return;

    function onPopState() {
      const state = window.history.state ?? {};
      if (state.vestoView === "cart") {
        setCartOpen(true);
        return;
      }
      setCartOpen(false);
      if (state.vestoView === "product") {
        const product = liveProducts.find((item) => item.id === state.productId) ?? null;
        setActiveCategory(state.category ?? product?.category ?? null);
        setActiveProduct(product);
        return;
      }
      setActiveProduct(null);
      setActiveCategory(state.vestoView === "category" ? (state.category ?? null) : null);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [publicMode, liveProducts]);

  function closeCart() {
    if (publicMode && window.history.state?.vestoView === "cart") {
      window.history.back();
      return;
    }
    setCartOpen(false);
  }

  function closeCategory() {
    if (publicMode && window.history.state?.vestoView === "category") {
      window.history.back();
      return;
    }
    setActiveCategory(null);
  }

  function closeProduct() {
    if (publicMode && window.history.state?.vestoView === "product") {
      window.history.back();
      return;
    }
    setActiveProduct(null);
  }

  function goHome() {
    if (!publicMode) {
      setActiveProduct(null);
      setActiveCategory(null);
      return;
    }
    const state = window.history.state ?? {};
    if (state.vestoView === "product") {
      window.history.go(state.category ? -2 : -1);
      return;
    }
    if (state.vestoView === "category") {
      window.history.back();
      return;
    }
    setActiveProduct(null);
    setActiveCategory(null);
  }

  const storeName = brand.name.trim() || "Sua loja";
  const categories = useMemo(() => {
    const names = [...new Set(shelfProducts.map((p) => p.category).filter(Boolean))];
    return names
      .map((name) => {
      const items = shelfProducts.filter((p) => p.category === name);
      const withThumb = items.find((p) => productThumbSrc(p)) ?? items.find((p) => p.videos.length > 0);
      return {
        name,
        count: items.length,
        cover: withThumb ? productThumbSrc(withThumb) : "",
        coverVideo: withThumb ? productThumbIsVideo(withThumb) : false,
        coverPoster: withThumb ? productThumbPoster(withThumb) : "",
      };
    })
      .filter((category) => category.count > 0);
  }, [shelfProducts]);

  const categoryProducts = activeCategory
    ? shelfProducts.filter((p) => p.category === activeCategory)
    : [];

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(item: Omit<CartItem, "key">, options?: { silent?: boolean }) {
    const key = `${item.productId}-${item.color}-${item.size}`;
    const product = liveProducts.find((entry) => entry.id === item.productId);
    const max =
      brand.stockControl === true && product && usesStockMatrix(product)
        ? lineQty(product, item.color, item.size)
        : 9999;
    setCart((prev) => {
      const found = prev.find((c) => c.key === key);
      const nextQty = Math.min(max, (found?.qty ?? 0) + item.qty);
      if (nextQty <= 0) return prev;
      if (found) {
        return prev.map((c) => (c.key === key ? { ...c, qty: nextQty } : c));
      }
      return [...prev, { ...item, key, qty: nextQty }];
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
                onClick={closeCategory}
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
            stockControl={brand.stockControl === true}
            colors={colors}
            cart={cart}
            publicMode={publicMode}
            colorLabel={colorLabel}
            onClose={closeProduct}
            onAdd={(item, options) => addToCart(item, options)}
            onOpenCart={() => {
              setActiveProduct(null);
              setActiveCategory(null);
              setOpenCartAfterProductClose(true);
            }}
            onGoHome={goHome}
          />
        )}

        {cartOpen && (
          <CartSheet
            brand={brand}
            colors={colors}
            cart={cart}
            products={liveProducts}
            publicMode={publicMode}
            catalogSlug={catalogSlug}
            setCart={setCart}
            onStockApplied={(updates) => {
              setLiveProducts((prev) =>
                prev.map((product) => {
                  const next = updates.find((item) => item.id === product.id);
                  return next ? { ...product, stock: next.stock, qty: next.qty } : product;
                }),
              );
            }}
            onClose={closeCart}
          />
        )}
      </div>
    </div>
  );
}

function HomePresentationVideo({ brand, colors }: { brand: Brand; colors: BrandColors }) {
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const poster = getYoutubePosterUrl(brand.videoUrl);
  const player = buildPresentationEmbed(brand.videoUrl);
  const vertical = isYoutubeShort(brand.videoUrl);
  const title = presentationVideoTitle(brand.videoTitle);

  useEffect(() => {
    if (!player || ready || attempt >= 2) return;
    const timer = window.setTimeout(() => setAttempt((current) => current + 1), 8000);
    return () => window.clearTimeout(timer);
  }, [player, ready, attempt]);

  if (!player) return null;

  return (
    <div className="px-4 pb-5 pt-5">
      {title ? (
        <h2
          className="mb-3 text-center text-[15px] font-semibold leading-snug"
          style={{ color: colors.accent }}
        >
          {title}
        </h2>
      ) : null}
      <div className={`mx-auto ${vertical ? "w-[min(86vw,340px)]" : "w-full"}`}>
        <div
          className="rounded-[28px] p-[3px] shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          style={{
            background: `linear-gradient(180deg, ${colors.accent}, ${withAlpha(colors.accent, 0.25)})`,
          }}
        >
          <div
            className="relative overflow-hidden rounded-[25px]"
            style={{
              aspectRatio: vertical ? "9 / 16" : "16 / 9",
              background: colors.card,
            }}
          >
            {poster && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={poster}
                alt=""
                fetchPriority="high"
                decoding="sync"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                style={{ opacity: ready ? 0 : 1 }}
              />
            )}
            <iframe
              key={`${player}-${attempt}`}
              src={player}
              title={title || "Vídeo de apresentação"}
              className="absolute inset-0 h-full w-full border-0"
              style={{ opacity: ready ? 1 : 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              onLoad={() => setReady(true)}
            />
          </div>
        </div>
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
  const embed = getYoutubeId(brand.videoUrl);
  const videoPosition = normalizeVideoPosition(brand.videoPosition);
  const video = embed ? <HomePresentationVideo brand={brand} colors={colors} /> : null;
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

      {videoPosition === "top" && video}

      <HighlightStrip
        items={brand.highlights ?? defaultHighlights()}
        style={brand.highlightStyle ?? "pill"}
        colors={colors}
      />

      {videoPosition === "after-highlights" && video}

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
              {cat.cover || cat.coverPoster ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.coverPoster || cat.cover}
                    alt=""
                    className="h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  {cat.coverVideo && (
                    <span
                      className="pointer-events-none absolute bottom-3 right-3 z-[1] flex h-8 w-8 items-center justify-center rounded-full"
                      style={{ background: "rgba(0,0,0,0.55)" }}
                      aria-hidden
                    >
                      <span className="ml-0.5 h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-white" />
                    </span>
                  )}
                </>
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

      {videoPosition === "after-categories" && video}

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

      {videoPosition === "before-footer" && video}

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
  publicMode,
  stockControl = false,
  colorLabel,
  onClose,
  onAdd,
  onOpenCart,
  onGoHome,
}: {
  product: Product;
  colors: BrandColors;
  cart: CartItem[];
  publicMode: boolean;
  stockControl?: boolean;
  colorLabel: (hex: string) => string;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, "key">, options?: { silent?: boolean }) => void;
  onOpenCart: () => void;
  onGoHome: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [color, setColor] = useState("");
  const [size, setSize] = useState(() =>
    (stockControl ? availableSizes(product)[0] : product.sizes[0]) ?? "",
  );
  const [pickQty, setPickQty] = useState(1);
  const [pending, setPending] = useState<
    { id: string; color: string; colorName: string; size: string; qty: number }[]
  >([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [addedPieces, setAddedPieces] = useState(0);

  const gallery = useMemo(() => buildGallery(product), [product]);
  const listedColors = stockControl ? availableColors(product) : product.colors;
  const listedSizes = stockControl ? availableSizes(product, color || undefined) : product.sizes;
  const matrix = stockControl && usesStockMatrix(product);

  useEffect(() => {
    if (size && listedSizes.includes(size)) return;
    setSize(listedSizes[0] ?? "");
  }, [listedSizes, size]);

  const current = gallery[index] ?? gallery[0];

  // Prefetch neighbors so arrow navigation feels instant.
  useEffect(() => {
    if (gallery.length < 2) return;
    const neighbors = [
      gallery[(index + 1) % gallery.length],
      gallery[(index - 1 + gallery.length) % gallery.length],
    ];
    for (const item of neighbors) {
      if (item?.kind !== "image" || !item.src) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = item.src;
    }
  }, [gallery, index]);
  const cartPieces = cartTotalPieces(cart);
  const pendingPieces = pending.reduce((sum, item) => sum + item.qty, 0);

  function reservedQty(colorValue: string, sizeValue: string) {
    const inPending = pending
      .filter((item) => item.color === colorValue && item.size === sizeValue)
      .reduce((sum, item) => sum + item.qty, 0);
    const inCart = cart
      .filter((item) => item.productId === product.id && item.color === colorValue && item.size === sizeValue)
      .reduce((sum, item) => sum + item.qty, 0);
    return inPending + inCart;
  }

  function remainingQty(colorValue: string, sizeValue: string) {
    if (!matrix) return 9999;
    return Math.max(0, lineQty(product, colorValue, sizeValue) - reservedQty(colorValue, sizeValue));
  }

  const selectionLeft = remainingQty(color, size);
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
    const sizeValue = size || "";
    const room = remainingQty(colorValue, sizeValue);
    if (matrix && room <= 0) return;
    const adding = matrix ? Math.min(pickQty, room) : pickQty;
    const colorName = colorValue ? colorLabel(colorValue) : "—";
    const key = pendingKey(colorValue, sizeValue);

    setPending((prev) => {
      const existing = prev.find((item) => pendingKey(item.color, item.size) === key);
      if (existing) {
        return prev.map((item) =>
          pendingKey(item.color, item.size) === key
            ? { ...item, qty: item.qty + adding }
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
          qty: adding,
        },
      ];
    });
    setPickQty(1);
  }

  function updatePendingQty(id: string, delta: number) {
    setPending((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const others = prev
            .filter((entry) => entry.id !== id && entry.color === item.color && entry.size === item.size)
            .reduce((sum, entry) => sum + entry.qty, 0);
          const inCart = cart
            .filter(
              (entry) =>
                entry.productId === product.id && entry.color === item.color && entry.size === item.size,
            )
            .reduce((sum, entry) => sum + entry.qty, 0);
          const cap = matrix ? Math.max(1, lineQty(product, item.color, item.size) - others - inCart) : 9999;
          return { ...item, qty: Math.max(1, Math.min(cap, item.qty + delta)) };
        })
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
  const ytThumb = current?.kind === "video" ? getYoutubeThumbnailUrl(current.src) : null;
  const ytPlayerSrc =
    current?.kind === "video" ? buildYoutubePlayerSrc(current.src, { autoplay: true, muted: true }) : null;
  const isFileVideo =
    current?.kind === "video" &&
    (current.videoType === "file" || current.src.startsWith("data:") || current.src.startsWith("blob:"));

  const canInclude =
    (product.colors.length === 0 || color) && (product.sizes.length === 0 || size);
  const theme = catalogTheme(colors);
  const overlayClass = publicMode ? "fixed inset-0 z-40" : "absolute inset-0 z-40";
  const sheetClass = publicMode
    ? "sheet-up absolute bottom-0 left-0 right-0 mx-auto w-full max-w-[480px] overflow-y-auto"
    : "sheet-up absolute bottom-0 left-0 right-0 overflow-y-auto";

  return (
    <div className={overlayClass}>
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
        aria-label="Fechar"
      />
      <div
        className={sheetClass}
        style={{
          background: colors.primary,
          borderRadius: "20px 20px 0 0",
          maxHeight: "92vh",
          paddingBottom: "env(safe-area-inset-bottom)",
          color: colors.text,
        }}
      >
        <div className="mx-auto mt-[10px] h-1 w-9 rounded-[2px]" style={{ background: theme.handle }} />
        <div className="relative mt-3 h-[320px] bg-black">
          {current?.kind === "video" && isFileVideo ? (
            <video
              key={current.src}
              src={current.src}
              className="h-full w-full object-contain"
              controls
              autoPlay
              muted
              playsInline
              preload="metadata"
            />
          ) : current?.kind === "video" && ytPlayerSrc ? (
            <YoutubeFastPlayer
              key={current.src}
              src={ytPlayerSrc}
              poster={ytThumb}
              title={current.name ?? "Vídeo"}
            />
          ) : current?.kind === "video" && yt ? (
            <YoutubeFastPlayer
              key={current.src}
              src={`${yt}?autoplay=1&mute=1&playsinline=1&rel=0`}
              poster={ytThumb}
              title={current.name ?? "Vídeo"}
            />
          ) : current?.kind === "video" ? (
            <video
              key={current.src}
              src={current.src}
              className="h-full w-full object-contain"
              controls
              autoPlay
              muted
              playsInline
              preload="metadata"
            />
          ) : current?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.src}
              src={current.src}
              alt=""
              className="h-full w-full cursor-pointer object-contain"
              decoding="async"
              fetchPriority="high"
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

        <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+32px)] pt-4">
          <div className="text-[11px] uppercase tracking-[0.06em]" style={{ color: theme.faint }}>
            {product.category}
          </div>
          <h2 className="mt-1 text-[20px] font-bold leading-[1.2]">{product.name}</h2>
          <div className="mt-2 text-[24px] font-bold" style={{ color: colors.accent }}>
            {hasTierPrice ? (
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="text-[16px] font-medium line-through" style={{ color: theme.muted }}>
                  R$ {formatMoney(product.price)}
                </span>
                <span>R$ {formatMoney(displayUnitPrice)}</span>
              </span>
            ) : (
              <>R$ {formatMoney(product.price)}</>
            )}
          </div>
          {volumeTiers.length > 0 && (
            <div
              className="mt-2 rounded-[10px] px-3 py-2"
              style={{ border: `1px solid ${theme.border}`, background: colors.card }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold" style={{ color: theme.soft }}>
                  Desconto por quantidade
                </div>
                {cartPieces > 0 && (
                  <span className="text-[10px]" style={{ color: theme.muted }}>
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
                      color: tierQty >= tier.minQty ? colors.accent : theme.muted,
                      border: `1px solid ${
                        tierQty >= tier.minQty ? withAlpha(colors.accent, 0.4) : theme.border
                      }`,
                    }}
                  >
                    {tier.minQty}+ peças → R$ {formatMoney(tier.unitPrice)}/un.
                  </span>
                ))}
              </div>
              {hasTierPrice && (
                <div className="mt-1.5 text-[11px]" style={{ color: theme.muted }}>
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
          <div className="mt-1 text-[11px]" style={{ color: theme.faint }}>
            {matrix
              ? selectionLeft > 0
                ? `Disponível nesta seleção: ${selectionLeft}`
                : "Sem estoque nesta seleção"
              : product.qty > 0
                ? `Estoque informado: ${product.qty} unidades`
                : "Estoque sob consulta"}
          </div>
          {product.description && (
            <p
              className="mt-3 whitespace-pre-line text-[14px] leading-[1.6]"
              style={{
                color: theme.muted,
                borderLeft: `2px solid ${withAlpha(colors.accent, 0.33)}`,
                paddingLeft: 12,
              }}
            >
              {product.description}
            </p>
          )}

          {product.colors.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-[12px]">Cor: {color ? colorLabel(color) : "—"}</div>
              <div className="flex flex-wrap gap-3">
                {listedColors.map((c) => {
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
                {listedSizes.map((s) => {
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

          <div
            className="mt-5 rounded-[12px] p-3"
            style={{ border: `1px solid ${theme.border}`, background: colors.card }}
          >
            <div className="mb-2 text-[12px] font-semibold" style={{ color: theme.soft }}>
              Quantidade desta seleção
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPickQty((q) => Math.max(1, q - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-[8px] text-lg"
                style={{ border: `1px solid ${theme.controlBorder}` }}
              >
                −
              </button>
              <PickQtyInput
                value={pickQty}
                max={matrix ? Math.max(1, selectionLeft) : undefined}
                onChange={setPickQty}
                accent={colors.accent}
              />
              <button
                type="button"
                onClick={() => setPickQty((q) => Math.min(matrix ? Math.max(1, selectionLeft) : 9999, q + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-[8px] text-lg"
                style={{ border: `1px solid ${theme.controlBorder}` }}
              >
                +
              </button>
              <button
                type="button"
                disabled={!canInclude || (matrix && selectionLeft <= 0)}
                onClick={addToPendingList}
                className="ml-auto h-10 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-40"
                style={{ border: `1px solid ${colors.accent}`, color: colors.accent }}
              >
                + Incluir
              </button>
            </div>
          </div>

          {pending.length > 0 && (
            <div
              className="mt-4 rounded-[12px] p-3"
              style={{
                border: `1px solid ${theme.borderAccent}`,
                background: withAlpha(colors.card, 0.92),
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold" style={{ color: colors.accent }}>
                  Sua seleção
                </span>
                <span className="text-[11px]" style={{ color: theme.muted }}>
                  {pendingPieces} nova(s) · {pricingQty} no total
                </span>
              </div>
              <div className="space-y-2">
                {pending.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-[10px] px-2 py-2"
                    style={{ border: `1px solid ${theme.border}`, background: colors.primary }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">
                        {item.colorName} · Tam {item.size}
                      </div>
                      <div className="text-[12px]" style={{ color: colors.accent }}>
                        R$ {formatMoney(pendingUnitPrice)}/un.
                        {item.qty > 1 && (
                          <span style={{ color: theme.muted }}>
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
                        className="flex h-8 w-8 items-center justify-center rounded-[6px]"
                        style={{ border: `1px solid ${theme.controlBorder}` }}
                      >
                        −
                      </button>
                      <span className="min-w-5 text-center text-[13px] font-bold">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => updatePendingQty(item.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-[6px]"
                        style={{ border: `1px solid ${theme.controlBorder}` }}
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
              <div
                className="mt-3 flex items-center justify-between pt-2 text-[13px]"
                style={{ borderTop: `1px solid ${theme.border}` }}
              >
                <span style={{ color: theme.muted }}>
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
            className="relative w-full max-w-[360px] rounded-[16px] p-4"
            style={{
              color: colors.text,
              background: colors.primary,
              border: `1px solid ${theme.borderAccent}`,
            }}
          >
            <h3 className="text-[16px] font-bold">Confirmar itens</h3>
            <p className="mt-1 text-[12px]" style={{ color: theme.muted }}>
              Revise sua seleção antes de adicionar ao carrinho.
            </p>
            <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
              {pending.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-[10px] px-3 py-2"
                  style={{ background: colors.card }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{product.name}</div>
                    <div className="text-[11px]" style={{ color: theme.muted }}>
                      {item.colorName} · Tam {item.size} · {item.qty} un.
                    </div>
                  </div>
                  <div className="shrink-0 text-[13px] font-bold" style={{ color: colors.accent }}>
                    R$ {formatMoney(pendingUnitPrice * item.qty)}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-4 flex items-center justify-between pt-3"
              style={{ borderTop: `1px solid ${theme.border}` }}
            >
              <span className="text-[13px]" style={{ color: theme.muted }}>
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
                className="h-11 flex-1 rounded-[10px] text-[13px]"
                style={{ border: `1px solid ${theme.controlBorder}` }}
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
            className="relative w-full max-w-[360px] rounded-[16px] p-4"
            style={{
              color: colors.text,
              background: colors.primary,
              border: `1px solid ${theme.borderAccent}`,
            }}
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
                <p className="text-[12px]" style={{ color: theme.muted }}>
                  {addedPieces} peça{addedPieces === 1 ? "" : "s"} de {product.name}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[13px]" style={{ color: theme.soft }}>
              O que deseja fazer agora?
            </p>
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
                className="flex h-12 w-full items-center justify-center rounded-[12px] text-[14px] font-semibold"
                style={{ border: `1px solid ${theme.controlBorder}` }}
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
  publicMode,
  catalogSlug,
  setCart,
  onStockApplied,
  onClose,
}: {
  brand: Brand;
  colors: BrandColors;
  cart: CartItem[];
  products: Product[];
  publicMode: boolean;
  catalogSlug?: string;
  setCart: (next: CartItem[]) => void;
  onStockApplied?: (updates: { id: number; stock: Product["stock"]; qty: number }[]) => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [customerPhone, setCustomerPhone] = useState("+55 ");
  const [customerName, setCustomerName] = useState("");
  const [customerCep, setCustomerCep] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    influencerName: string;
    discountPercent: number;
    discount: number;
  } | null>(null);
  const sellers = useMemo(() => normalizeSellers(brand), [brand]);
  const [sellerId, setSellerId] = useState("");

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    node.scrollTop = 0;
    const frame = window.requestAnimationFrame(() => {
      node.scrollTop = 0;
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

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
  const volumeTotal = cartGrandTotal(cart, products);
  const registeredTotal = cartRegisteredGrandTotal(cart);
  const volumeSavings = cartTotalSavings(cart, products);
  const couponDiscount = appliedCoupon?.discount ?? 0;
  const total = Math.max(0, volumeTotal - couponDiscount);
  const totalSavings = volumeSavings + couponDiscount;

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

  function updateQty(item: CartItem, delta: number) {
    const product = products.find((entry) => entry.id === item.productId);
    const max =
      brand.stockControl === true && product && usesStockMatrix(product)
        ? lineQty(product, item.color, item.size)
        : 9999;
    setCart(
      cart
        .map((c) =>
          c.key === item.key
            ? { ...c, qty: Math.min(max, Math.max(0, c.qty + delta)) }
            : c,
        )
        .filter((c) => c.qty > 0),
    );
  }

  async function applyCoupon() {
    if (!publicMode || !catalogSlug) {
      setFormError("Cupom disponível no catálogo publicado.");
      return;
    }
    const code = couponInput.trim();
    if (!code) {
      setFormError("Digite o cupom.");
      return;
    }
    setCouponApplying(true);
    setFormError(null);
    try {
      const response = await fetch("/api/catalog/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: catalogSlug, code, subtotal: volumeTotal }),
      });
      const data = (await response.json()) as {
        error?: string;
        couponCode?: string;
        influencerName?: string;
        discountPercent?: number;
        discount?: number;
      };
      if (!response.ok || !data.couponCode) {
        setAppliedCoupon(null);
        setFormError(data.error || "Cupom inválido.");
        return;
      }
      setAppliedCoupon({
        code: data.couponCode,
        influencerName: data.influencerName ?? "",
        discountPercent: Number(data.discountPercent) || 0,
        discount: Number(data.discount) || 0,
      });
    } catch {
      setFormError("Não foi possível validar o cupom.");
    } finally {
      setCouponApplying(false);
    }
  }

  useEffect(() => {
    if (!appliedCoupon || !publicMode || !catalogSlug) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/catalog/coupon/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: catalogSlug,
            code: appliedCoupon.code,
            subtotal: volumeTotal,
          }),
        });
        const data = (await response.json()) as {
          couponCode?: string;
          influencerName?: string;
          discountPercent?: number;
          discount?: number;
        };
        if (cancelled || !response.ok || !data.couponCode) return;
        setAppliedCoupon({
          code: data.couponCode,
          influencerName: data.influencerName ?? "",
          discountPercent: Number(data.discountPercent) || 0,
          discount: Number(data.discount) || 0,
        });
      } catch {
        // keep previous coupon until next send
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeTotal, appliedCoupon?.code, publicMode, catalogSlug]);

  async function sendWhatsApp() {
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

    const msg = buildWhatsAppOrderMessage({
      brandName: brand.name,
      customerName: name,
      customerPhone: phone,
      cep: formatCep(customerCep),
      sellerName: seller.name,
      pieces,
      registeredTotal: registeredTotal.toFixed(2),
      savings: totalSavings.toFixed(2),
      total: total.toFixed(2),
      cart,
      couponCode: appliedCoupon?.code,
      influencerName: appliedCoupon?.influencerName,
      couponDiscount: couponDiscount > 0 ? couponDiscount.toFixed(2) : undefined,
    });

    const storeDigits = digitsOnly(storePhone);
    setSending(true);
    try {
      if (publicMode && catalogSlug && appliedCoupon) {
        const redeem = await fetch("/api/catalog/coupon/redeem", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: catalogSlug,
            code: appliedCoupon.code,
            customerName: name,
            customerPhone: phone,
            pieces,
            registeredTotal,
            subtotal: volumeTotal,
          }),
        });
        const redeemData = (await redeem.json()) as { error?: string };
        if (!redeem.ok) {
          setFormError(redeemData.error || "Não foi possível registrar o cupom.");
          return;
        }
      }

      const tracked = cart.filter((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return brand.stockControl === true && product && usesStockMatrix(product);
      });
      if (publicMode && catalogSlug && tracked.length > 0) {
        const response = await fetch("/api/catalog/stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: catalogSlug,
            items: tracked.map((item) => ({
              productId: item.productId,
              color: item.color,
              size: item.size,
              qty: item.qty,
            })),
          }),
        });
        const data = (await response.json()) as {
          error?: string;
          products?: { id: number; stock: Product["stock"]; qty: number }[];
        };
        if (!response.ok) {
          setFormError(data.error || "Não foi possível baixar o estoque.");
          return;
        }
        if (data.products?.length) onStockApplied?.(data.products);
      }

      setCart([]);
      setAppliedCoupon(null);
      setCouponInput("");
    } catch {
      setFormError("Não foi possível finalizar o pedido. Tente de novo.");
      return;
    } finally {
      setSending(false);
    }

    if (whatsAppOrderFits(storeDigits, msg)) {
      window.open(whatsAppOrderUrl(storeDigits, msg), "_blank");
      return;
    }

    const short =
      `🛒 *NOVO PEDIDO — ${brand.name || "Catálogo"}*\n` +
      `${name} · ${pieces} peça${pieces === 1 ? "" : "s"} · Total com desconto R$ ${total.toFixed(2)}\n\n` +
      `O pedido completo foi copiado. Segure esta mensagem e toque em Colar.`;
    void navigator.clipboard?.writeText(msg).catch(() => undefined);
    setFormError("Pedido grande: a mensagem completa foi copiada. No WhatsApp, cole no campo de texto.");
    window.open(whatsAppOrderUrl(storeDigits, short), "_blank");
  }

  const theme = catalogTheme(colors);
  const inputStyle = {
    border: `1px solid ${theme.controlBorder}`,
    background: colors.card,
    color: colors.text,
  } as const;
  const overlayClass = publicMode ? "fixed inset-0 z-50" : "absolute inset-0 z-40";
  const sheetClass = publicMode
    ? "sheet-up absolute inset-x-0 bottom-0 mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden sm:h-[92vh] sm:max-h-[92vh] sm:rounded-t-[20px]"
    : "sheet-up absolute bottom-0 left-0 right-0 flex max-h-[92vh] flex-col overflow-hidden";

  return (
    <div className={overlayClass}>
      <button
        type="button"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
        aria-label="Fechar"
      />
      <div
        className={sheetClass}
        style={{
          background: colors.primary,
          paddingBottom: publicMode ? 0 : "env(safe-area-inset-bottom)",
          color: colors.text,
        }}
      >
        <div className="mx-auto mt-[10px] h-1 w-9 rounded-[2px]" style={{ background: theme.handle }} />

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="flex items-center justify-between gap-3 pt-2">
            <h2 className="text-[22px] font-bold" style={{ color: colors.accent }}>
              Carrinho
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 items-center gap-1 rounded-[10px] px-3 text-[14px] font-semibold"
              style={{ background: colors.card, color: colors.text }}
            >
              ‹ Voltar
            </button>
          </div>

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
                  className="overflow-hidden rounded-[12px]"
                  style={{ background: colors.card, border: `1px solid ${theme.border}` }}
                >
                  <div
                    className="px-3 py-2 text-[12px] font-semibold"
                    style={{ borderBottom: `1px solid ${theme.border}`, color: theme.soft }}
                  >
                    Tamanho {size}
                  </div>
                  <div style={{ borderColor: theme.border }}>
                    {items.map((item, itemIndex) => {
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
                      return (
                        <div
                          key={item.key}
                          className="flex gap-3 p-3"
                          style={
                            itemIndex > 0 ? { borderTop: `1px solid ${theme.border}` } : undefined
                          }
                        >
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
                                  <span className="line-through" style={{ color: theme.muted }}>
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
                                <span style={{ color: theme.muted }}>Valor registrado (total)</span>
                                <span className="font-medium line-through" style={{ color: theme.soft }}>
                                  R$ {formatMoney(registeredTotal)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span style={{ color: theme.muted }}>Com desconto progressivo</span>
                                <span className="font-bold" style={{ color: colors.accent }}>
                                  R$ {formatMoney(discountedTotal)}
                                </span>
                              </div>
                              {savings > 0 && (
                                <div className="flex items-center justify-between gap-2">
                                  <span style={{ color: theme.muted }}>Você economiza</span>
                                  <span className="font-semibold text-[#25D366]">
                                    R$ {formatMoney(savings)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[16px]"
                                style={{ border: `1px solid ${theme.controlBorder}` }}
                                onClick={() => updateQty(item, -1)}
                              >
                                −
                              </button>
                              <span className="min-w-4 text-center text-[14px] font-bold">{item.qty}</span>
                              <button
                                type="button"
                                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[16px]"
                                style={{ border: `1px solid ${theme.controlBorder}` }}
                                onClick={() => updateQty(item, 1)}
                              >
                                +
                              </button>
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
                style={{ borderColor: colors.accent, background: withAlpha(colors.accent, 0.08) }}
              >
                <div className="text-[11px] font-bold tracking-[0.08em]" style={{ color: colors.accent }}>
                  RESUMO DO PEDIDO
                </div>
                <div className="mt-2 text-[14px] font-bold">{summaryLabel}</div>
                <div className="text-[12px]" style={{ color: theme.soft }}>
                  {pieces} peças no total
                </div>
                <div
                  className="mt-3 space-y-1.5 pt-2 text-[12px]"
                  style={{ borderTop: `1px solid ${theme.border}` }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: theme.muted }}>Valor registrado (total)</span>
                    <span className="font-medium line-through" style={{ color: theme.soft }}>
                      R$ {registeredTotal.toFixed(2)}
                    </span>
                  </div>
                  {volumeSavings > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ color: theme.muted }}>Economia por quantidade</span>
                      <span className="font-semibold text-[#25D366]">
                        R$ {volumeSavings.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ color: theme.muted }}>
                        Cupom {appliedCoupon?.code}
                        {appliedCoupon?.discountPercent
                          ? ` (${appliedCoupon.discountPercent}%)`
                          : ""}
                      </span>
                      <span className="font-semibold text-[#25D366]">
                        − R$ {couponDiscount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {totalSavings > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ color: theme.muted }}>Economia total</span>
                      <span className="font-semibold text-[#25D366]">
                        R$ {totalSavings.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                <div
                  className="mt-2 flex items-end justify-between pt-2"
                  style={{ borderTop: `1px solid ${theme.border}` }}
                >
                  <span className="text-[12px]" style={{ color: theme.soft }}>
                    Total a pagar
                  </span>
                  <span className="text-[22px] font-bold" style={{ color: colors.accent }}>
                    R$ {total.toFixed(2)}
                  </span>
                </div>
              </div>

              {publicMode && catalogSlug && (
                <div
                  className="rounded-[12px] p-3"
                  style={{ border: `1px solid ${theme.border}`, background: colors.card }}
                >
                  <div className="text-[12px] font-semibold" style={{ color: theme.soft }}>
                    Cupom de influenciador
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      className="h-12 w-full rounded-[10px] px-3 text-[14px] uppercase outline-none"
                      style={inputStyle}
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = colors.accent;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = theme.controlBorder;
                      }}
                      placeholder="Digite o cupom"
                    />
                    <button
                      type="button"
                      disabled={couponApplying}
                      onClick={() => void applyCoupon()}
                      className="h-12 shrink-0 rounded-[10px] px-4 text-[13px] font-semibold disabled:opacity-50"
                      style={{ border: `1px solid ${colors.accent}`, color: colors.accent }}
                    >
                      {couponApplying ? "..." : "Aplicar"}
                    </button>
                  </div>
                  {appliedCoupon && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-[#25D366]">
                        Cupom {appliedCoupon.code} aplicado
                        {appliedCoupon.influencerName ? ` · ${appliedCoupon.influencerName}` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponInput("");
                        }}
                        className="text-[#ef4444]"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              )}

              {sellers.length > 1 && (
                <div className="space-y-2">
                  <span className="block text-[12px]" style={{ color: theme.soft }}>
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
                            borderColor: selected ? colors.accent : theme.controlBorder,
                            background: selected ? withAlpha(colors.accent, 0.12) : colors.card,
                            boxShadow: selected ? `0 0 0 1px ${withAlpha(colors.accent, 0.35)}` : "none",
                          }}
                        >
                          <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                            style={{
                              borderColor: selected ? colors.accent : theme.faint,
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
                            <span className="block text-[12px]" style={{ color: theme.muted }}>
                              WhatsApp
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-[12px]" style={{ color: theme.soft }}>
                    WhatsApp <span className="text-[#ef4444]">*</span>
                  </span>
                  <input
                    type="tel"
                    className="h-12 w-full rounded-[10px] px-3 text-[14px] outline-none"
                    style={inputStyle}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme.controlBorder;
                    }}
                    placeholder="+55 00 00000-0000"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px]" style={{ color: theme.soft }}>
                    Seu nome <span className="text-[#ef4444]">*</span>
                  </span>
                  <input
                    type="text"
                    className="h-12 w-full rounded-[10px] px-3 text-[14px] outline-none"
                    style={inputStyle}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme.controlBorder;
                    }}
                    placeholder="Nome completo"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[12px]" style={{ color: theme.soft }}>
                    CEP para frete <span className="text-[#ef4444]">*</span>
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="h-12 w-full rounded-[10px] px-3 text-[14px] outline-none"
                    style={inputStyle}
                    value={customerCep}
                    onChange={(e) => setCustomerCep(formatCep(e.target.value))}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = colors.accent;
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = theme.controlBorder;
                    }}
                    placeholder="00000-000"
                  />
                  <p className="mt-1 text-[11px]" style={{ color: theme.muted }}>
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
          <div
            className="border-t border-white/5 px-4 pt-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <button
              type="button"
              onClick={() => void sendWhatsApp()}
              disabled={sending}
              className="flex h-14 w-full items-center justify-center rounded-[12px] text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              style={{ background: "#25D366", boxShadow: "0 8px 24px rgba(37,211,102,0.28)" }}
            >
              {sending ? "Atualizando estoque..." : "Enviar pedido no WhatsApp"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PickQtyInput({
  value,
  max,
  onChange,
  accent = "#C9A84C",
}: {
  value: number;
  max?: number;
  onChange: (qty: number) => void;
  accent?: string;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(raw: string) {
    let qty = Math.max(1, parseInt(raw, 10) || 1);
    if (max !== undefined) qty = Math.min(max, qty);
    setDraft(String(qty));
    onChange(qty);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label="Quantidade"
      className="h-10 w-12 rounded-[8px] border border-transparent bg-transparent text-center text-[16px] font-bold outline-none"
      onFocus={(e) => {
        e.currentTarget.style.borderColor = accent;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "transparent";
        commit(draft);
      }}
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(draft);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}

/** Instant poster + muted autoplay iframe for faster YouTube open on mobile. */
function YoutubeFastPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster: string | null;
  title: string;
}) {
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);

  const playerSrc = useMemo(() => {
    try {
      const url = new URL(src);
      url.searchParams.set("mute", muted ? "1" : "0");
      url.searchParams.set("autoplay", "1");
      url.searchParams.set("playsinline", "1");
      url.searchParams.set("rel", "0");
      return url.toString();
    } catch {
      return src;
    }
  }, [src, muted]);

  useEffect(() => {
    setReady(false);
  }, [playerSrc]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-300"
          style={{ opacity: ready ? 0 : 1 }}
          decoding="async"
        />
      )}
      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55">
            <span className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[12px] border-y-transparent border-l-white" />
          </div>
        </div>
      )}
      <iframe
        key={playerSrc}
        src={playerSrc}
        title={title}
        className="relative z-[2] h-full w-full border-0"
        style={{ opacity: ready ? 1 : 0 }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        onLoad={() => setReady(true)}
      />
      {muted && (
        <button
          type="button"
          onClick={() => setMuted(false)}
          className="absolute bottom-3 left-3 z-[3] rounded-full border border-white/20 bg-black/70 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-sm"
        >
          Ativar som
        </button>
      )}
    </div>
  );
}
