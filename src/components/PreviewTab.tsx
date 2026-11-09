"use client";

import type { Dispatch, SetStateAction } from "react";
import { CatalogPreview } from "./catalog/CatalogPreview";
import type { Brand, CatalogColors, Product, ProductColorEntry } from "@/lib/types";

export function PreviewTab({
  brand,
  colors,
  setColors,
  products,
  customProductColors = [],
}: {
  brand: Brand;
  colors: CatalogColors;
  setColors: Dispatch<SetStateAction<CatalogColors>>;
  products: Product[];
  customProductColors?: ProductColorEntry[];
}) {
  return (
    <div>
      <h1 className="mb-4 text-[18px] font-bold">Preview</h1>
      <CatalogPreview
        brand={brand}
        colors={colors}
        setColors={setColors}
        products={products}
        customProductColors={customProductColors}
      />
    </div>
  );
}
