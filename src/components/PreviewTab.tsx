"use client";

import type { Dispatch, SetStateAction } from "react";
import { CatalogPreview } from "./catalog/CatalogPreview";
import type { Brand, BrandColors, Product } from "@/lib/types";

export function PreviewTab({
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
  return (
    <div>
      <h1 className="mb-4 text-[18px] font-bold">Preview</h1>
      <CatalogPreview brand={brand} colors={colors} setColors={setColors} products={products} />
    </div>
  );
}
