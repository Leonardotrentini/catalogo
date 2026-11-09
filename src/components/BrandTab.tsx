"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  patchSurfaceColors,
  resetSurfaceColors,
  surfaceColors,
  surfaceHasCustomColors,
} from "@/lib/catalogColors";
import type { Brand, BrandColors, BrandSeller, CatalogColors, ColorSurface } from "@/lib/types";
import { extractColorsFromDataUrl, mapExtractedToBrand } from "@/lib/extractColors";
import { readAsDataURL } from "@/lib/utils";
import { CatalogSlugEditor } from "./CatalogSlugEditor";
import { HighlightsEditor } from "./HighlightsEditor";
import { SellersEditor } from "./SellersEditor";
import { BRAND_VIDEO_POSITIONS, getYoutubeEmbedUrl, normalizeVideoPosition } from "@/lib/youtube";
import { normalizeSellers, newSellerId } from "@/lib/sellers";
import { digitsOnly } from "@/lib/utils";

const COLOR_SURFACES: { id: ColorSurface; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "product", label: "Produto" },
  { id: "cart", label: "Carrinho" },
];

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative rounded-[10px] border border-[rgba(201,168,76,0.14)] bg-[#0F281F] p-3">
      <div className="mb-2 text-[12px] text-[#999]">{label}</div>
      <div className="relative h-10 w-10">
        <div
          className="h-10 w-10 rounded-[10px]"
          style={{ background: value, boxShadow: `0 0 16px ${value}99` }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-10 w-10 cursor-pointer opacity-0"
          aria-label={label}
        />
      </div>
      <div className="mt-2 font-mono text-[13px] uppercase">{value}</div>
    </div>
  );
}

