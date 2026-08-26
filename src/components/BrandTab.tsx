"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { Brand, BrandColors } from "@/lib/types";
import { extractColorsFromDataUrl, mapExtractedToBrand } from "@/lib/extractColors";
import { readAsDataURL } from "@/lib/utils";
import { getYoutubeEmbedUrl } from "@/lib/youtube";

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
    <div className="relative rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#141416] p-3">
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
}: {
  brand: Brand;
  setBrand: Dispatch<SetStateAction<Brand>>;
  colors: BrandColors;
  setColors: Dispatch<SetStateAction<BrandColors>>;
}) {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [extracted, setExtracted] = useState<string[]>([]);
  const embedUrl = getYoutubeEmbedUrl(brand.videoUrl);

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
            className="flex h-[120px] w-full flex-col items-center justify-center rounded-[14px] border border-dashed border-[#2a2a2e] bg-[#141416]"
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
                onClick={() => setColors(mapExtractedToBrand(extracted))}
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
              className="flex h-[120px] w-full flex-col items-center justify-center rounded-[14px] border border-dashed border-[#2a2a2e] bg-[#141416]"
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

        <label className="block">
          <span className="field-label">WhatsApp principal</span>
          <input
            className="field-input"
            placeholder="5511999999999"
            value={brand.whatsapp}
            onChange={(e) => setBrand((prev) => ({ ...prev, whatsapp: e.target.value }))}
          />
        </label>

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

        <section>
          <h2 className="mb-3 text-[15px] font-bold">Cores da marca</h2>
          <div className="mb-4 flex h-8 w-full overflow-hidden rounded-[10px]">
            <div style={{ flex: 3, background: colors.primary }} />
            <div style={{ flex: 2, background: colors.card }} />
            <div style={{ flex: 1, background: colors.accent }} />
            <div style={{ flex: 1, background: colors.text }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="Fundo principal"
              value={colors.primary}
              onChange={(v) => setColors((prev) => ({ ...prev, primary: v }))}
            />
            <ColorField
              label="Cor destaque"
              value={colors.accent}
              onChange={(v) => setColors((prev) => ({ ...prev, accent: v }))}
            />
            <ColorField
              label="Texto"
              value={colors.text}
              onChange={(v) => setColors((prev) => ({ ...prev, text: v }))}
            />
            <ColorField
              label="Cards"
              value={colors.card}
              onChange={(v) => setColors((prev) => ({ ...prev, card: v }))}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
