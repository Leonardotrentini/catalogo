"use client";

import { useEffect, useRef, useState } from "react";
import { BrandTab } from "./BrandTab";
import { CouponsTab } from "./CouponsTab";
import { IntegrationsTab } from "./IntegrationsTab";
import { PreviewTab } from "./PreviewTab";
import { ProductsTab } from "./ProductsTab";
import { TopBar } from "./TopBar";
import { DEFAULT_BRAND, DEFAULT_COLORS } from "@/lib/constants";
import type { AdminTab, Brand, BrandColors, Product, ProductColorEntry } from "@/lib/types";
import { normalizeHex } from "@/lib/utils";
import {
  deleteProduct,
  loadCatalog,
  publishCatalog,
  saveBrandAndColors,
  reorderProducts,
  upsertProduct,
} from "@/lib/supabase/catalog";
import { catalogPublicUrl } from "@/lib/hosts";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "marca", label: "Marca" },
  { id: "produtos", label: "Produtos" },
  { id: "cupons", label: "Cupons" },
  { id: "integracoes", label: "Integrações" },
  { id: "preview", label: "Preview" },
];

export function AdminApp({
  catalogSlug,
  userEmail,
  isSuperAdmin,
  onLogout,
  onOpenSuperAdmin,
}: {
  catalogSlug: string;
  userEmail: string;
  isSuperAdmin: boolean;
  onLogout: () => void;
  onOpenSuperAdmin: () => void;
}) {
  const [tab, setTab] = useState<AdminTab>("marca");
  const [activeSlug, setActiveSlug] = useState(catalogSlug);
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [colors, setColors] = useState<BrandColors>(DEFAULT_COLORS);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);
  const hydrated = useRef(false);
  const skipBrandSave = useRef(true);

  useEffect(() => {
    setActiveSlug(catalogSlug);
  }, [catalogSlug]);

  function handleCatalogSlugSaved(nextSlug: string) {
    const url = isSuperAdmin
      ? `/admin?slug=${encodeURIComponent(nextSlug)}`
      : "/admin";
    window.location.assign(url);
  }

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), type === "error" ? 6000 : 4000);
  }

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const data = await loadCatalog(activeSlug, {
          createIfMissing: !isSuperAdmin,
          ownerId: user?.id,
        });
        if (cancelled) return;
        skipBrandSave.current = true;
        setCatalogId(data.catalogId);
        setIsPublished(data.isPublished);
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
  }, [activeSlug, isSuperAdmin]);

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
          showToast(`✗ ${message}`, "error");
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
      await publishCatalog(catalogId, activeSlug);
      setIsPublished(true);
      showToast(`✓ Catálogo publicado em ${catalogPublicUrl(activeSlug)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao publicar";
      showToast(`✗ ${message}`, "error");
    }
  }

  async function handleSaveProduct(data: Omit<Product, "id"> & { id?: number }) {
    if (!catalogId) throw new Error("Catálogo não carregado.");
    try {
      const saved = await upsertProduct(
        catalogId,
        data,
        data.id ? undefined : products.length,
      );
      setProducts((prev) => {
        if (data.id) return prev.map((p) => (p.id === data.id ? saved : p));
        return [...prev, saved];
      });
      showToast("✓ Produto salvo com sucesso!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao salvar produto";
      showToast(`✗ ${message}`, "error");
      throw err;
    }
  }

  async function handleDeleteProduct(productId: number) {
    if (!catalogId) return;
    try {
      await deleteProduct(catalogId, productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast("✓ Produto removido.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao excluir produto";
      showToast(`✗ ${message}`, "error");
      throw err;
    }
  }

  async function handleReorderProducts(ordered: Product[]) {
    if (!catalogId) return;
    const previous = products;
    setProducts(ordered);
    try {
      await reorderProducts(
        catalogId,
        ordered.map((p) => p.id),
      );
    } catch (err) {
      setProducts(previous);
      const message = err instanceof Error ? err.message : "Erro ao reordenar";
      showToast(`✗ ${message}`, "error");
    }
  }

  function registerCustomColor(entry: ProductColorEntry) {
    const norm = normalizeHex(entry.hex);
    setBrand((prev) => {
      const list = prev.customProductColors ?? [];
      const exists = list.some((c) => normalizeHex(c.hex) === norm);
      const customProductColors = exists
        ? list.map((c) => (normalizeHex(c.hex) === norm ? { name: entry.name.trim(), hex: norm } : c))
        : [...list, { name: entry.name.trim(), hex: norm }];
      return { ...prev, customProductColors };
    });
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
      <div className="sticky top-0 z-40">
        <TopBar
          slug={activeSlug}
          isPublished={isPublished}
          userEmail={userEmail}
          isSuperAdmin={isSuperAdmin}
          onPublish={publish}
          onLogout={onLogout}
          onOpenSuperAdmin={onOpenSuperAdmin}
        />

        <nav className="border-b border-[rgba(201,168,76,0.1)] bg-[#0A1F18]/95 px-4 py-3 backdrop-blur-md">
          <div className="mx-auto flex max-w-[680px] justify-center">
            <div
              className="inline-flex items-center gap-1 rounded-full border border-[rgba(201,168,76,0.2)] bg-[#0F281F] p-1"
              role="tablist"
              aria-label="Seções do painel"
            >
              {TABS.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className="h-10 min-w-[84px] rounded-full px-4 text-[13px] font-semibold tracking-wide transition"
                    style={{
                      color: active ? "#0A1F18" : "#A8B5AE",
                      background: active ? "#C9A84C" : "transparent",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 top-4 z-50 max-w-[90vw] -translate-x-1/2 rounded-[12px] px-4 py-3 text-[14px] font-semibold text-white shadow-lg"
          style={{ background: toast.type === "error" ? "#dc2626" : "#25D366" }}
        >
          {toast.message}
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 z-50 rounded-[10px] border border-[rgba(201,168,76,0.3)] bg-[#122E23] px-3 py-2 text-[12px] text-[#C9A84C]">
          Salvando…
        </div>
      )}

      <main className="mx-auto max-w-[680px] px-6 py-7">
          {tab === "marca" && catalogId && (
            <BrandTab
              brand={brand}
              setBrand={setBrand}
              colors={colors}
              setColors={setColors}
              catalogId={catalogId}
              catalogSlug={activeSlug}
              onCatalogSlugSaved={handleCatalogSlugSaved}
            />
          )}
          {tab === "produtos" && catalogId && (
            <ProductsTab
              catalogId={catalogId}
              products={products}
              storedCategories={brand.categories ?? []}
              onCategoriesChange={(categories) => setBrand((prev) => ({ ...prev, categories }))}
              onRenameCategory={async (from, to) => {
                const targets = products.filter((product) => product.category === from);
                for (const product of targets) {
                  const saved = await upsertProduct(catalogId, { ...product, category: to });
                  setProducts((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
                }
              }}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onReorderProducts={handleReorderProducts}
              customProductColors={brand.customProductColors ?? []}
              stockControl={brand.stockControl === true}
              onRegisterCustomColor={registerCustomColor}
            />
          )}
          {tab === "preview" && (
            <PreviewTab
              brand={brand}
              colors={colors}
              setColors={setColors}
              products={products}
              customProductColors={brand.customProductColors ?? []}
            />
          )}
          {tab === "cupons" && catalogId && <CouponsTab catalogId={catalogId} />}
          {tab === "integracoes" && <IntegrationsTab />}
      </main>
    </div>
  );
}