export function BrandTab({
  brand,
  setBrand,
  colors,
  setColors,
  catalogId,
  catalogSlug,
  onCatalogSlugSaved,
}: {
  brand: Brand;
  setBrand: Dispatch<SetStateAction<Brand>>;
  colors: CatalogColors;
  setColors: Dispatch<SetStateAction<CatalogColors>>;
  catalogId?: string;
  catalogSlug?: string;
  onCatalogSlugSaved?: (slug: string) => void;
}) {
  const [colorSurface, setColorSurface] = useState<ColorSurface>("home");
  const activeColors = surfaceColors(colors, colorSurface);
  const customized = surfaceHasCustomColors(colors, colorSurface);

  function updateActiveColor(key: keyof BrandColors, value: string) {
    setColors((prev) => patchSurfaceColors(prev, colorSurface, { [key]: value }));
  }
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [extracted, setExtracted] = useState<string[]>([]);
  const embedUrl = getYoutubeEmbedUrl(brand.videoUrl);

  const sellers: BrandSeller[] =
    brand.sellers !== undefined && brand.sellers.length > 0
      ? brand.sellers
      : normalizeSellers(brand).length > 0
        ? normalizeSellers(brand)
        : [{ id: newSellerId(), name: "", phone: "" }];

  function handleSellersChange(next: BrandSeller[]) {
    const firstPhone = next.map((seller) => digitsOnly(seller.phone)).find(Boolean) ?? "";
    setBrand((prev) => ({
      ...prev,
      sellers: next,
      whatsapp: firstPhone,
    }));
  }

  async function handleLogo(file: File) {
    const dataUrl = await readAsDataURL(file);
    setBrand((prev) => ({ ...prev, logo: dataUrl }));
    setScanning(true);
    await new Promise((r) => setTimeout(r, 450));
    try {
      const palette = await extractColorsFromDataUrl(dataUrl);
      setExtracted(palette);
    } finally {
      setScanning(false);
    }
  }

  async function handleBanner(file: File) {
    const dataUrl = await readAsDataURL(file);
    setBrand((prev) => ({ ...prev, banner: dataUrl }));
  }

  return (
    <div>
      <h1 className="text-[18px] font-bold">Marca & Aparência</h1>
      <p className="mt-1 text-[13px] text-[#999]">
        Configure a identidade visual do catálogo
      </p>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="field-label">Nome da loja</span>
          <input
            className="field-input"
            placeholder="Ex: DY Fonte Camisetas"
            value={brand.name}
            onChange={(e) => setBrand((prev) => ({ ...prev, name: e.target.value }))}
          />
        </label>

        {catalogId && catalogSlug && onCatalogSlugSaved && (
          <CatalogSlugEditor
            catalogId={catalogId}
            slug={catalogSlug}
            onSaved={onCatalogSlugSaved}
          />
        )}

        <div>
          <span className="field-label">Logo da marca</span>
          <input
            ref={logoRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleLogo(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => logoRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) void handleLogo(file);
            }}
            className="flex h-[120px] w-full flex-col items-center justify-center rounded-[14px] border border-dashed border-[#1E3A2E] bg-[#0F281F]"
          >
            {brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt="Logo" className="max-h-[88px] max-w-[200px] object-contain" />
            ) : (
              <>
                <span className="text-[13px] text-[#999]">Arraste o logo ou clique para selecionar</span>
                <span className="mt-1 text-[11px] text-[#555]">PNG, JPG, SVG</span>
              </>
            )}
          </button>
          {scanning && (
            <div className="pulse-soft mt-3 text-[13px] text-[#C9A84C]">Escaneando cores...</div>
          )}
          {!scanning && extracted.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-[12px] text-[#999]">Cores extraídas</div>
              <div className="flex flex-wrap gap-2">
                {extracted.map((hex) => (
                  <div
                    key={hex}
                    className="h-11 w-11 rounded-[10px] border border-white/10"
                    style={{ background: hex }}
                    title={hex}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setColors((prev) => ({
                    ...mapExtractedToBrand(extracted),
                    ...(prev.product ? { product: prev.product } : {}),
                    ...(prev.cart ? { cart: prev.cart } : {}),
                  }))
                }
                className="mt-3 h-11 rounded-[10px] border border-[#C9A84C] px-4 text-[13px] font-semibold text-[#C9A84C]"
              >
                Aplicar na marca
              </button>
            </div>
          )}
        </div>

        <div>
          <span className="field-label">Banner principal</span>
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleBanner(file);
              e.target.value = "";
            }}
          />
          {brand.banner ? (
            <div className="relative overflow-hidden rounded-[14px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brand.banner} alt="Banner" className="h-[140px] w-full object-cover" />
              <button
                type="button"
                onClick={() => setBrand((prev) => ({ ...prev, banner: "" }))}
                className="absolute right-3 top-3 h-11 rounded-[10px] bg-black/60 px-3 text-[13px] backdrop-blur"
              >
                ✕ Trocar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) void handleBanner(file);
              }}
              className="flex h-[120px] w-full flex-col items-center justify-center rounded-[14px] border border-dashed border-[#1E3A2E] bg-[#0F281F]"
            >
              <span className="text-[13px] text-[#999]">Arraste o banner ou clique para selecionar</span>
              <span className="mt-1 text-[11px] text-[#555]">1200×400px recomendado</span>
            </button>
          )}
        </div>

        <label className="block">
          <span className="field-label">Vídeo de apresentação</span>
          <input
            className="field-input"
            placeholder="https://youtu.be/... ou https://youtube.com/watch?v=..."
            value={brand.videoUrl}
            onChange={(e) => setBrand((prev) => ({ ...prev, videoUrl: e.target.value }))}
          />
          <span className="mt-1 block text-[11px] text-[#555]">Cole qualquer link do YouTube</span>
          <span className="field-label mt-3">Título acima do vídeo</span>
          <input
            className="field-input"
            placeholder="Ex.: Padrão de qualidade"
            value={brand.videoTitle ?? "Padrão de qualidade"}
            onChange={(e) => setBrand((prev) => ({ ...prev, videoTitle: e.target.value }))}
          />
          <span className="mt-1 block text-[11px] text-[#555]">
            Aparece na home, em cima do vídeo. Apague o texto para ficar sem título.
          </span>
          <div className="mt-3">
            <span className="field-label">Onde o vídeo aparece na home</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {BRAND_VIDEO_POSITIONS.map((option) => {
                const active = normalizeVideoPosition(brand.videoPosition) === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setBrand((prev) => ({ ...prev, videoPosition: option.id }))}
                    className="h-9 rounded-full px-3 text-[12px] font-medium"
                    style={{
                      border: active ? "1px solid #C9A84C" : "1px solid #1E3A2E",
                      color: active ? "#C9A84C" : "#A8B5AE",
                      background: active ? "#C9A84C18" : "transparent",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          {embedUrl && (
            <iframe
              src={embedUrl}
              title="Preview do vídeo"
              height={180}
              className="mt-3 w-full rounded-[10px] border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </label>

        <SellersEditor sellers={sellers} onChange={handleSellersChange} />

        <label className="block">
          <span className="field-label">Instagram</span>
          <input
            className="field-input"
            placeholder="@sualoja"
            value={brand.instagram}
            onChange={(e) => setBrand((prev) => ({ ...prev, instagram: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className="field-label">CNPJ</span>
          <input
            className="field-input"
            placeholder="00.000.000/0001-00"
            value={brand.cnpj}
            onChange={(e) => setBrand((prev) => ({ ...prev, cnpj: e.target.value }))}
          />
        </label>

        <HighlightsEditor brand={brand} setBrand={setBrand} colors={colors} />

        <section className="rounded-[12px] border border-[#1E3A2E] bg-[#0A1F18] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold">Pastas de categoria</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6B7A72]">
                Ligado, a home mostra pastas (Camisetas, Bermudas…). Desligado, os produtos aparecem direto na home, como em um site.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={brand.hideCategories !== true}
              onClick={() =>
                setBrand((prev) => ({ ...prev, hideCategories: prev.hideCategories !== true }))
              }
              className="relative h-8 w-14 shrink-0 rounded-full transition"
              style={{ background: brand.hideCategories !== true ? "#25D366" : "#1E3A2E" }}
            >
              <span
                className="absolute top-1 h-6 w-6 rounded-full bg-white transition"
                style={{ left: brand.hideCategories !== true ? 28 : 4 }}
              />
            </button>
          </div>
          <p
            className="mt-2 text-[12px] font-semibold"
            style={{ color: brand.hideCategories !== true ? "#25D366" : "#6B7A72" }}
          >
            {brand.hideCategories !== true ? "Pastas na home" : "Só produtos na home"}
          </p>
        </section>

        <section className="rounded-[12px] border border-[#1E3A2E] bg-[#0A1F18] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold">Estoque por tamanho e cor</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-[#6B7A72]">
                Desligado, a loja continua com um número só de estoque. Ligado, cada cor e tamanho tem a própria quantidade e some do catálogo ao chegar a 0.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={brand.stockControl === true}
              onClick={() => setBrand((prev) => ({ ...prev, stockControl: prev.stockControl !== true }))}
              className="relative h-8 w-14 shrink-0 rounded-full transition"
              style={{ background: brand.stockControl === true ? "#25D366" : "#1E3A2E" }}
            >
              <span
                className="absolute top-1 h-6 w-6 rounded-full bg-white transition"
                style={{ left: brand.stockControl === true ? 28 : 4 }}
              />
            </button>
          </div>
          <p className="mt-2 text-[12px] font-semibold" style={{ color: brand.stockControl === true ? "#25D366" : "#6B7A72" }}>
            {brand.stockControl === true ? "Ligado" : "Desligado"}
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-[15px] font-bold">Botão principal</h2>
          <p className="mb-3 text-[12px] text-[#6B7A72]">
            Texto e cor do botão &quot;Finalizar pedido&quot; na home do catálogo.
          </p>
          <div className="space-y-3 rounded-[12px] border border-[#1E3A2E] bg-[#0A1F18] p-3">
            <label className="block">
              <span className="field-label">Texto do botão</span>
              <input
                className="field-input"
                placeholder="Finalizar pedido"
                value={brand.checkoutButtonText ?? ""}
                onChange={(e) =>
                  setBrand((prev) => ({ ...prev, checkoutButtonText: e.target.value }))
                }
              />
            </label>
            <ColorField
              label="Cor do botão"
              value={brand.checkoutButtonColor ?? "#25D366"}
              onChange={(v) => setBrand((prev) => ({ ...prev, checkoutButtonColor: v }))}
            />
            <div
              className="flex h-12 items-center justify-center rounded-[12px] text-[14px] font-semibold text-white"
              style={{ background: brand.checkoutButtonColor ?? "#25D366" }}
            >
              {brand.checkoutButtonText?.trim() || "Finalizar pedido"}
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[15px] font-bold">Cores da marca</h2>
          <p className="mb-3 text-[12px] leading-relaxed text-[#A8B5AE]">
            Selecione Home, Produto ou Carrinho e ajuste as cores de cada tela. Produto e carrinho
            começam iguais à home até você personalizar.
          </p>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {COLOR_SURFACES.map((item) => {
              const preview = surfaceColors(colors, item.id);
              const active = colorSurface === item.id;
              const hasCustom = surfaceHasCustomColors(colors, item.id) && item.id !== "home";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setColorSurface(item.id)}
                  className="overflow-hidden rounded-[10px] text-left transition"
                  style={{
                    background: preview.primary,
                    outline: active ? `2px solid #C9A84C` : "2px solid transparent",
                    outlineOffset: 1,
                  }}
                >
                  <div className="flex items-center justify-between gap-1 px-2 pt-1.5">
                    <span className="text-[10px] font-semibold" style={{ color: preview.text }}>
                      {item.label}
                    </span>
                    {hasCustom && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-[#C9A84C]">
                        custom
                      </span>
                    )}
                  </div>
                  <div className="m-1.5 rounded-[6px] px-1.5 py-2" style={{ background: preview.card }}>
                    <div className="h-1.5 w-10 rounded-full" style={{ background: preview.accent }} />
                    <div
                      className="mt-1 h-1 w-7 rounded-full opacity-60"
                      style={{ background: preview.text }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mb-3 flex h-8 w-full overflow-hidden rounded-[10px]">
            <div style={{ flex: 3, background: activeColors.primary }} />
            <div style={{ flex: 2, background: activeColors.card }} />
            <div style={{ flex: 1, background: activeColors.accent }} />
            <div style={{ flex: 1, background: activeColors.text }} />
          </div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[12px] text-[#A8B5AE]">
              Editando:{" "}
              <span className="font-semibold text-[#C9A84C]">
                {COLOR_SURFACES.find((item) => item.id === colorSurface)?.label}
              </span>
              {colorSurface !== "home" && !customized ? " · igual à home" : ""}
            </p>
            {colorSurface !== "home" && customized && (
              <button
                type="button"
                onClick={() => setColors((prev) => resetSurfaceColors(prev, colorSurface))}
                className="shrink-0 rounded-[8px] border border-[#1E3A2E] px-2.5 py-1 text-[11px] font-semibold text-[#A8B5AE]"
              >
                Usar cores da home
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="Fundo"
              value={activeColors.primary}
              onChange={(v) => updateActiveColor("primary", v)}
            />
            <ColorField
              label="Destaque (preço e ênfase)"
              value={activeColors.accent}
              onChange={(v) => updateActiveColor("accent", v)}
            />
            <ColorField
              label="Texto"
              value={activeColors.text}
              onChange={(v) => updateActiveColor("text", v)}
            />
            <ColorField
              label="Cards e blocos"
              value={activeColors.card}
              onChange={(v) => updateActiveColor("card", v)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
