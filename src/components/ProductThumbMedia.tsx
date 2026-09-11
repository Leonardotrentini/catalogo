"use client";

import { productThumbIsVideo, productThumbSrc } from "@/lib/media";
import type { Product } from "@/lib/types";

function PlayBadge() {
  return (
    <span
      className="pointer-events-none absolute bottom-2 right-2 z-[1] flex h-7 w-7 items-center justify-center rounded-full"
      style={{ background: "rgba(0,0,0,0.55)" }}
      aria-hidden
    >
      <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
    </span>
  );
}

/**
 * Grid/home thumbnail: always a photo cover.
 * Video only loads when the product sheet opens.
 */
export function ProductThumbMedia({
  product,
  className = "h-full w-full object-contain",
}: {
  product: Product;
  className?: string;
}) {
  const src = productThumbSrc(product);
  const hasVideo = productThumbIsVideo(product);
  if (!src) return null;

  return (
    <div className="relative h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className={className} loading="lazy" decoding="async" />
      {hasVideo && <PlayBadge />}
    </div>
  );
}
