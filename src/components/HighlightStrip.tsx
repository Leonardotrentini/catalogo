"use client";

import type { BrandColors, BrandHighlight, HighlightStyle } from "@/lib/types";
import { highlightIconColors } from "@/lib/highlights";
import { HighlightIconSvg } from "./HighlightIcon";
import { withAlpha } from "@/lib/utils";

export function HighlightStrip({
  items,
  style,
  colors,
}: {
  items: BrandHighlight[];
  style: HighlightStyle;
  colors: BrandColors;
}) {
  const visible = items.filter((item) => item.enabled && item.label.trim());
  if (visible.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {visible.map((item) => (
        <HighlightChip key={item.id} item={item} style={style} colors={colors} />
      ))}
    </div>
  );
}

function HighlightChip({
  item,
  style,
  colors,
}: {
  item: BrandHighlight;
  style: HighlightStyle;
  colors: BrandColors;
}) {
  const palette = highlightIconColors(item.icon);

  if (style === "minimal") {
    return (
      <div
        className="flex shrink-0 items-center gap-2 rounded-[10px] border px-2.5 py-2"
        style={{ borderColor: withAlpha(colors.text, 0.12), background: withAlpha(colors.card, 0.5) }}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[8px]"
          style={{ background: withAlpha(palette.fg, 0.12), color: palette.fg }}
        >
          <HighlightIconSvg icon={item.icon} size={14} color={palette.fg} />
        </span>
        <span className="whitespace-nowrap text-[12px] font-medium">{item.label}</span>
      </div>
    );
  }

  if (style === "outline") {
    return (
      <div
        className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5"
        style={{ borderColor: withAlpha(colors.accent, 0.45), color: colors.text }}
      >
        <HighlightIconSvg icon={item.icon} size={14} color={colors.accent} />
        <span className="whitespace-nowrap text-[12px] font-semibold">{item.label}</span>
      </div>
    );
  }

  if (style === "glass") {
    return (
      <div
        className="flex shrink-0 items-center gap-2 rounded-[12px] border px-2.5 py-2 backdrop-blur-md"
        style={{
          borderColor: withAlpha(colors.text, 0.1),
          background: withAlpha(colors.text, 0.06),
        }}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-[8px]"
          style={{ background: withAlpha(palette.fg, 0.18), color: palette.fg }}
        >
          <HighlightIconSvg icon={item.icon} size={14} color={palette.fg} />
        </span>
        <span className="whitespace-nowrap text-[12px] font-medium">{item.label}</span>
      </div>
    );
  }

  return (
    <div
      className="flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1.5"
      style={{ background: colors.card }}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-[8px]"
        style={{ background: palette.bg, color: palette.fg }}
      >
        <HighlightIconSvg icon={item.icon} size={14} color={palette.fg} />
      </span>
      <span className="whitespace-nowrap text-[12px] font-medium">{item.label}</span>
    </div>
  );
}
