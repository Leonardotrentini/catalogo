"use client";

import { useEffect, useRef, type RefObject } from "react";
import { productThumbIsVideo, productThumbPoster, productThumbSrc } from "@/lib/media";
import type { Product } from "@/lib/types";

function useVideoCoverFrame(videoRef: RefObject<HTMLVideoElement | null>, src: string) {
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !src) return;

    const showFrame = () => {
      if (el.readyState < 2) return;
      try {
        el.currentTime = 0.01;
      } catch {
        /* seek may fail before metadata is ready */
      }
    };

    el.load();
    el.addEventListener("loadeddata", showFrame);
    showFrame();
    return () => el.removeEventListener("loadeddata", showFrame);
  }, [src, videoRef]);
}

export function VideoCoverThumb({
  src,
  poster,
  className = "h-full w-full object-contain",
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useVideoCoverFrame(videoRef, src);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster || undefined}
      className={className}
      muted
      playsInline
      autoPlay
      loop
      preload="auto"
    />
  );
}

export function ProductThumbMedia({
  product,
  className = "h-full w-full object-contain",
}: {
  product: Product;
  className?: string;
}) {
  const src = productThumbSrc(product);
  if (!src) return null;

  if (productThumbIsVideo(product)) {
    return <VideoCoverThumb src={src} poster={productThumbPoster(product)} className={className} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} />;
}
