"use client";

import { useEffect, useRef, useState } from "react";
import { BrandTab } from "./BrandTab";
import { PreviewTab } from "./PreviewTab";
import { ProductsTab } from "./ProductsTab";
import { TopBar } from "./TopBar";
import { DEFAULT_BRAND, DEFAULT_COLORS } from "@/lib/constants";
import type { AdminTab, Brand, BrandColors, Product } from "@/lib/types";
import {
  deleteProduct,
  loadCatalog,
  publishCatalog,
  saveBrandAndColors,
  upsertProduct,
} from "@/lib/supabase/catalog";
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
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);
  const skipBrandSave = useRef(true);
  const slug = toSlug(brand.name);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const data = await loadCatalog();
        if (cancelled) return;
        skipBrandSave.current = true;
        setCatalogId(data.catalogId);
        setBrand(data.brand);
        setColors(data.colors);
        setProducts(data.products);
        setLoadError(null);
        hydrated.current = true;
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Falha ao conectar no Supabase";
        setLoadError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current || !catalogId) return;
    if (skipBrandSave.current) {
      skipBrandSave.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setSaving(true);
          await saveBrandAndColors(catalogId, brand, colors);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro ao salvar marca";
          setToast(`✗ ${message}`);
          window.setTimeout(() => setToast(null), 4000);
        } finally {
          setSaving(false);
        }
      })();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [brand, colors, catalogId]);

  async function publish() {
    if (!catalogId) return;
    try {
      await publishCatalog(catalogId, slug || "default");
      setToast(`✓ Catálogo publicado em ${slug || "loja"}.vestocatalogo.com`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao publicar";
      setToast(`✗ ${message}`);
    }
    window.setTimeout(() => setToast(null), 4000);
  }

  async function handleSaveProduct(data: Omit<Product, "id"> & { id?: number }) {
    if (!catalogId) return;
    const saved = await upsertProduct(catalogId, data, products.length);
    setProducts((prev) => {
      if (data.id) return prev.map((p) => (p.id === data.id ? saved : p));
      return [...prev, saved];
    });
  }

  async function handleDeleteProduct(productId: number) {
    if (!catalogId) return;
    await deleteProduct(catalogId, productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1F18] text-[#A8B5AE]">
        Carregando catálogo…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0A1F18] px-6 text-center text-white">
        <p className="text-[16px] font-semibold text-[#ef4444]">Não foi possível conectar ao Supabase</p>
        <p className="max-w-md text-[13px] text-[#A8B5AE]">{loadError}</p>
        <p className="max-w-md text-[12px] text-[#6B7A72]">
          Confirme se as tabelas foram criadas (rode o SQL em <code className="text-[#C9A84C]">supabase/schema.sql</code>{" "}
          no SQL Editor do Supabase).
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1F18] text-white">
      <TopBar slug={slug} onPublish={publish} />

      {toast && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-[12px] bg-[#25D366] px-4 py-3 text-[14px] font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 z-50 rounded-[10px] border border-[rgba(201,168,76,0.3)] bg-[#122E23] px-3 py-2 text-[12px] text-[#C9A84C]">
          Salvando…
        </div>
      )}

      <div className="pt-[76px]">
        <nav className="sticky top-[73px] z-30 border-b border-[rgba(201,168,76,0.14)] bg-[#0A1F18]/95 backdrop-blur-md">
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
                    color: active ? "#ffffff" : "#6B7A72",
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
            <ProductsTab
              products={products}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
            />
          )}
          {tab === "preview" && (
            <PreviewTab brand={brand} colors={colors} setColors={setColors} products={products} />
          )}
        </main>
      </div>
    </div>
  );
}
