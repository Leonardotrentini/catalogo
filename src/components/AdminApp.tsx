"use client";

import { useState } from "react";
import { BrandTab } from "./BrandTab";
import { PreviewTab } from "./PreviewTab";
import { ProductsTab } from "./ProductsTab";
import { TopBar } from "./TopBar";
import { DEFAULT_BRAND, DEFAULT_COLORS, demoProducts } from "@/lib/constants";
import type { AdminTab, Brand, BrandColors, Product } from "@/lib/types";
import { toSlug } from "@/lib/utils";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "marca", label: "Marca" },
  { id: "produtos", label: "Produtos" },
  { id: "preview", label: "Preview" },
];

export function AdminApp() {
  const [tab, setTab] = useState<AdminTab>("marca");
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [colors, setColors] = useState<BrandColors>(DEFAULT_COLORS);
  const [products, setProducts] = useState<Product[]>(demoProducts);
  const [toast, setToast] = useState<string | null>(null);
  const slug = toSlug(brand.name);

  function publish() {
    setToast(`✓ Catálogo publicado em ${slug}.vestocatalogo.com`);
    window.setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white">
      <TopBar slug={slug} onPublish={publish} />

      {toast && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-[12px] bg-[#25D366] px-4 py-3 text-[14px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="pt-[72px]">
        <nav className="sticky top-[69px] z-30 border-b border-[rgba(255,255,255,0.06)] bg-[#0a0a0c]">
          <div className="mx-auto flex max-w-[680px] px-6">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className="h-12 min-w-11 px-4 text-[14px] font-medium"
                  style={{
                    color: active ? "#ffffff" : "#555555",
                    borderBottom: active ? "2px solid #C9A84C" : "2px solid transparent",
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        <main className="mx-auto max-w-[680px] px-6 py-7">
          {tab === "marca" && (
            <BrandTab brand={brand} setBrand={setBrand} colors={colors} setColors={setColors} />
          )}
          {tab === "produtos" && (
            <ProductsTab products={products} setProducts={setProducts} />
          )}
          {tab === "preview" && (
            <PreviewTab brand={brand} colors={colors} setColors={setColors} products={products} />
          )}
        </main>
      </div>
    </div>
  );
}
