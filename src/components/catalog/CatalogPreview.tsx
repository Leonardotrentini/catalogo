"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { Brand, BrandColors, CartItem, Product } from "@/lib/types";
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
  filterGalleryByColor,
  productThumbIsVideo,
  productThumbSrc,
} from "@/lib/media";
import { getYoutubeEmbedUrl } from "@/lib/youtube";

export function CatalogPreview({
  brand,
  colors,
  setColors,
  products,
}: {
  brand: Brand;
  colors: BrandColors;
  setColors: Dispatch<SetStateAction<BrandColors>>;
  products: Product[];
}) {
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
      };
    });
  }, [products]);

  const categoryProducts = activeCategory
    ? products.filter((p) => p.category === activeCategory)
    : [];

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  function addToCart(item: Omit<CartItem, "key">) {
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
    setToast(item.name);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <MiniPicker label="Fundo" value={colors.primary} onChange={(v) => setColors((prev) => ({ ...prev, primary: v }))} />
        <MiniPicker label="Destaque" value={colors.accent} onChange={(v) => setColors((prev) => ({ ...prev, accent: v }))} />
        <MiniPicker label="Cards" value={colors.card} onChange={(v) => setColors((prev) => ({ ...prev, card: v }))} />
        <MiniPicker label="Texto" value={colors.text} onChange={(v) => setColors((prev) => ({ ...prev, text: v }))} />
      </div>

      <div
        className="relative mx-auto overflow-hidden"
        style={{
          maxWidth: 390,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
          background: colors.primary,
          color: colors.text,
          minHeight: 720,
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
            className={`relative flex h-11 min-w-11 items-center justify-center rounded-[10px] px-3 text-[12px] font-semibold ${cartBump ? "cart-bounce" : ""}`}
            style={{
              border: `1px solid ${colors.accent}`,
              color: colors.text,
            }}
          >
            Sacola
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
                <div className="aspect-square w-full" style={{ background: withAlpha(colors.text, 0.06) }}>
                  {productThumbIsVideo(product) ? (
                    <video src={productThumbSrc(product)} className="h-full w-full object-cover" muted playsInline />
                  ) : productThumbSrc(product) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={productThumbSrc(product)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${colors.card}, ${colors.primary})` }} />
                  )}
                </div>
                <div className="p-2.5">
                  <div className="truncate text-[13px] font-bold">{product.name}</div>
                  <div className="mt-1 text-[16px] font-bold" style={{ color: colors.accent }}>
                    R$ {formatMoney(product.price)}
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
            onClose={() => setActiveProduct(null)}
            onAdd={(item) => addToCart(item)}
          />
        )}

        {cartOpen && (
          <CartSheet
            brand={brand}
            colors={colors}
            cart={cart}
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
}: {
  brand: Brand;
  colors: BrandColors;
  storeName: string;
  categories: { name: string; count: number; cover: string; coverVideo: boolean }[];
  onOpenCategory: (name: string) => void;
}) {
  const embed = getYoutubeEmbedUrl(brand.videoUrl);
  const ig = brand.instagram.replace(/^@/, "");

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

      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        <TrustBadge bg="#0d3b20" fg="#34d399" mark="BR" label="Todo Brasil" colors={colors} />
        <TrustBadge bg="#1a3322" fg="#25D366" mark="W" label="Via WhatsApp" colors={colors} />
        <TrustBadge bg="#1a2744" fg="#60a5fa" mark="✓" label="CNPJ ativo" colors={colors} />
        <TrustBadge bg="#3a2a0d" fg="#f59e0b" mark="$" label="Pix & Cartão" colors={colors} />
      </div>

      <div className={`grid gap-2.5 px-4 ${categories.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {categories.map((cat) => (
          <button
            type="button"
            key={cat.name}
            onClick={() => onOpenCategory(cat.name)}
            className="relative aspect-[16/10] overflow-hidden rounded-[14px] text-left transition hover:brightness-110 active:scale-[0.98]"
            style={{ background: colors.card, cursor: "pointer" }}
          >
            {cat.coverVideo && cat.cover ? (
              <video src={cat.cover} className="h-full w-full object-cover" muted playsInline />
            ) : cat.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cat.cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full"
                style={{ background: `linear-gradient(135deg, ${colors.accent}55, ${colors.primary})` }}
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 70%)",
              }}
            />
            <div className="absolute bottom-2 left-2 right-2">
              <div className="text-[14px] font-bold uppercase tracking-[0.04em]">{cat.name}</div>
              <div className="text-[12px]" style={{ color: colors.accent }}>
                +{cat.count} modelos
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

      {brand.whatsapp && (
        <div className="px-4 pt-5">
          <a
            href={`https://wa.me/${digitsOnly(brand.whatsapp)}`}
            target="_blank"
            rel="noreferrer"
            className="flex h-14 w-full items-center justify-center rounded-[12px] text-[15px] font-semibold text-white"
            style={{ background: "#25D366" }}
          >
            Falar com vendedor
          </a>
        </div>
      )}

      <footer className="mt-6 space-y-3 px-4" style={{ color: withAlpha(colors.text, 0.7) }}>
        {brand.instagram && (
          <div className="text-[13px]">
            Instagram{" "}
            <a
              href={`https://instagram.com/${ig}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: colors.accent }}
            >
              @{ig}
            </a>
          </div>
        )}
        {brand.cnpj && <div className="text-[12px]">CNPJ {brand.cnpj}</div>}
        <div className="flex items-center gap-2 text-[12px]">
          <div
            className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold"
            style={{ background: "#1a3322", color: "#25D366" }}
          >
            W
          </div>
          WhatsApp
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Pix", "Visa", "Master", "Elo", "Boleto"].map((p) => (
            <span
              key={p}
              className="rounded px-1.5 py-1"
              style={{
                fontSize: 9,
                background: "#1a1a1e",
                border: "1px solid #222",
                color: colors.text,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}

function TrustBadge({
  bg,
  fg,
  mark,
  label,
  colors,
}: {
  bg: string;
  fg: string;
  mark: string;
  label: string;
  colors: BrandColors;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-[10px] px-2 py-1.5" style={{ background: colors.card }}>
      <div
        className="flex h-[22px] w-[22px] items-center justify-center rounded-[6px] text-[10px] font-bold"
        style={{ background: bg, color: fg }}
      >
        {mark}
      </div>
      <span className="whitespace-nowrap text-[12px]">{label}</span>
    </div>
  );
}

function ProductSheet({
  product,
  colors,
  onClose,
  onAdd,
}: {
  product: Product;
  colors: BrandColors;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, "key">) => void;
}) {
  const [index, setIndex] = useState(0);
  const [color, setColor] = useState(product.colors[0] ?? "");
  const [size, setSize] = useState(product.sizes[0] ?? "");
  const [added, setAdded] = useState(false);

  const gallery = useMemo(() => {
    return filterGalleryByColor(buildGallery(product), color);
  }, [product, color]);

  const current = gallery[index] ?? gallery[0];

  function selectColor(next: string) {
    setColor(next);
    setIndex(0);
  }

  const yt = current?.kind === "video" ? getYoutubeEmbedUrl(current.src) : null;
  const isFileVideo =
    current?.kind === "video" &&
    (current.videoType === "file" || current.src.startsWith("data:") || current.src.startsWith("blob:"));

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
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-[10px] text-white transition hover:bg-white/20"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          >
            ✕
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
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
            R$ {formatMoney(product.price)}
          </div>
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
              <div className="mb-2 text-[12px]">Cor: {color ? colorNameFromHex(color) : "—"}</div>
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
                      title={colorNameFromHex(c)}
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

          <button
            type="button"
            onClick={() => {
              onAdd({
                productId: product.id,
                name: product.name,
                color,
                colorName: color ? colorNameFromHex(color) : "—",
                size: size || "—",
                qty: 1,
                price: product.price,
                image: colorImageForCart(product, color),
              });
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }}
            className="mt-6 flex h-14 w-full items-center justify-center rounded-[14px] text-[15px] font-semibold transition hover:brightness-110 active:scale-[0.98]"
            style={{
              background: added ? "#25D366" : colors.accent,
              color: added ? "#fff" : colors.primary,
              cursor: "pointer",
            }}
          >
            {added ? "✓ Adicionado ao carrinho!" : "Adicionar ao carrinho"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CartSheet({
  brand,
  colors,
  cart,
  setCart,
  onClose,
}: {
  brand: Brand;
  colors: BrandColors;
  cart: CartItem[];
  setCart: (next: CartItem[]) => void;
  onClose: () => void;
}) {
  const pieces = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + parsePrice(i.price) * i.qty, 0);

  function sendWhatsApp() {
    const phone = digitsOnly(brand.whatsapp);
    if (!phone) return;
    const lines = cart.map((item, idx) => {
      const sub = (parsePrice(item.price) * item.qty).toFixed(2);
      return `${idx + 1}. *${item.name}*\n   Cor: ${item.colorName} · Tam: ${item.size}\n   ${item.qty} × R$ ${formatMoney(item.price)} = R$ ${sub}`;
    });
    const msg = `🛒 *Pedido via Catálogo — ${brand.name || "Loja"}*\n\n${lines.join("\n\n")}\n\n━━━━━━━━━━━━━━━\n💰 *Total: R$ ${total.toFixed(2)}*\n📦 *${pieces} peças*\n\n_Pedido feito pelo catálogo digital_`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

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
        style={{ background: "#111113", borderRadius: "20px 20px 0 0", color: colors.text }}
      >
        <div className="mx-auto mt-[10px] h-1 w-9 rounded-[2px] bg-[#333]" />
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-[18px] font-bold">Carrinho</div>
            <div className="text-[12px] text-[#555]">{pieces} itens</div>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
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
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.key} className="flex gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-[10px]" style={{ background: colors.card }}>
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold">{item.name}</div>
                    <div className="text-[11px] text-[#555]">
                      {item.colorName} · Tam {item.size}
                    </div>
                    <div className="text-[13px] font-bold" style={{ color: colors.accent }}>
                      R$ {formatMoney(parsePrice(item.price) * item.qty)}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#2a2a2e]"
                        onClick={() =>
                          setCart(
                            item.qty <= 1
                              ? cart.filter((c) => c.key !== item.key)
                              : cart.map((c) => (c.key === item.key ? { ...c, qty: c.qty - 1 } : c)),
                          )
                        }
                      >
                        −
                      </button>
                      <span className="min-w-4 text-center text-[14px] font-bold">{item.qty}</span>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#2a2a2e]"
                        onClick={() =>
                          setCart(cart.map((c) => (c.key === item.key ? { ...c, qty: c.qty + 1 } : c)))
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-auto flex h-8 w-8 items-center justify-center text-[#ef4444]"
                        onClick={() => setCart(cart.filter((c) => c.key !== item.key))}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-white/5 px-4 py-4">
            <div className="flex items-center justify-between text-[13px] text-[#666]">
              <span>{pieces} peças</span>
              <span>Subtotal</span>
            </div>
            <div className="mt-1 flex items-end justify-between">
              <span className="text-[13px] text-[#666]">Total</span>
              <span className="text-[26px] font-bold" style={{ color: colors.accent }}>
                R$ {total.toFixed(2)}
              </span>
            </div>
            <button
              type="button"
              onClick={sendWhatsApp}
              className="mt-3 flex h-14 w-full items-center justify-center rounded-[14px] text-[15px] font-semibold text-white"
              style={{ background: "#25D366", boxShadow: "0 8px 24px rgba(37,211,102,0.28)" }}
            >
              Enviar pedido por WhatsApp
            </button>
            <div className="mt-2 text-center text-[11px] text-[#444]">
              Você será redirecionado para o WhatsApp da loja
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
