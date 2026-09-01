import type { HighlightIcon } from "@/lib/types";
import { getHighlightIconPath } from "@/lib/highlights";

export function HighlightIconSvg({
  icon,
  size = 16,
  color,
}: {
  icon: HighlightIcon;
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d={getHighlightIconPath(icon)} fill={color ?? "currentColor"} />
    </svg>
  );
}
