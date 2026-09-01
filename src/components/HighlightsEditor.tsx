"use client";

import type { Brand, BrandHighlight, HighlightIcon, HighlightStyle } from "@/lib/types";
import {
  HIGHLIGHT_ICONS,
  HIGHLIGHT_PRESETS,
  HIGHLIGHT_STYLES,
  createHighlightId,
  defaultHighlights,
} from "@/lib/highlights";
import { HighlightIconSvg } from "./HighlightIcon";
import { HighlightStrip } from "./HighlightStrip";
import type { BrandColors } from "@/lib/types";

export function HighlightsEditor({
  brand,
  setBrand,
  colors,
}: {
  brand: Brand;
  setBrand: React.Dispatch<React.SetStateAction<Brand>>;
  colors: BrandColors;
}) {
  const highlights = brand.highlights ?? defaultHighlights();
  const style = brand.highlightStyle ?? "pill";

  function updateHighlights(next: BrandHighlight[]) {
    setBrand((prev) => ({ ...prev, highlights: next }));
  }

  function updateStyle(next: HighlightStyle) {
    setBrand((prev) => ({ ...prev, highlightStyle: next }));
  }

  function toggleItem(id: string) {
    updateHighlights(
      highlights.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)),
    );
  }

  function updateLabel(id: string, label: string) {
    updateHighlights(highlights.map((item) => (item.id === id ? { ...item, label } : item)));
  }

  function updateIcon(id: string, icon: HighlightIcon) {
    updateHighlights(highlights.map((item) => (item.id === id ? { ...item, icon } : item)));
  }

  function removeItem(id: string) {
    updateHighlights(highlights.filter((item) => item.id !== id));
  }

  function addPreset(preset: (typeof HIGHLIGHT_PRESETS)[number]) {
    updateHighlights([
      ...highlights,
      { ...preset, id: createHighlightId(), enabled: true },
    ]);
  }

  function addCustom() {
    updateHighlights([
      ...highlights,
      { id: createHighlightId(), label: "Novo destaque", icon: "star", enabled: true },
    ]);
  }

  return (
    <section>
      <h2 className="mb-1 text-[15px] font-bold">Destaques da loja</h2>
      <p className="mb-4 text-[12px] text-[#6B7A72]">
        Badges que aparecem na home do catálogo mobile. Escolha o estilo e edite os textos.
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HIGHLIGHT_STYLES.map((option) => {
          const active = style === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => updateStyle(option.id)}
              className="rounded-[12px] border p-3 text-left transition"
              style={{
                borderColor: active ? "#C9A84C" : "#1E3A2E",
                background: active ? "#C9A84C14" : "#0F281F",
              }}
            >
              <div className="text-[12px] font-semibold text-white">{option.label}</div>
              <div className="mt-1 text-[10px] text-[#6B7A72]">{option.description}</div>
            </button>
          );
        })}
      </div>

      <div className="mb-4 overflow-hidden rounded-[14px] border border-[rgba(201,168,76,0.14)] bg-[#0A1F18]">
        <div className="border-b border-[rgba(201,168,76,0.1)] px-3 py-2 text-[11px] text-[#6B7A72]">
          Preview mobile
        </div>
        <HighlightStrip items={highlights} style={style} colors={colors} />
      </div>

      <div className="space-y-2">
        {highlights.map((item) => (
          <div
            key={item.id}
            className="rounded-[12px] border border-[#1E3A2E] bg-[#0F281F] p-3"
          >
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggleItem(item.id)}
                className="mt-1 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition"
                style={{
                  background: item.enabled ? "#C9A84C" : "#1E3A2E",
                  justifyContent: item.enabled ? "flex-end" : "flex-start",
                }}
                aria-label={item.enabled ? "Desativar destaque" : "Ativar destaque"}
              >
                <span className="h-5 w-5 rounded-full bg-white shadow" />
              </button>

              <div className="min-w-0 flex-1 space-y-2">
                <input
                  className="field-input h-10 py-2 text-[13px]"
                  value={item.label}
                  onChange={(e) => updateLabel(item.id, e.target.value)}
                  placeholder="Texto do destaque"
                />

                <div className="flex flex-wrap gap-1.5">
                  {HIGHLIGHT_ICONS.map((icon) => {
                    const active = item.icon === icon.id;
                    return (
                      <button
                        key={icon.id}
                        type="button"
                        title={icon.label}
                        onClick={() => updateIcon(item.id, icon.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-[8px] border transition"
                        style={{
                          borderColor: active ? "#C9A84C" : "#1E3A2E",
                          background: active ? "#C9A84C22" : "#0A1F18",
                          color: active ? "#C9A84C" : "#A8B5AE",
                        }}
                      >
                        <HighlightIconSvg icon={icon.id} size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[#ef4444] hover:bg-[#ef444418]"
                aria-label="Remover destaque"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addCustom}
          className="h-10 rounded-[10px] border border-[#C9A84C] px-3 text-[12px] font-semibold text-[#C9A84C]"
        >
          + Destaque personalizado
        </button>
        {HIGHLIGHT_PRESETS.filter(
          (preset) => !highlights.some((h) => h.label === preset.label),
        ).map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => addPreset(preset)}
            className="h-10 rounded-[10px] border border-[#1E3A2E] px-3 text-[12px] text-[#A8B5AE] hover:border-[#C9A84C]"
          >
            + {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}
