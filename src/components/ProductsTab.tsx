"use client";

import { useMemo, useRef, useState } from "react";
import { ProductCard } from "./ProductCard";
import { ProductForm } from "./ProductForm";
import { DEFAULT_CATEGORIES, DEFAULT_SIZES, PRODUCT_COLORS } from "@/lib/constants";
import {
  countProductsInCategory,
  duplicateProductDraft,
  mergeCatalogCategories,
  normalizeCategories,
} from "@/lib/categories";
import { reorder } from "@/lib/media";
import type { Product, ProductColorEntry } from "@/lib/types";

type ProductDraft = Omit<Product, "id"> & { id?: number };

export function ProductsTab({
  catalogId,
  products,
  storedCategories = [],
  onCategoriesChange,
  onRenameCategory,
  onSaveProduct,
  onDeleteProduct,
  onReorderProducts,
  customProductColors = [],
  stockControl = false,
  onRegisterCustomColor,
}: {
  catalogId: string;
  products: Product[];
  storedCategories?: string[];
  onCategoriesChange: (categories: string[]) => void;
  onRenameCategory: (from: string, to: string) => Promise<void>;
  onSaveProduct: (data: Omit<Product, "id"> & { id?: number }) => Promise<void>;
  onDeleteProduct: (productId: number) => Promise<void>;
  onReorderProducts: (ordered: Product[]) => Promise<void>;
  customProductColors?: ProductColorEntry[];
  stockControl?: boolean;
  onRegisterCustomColor?: (entry: ProductColorEntry) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [formKey, setFormKey] = useState("new");
  const [filter, setFilter] = useState("Todos");
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const formAnchorRef = useRef<HTMLDivElement>(null);

  const folders = useMemo(
    () => mergeCatalogCategories(storedCategories, products),
    [storedCategories, products],
  );

  const categoryOptions = useMemo(() => {
    return [...new Set([...folders, ...DEFAULT_CATEGORIES])].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  }, [folders]);

  const sizes = useMemo(() => {
    const extra = products.flatMap((p) => p.sizes).filter(Boolean);
    return [...new Set([...DEFAULT_SIZES, ...extra])];
  }, [products]);

  const colors = useMemo(() => {
    const defaults = PRODUCT_COLORS.map((c) => c.hex);
    const custom = customProductColors.map((c) => c.hex);
    const extra = products.flatMap((p) => p.colors).filter(Boolean);
    return [...new Set([...defaults, ...custom, ...extra])];
  }, [products, customProductColors]);

  const visible =
    filter === "Todos" ? products : products.filter((p) => p.category === filter);

  function openEditor(product: ProductDraft | null, key?: string) {
    setEditing(product);
    setFormKey(key ?? (product?.id != null ? `edit-${product.id}` : `new-${Date.now()}`));
    setShowForm(true);
    requestAnimationFrame(() => {
      formAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function saveProduct(data: Omit<Product, "id"> & { id?: number }) {
    setBusy(true);
    try {
      const category = data.category.trim();
      if (category && !folders.some((item) => item.toLowerCase() === category.toLowerCase())) {
        onCategoriesChange(normalizeCategories([...folders, category]));
      }
      await onSaveProduct(data);
      setShowForm(false);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  function dropOnProduct(targetId: number) {
    if (dragId === null || dragId === targetId) {
      setDragId(null);
      return;
    }
    const from = products.findIndex((p) => p.id === dragId);
    const to = products.findIndex((p) => p.id === targetId);
    setDragId(null);
    if (from < 0 || to < 0) return;
    void onReorderProducts(reorder(products, from, to));
  }

  function createCategory() {
    const name = newCategory.trim();
    setCategoryError(null);
    if (!name) {
      setCategoryError("Digite o nome da categoria.");
      return;
    }
    if (folders.some((item) => item.toLowerCase() === name.toLowerCase())) {
      setCategoryError("Essa categoria já existe.");
      return;
    }
    onCategoriesChange(normalizeCategories([...folders, name]));
    setNewCategory("");
    setFilter(name);
  }

  async function confirmRename(from: string) {
    const to = renameDraft.trim();
    setCategoryError(null);
    if (!to) {
      setCategoryError("Digite o novo nome.");
      return;
    }
    if (to.toLowerCase() !== from.toLowerCase() && folders.some((item) => item.toLowerCase() === to.toLowerCase())) {
      setCategoryError("Já existe uma categoria com esse nome.");
      return;
    }
    setBusy(true);
    try {
      await onRenameCategory(from, to);
      const nextFolders = folders.map((item) => (item === from ? to : item));
      onCategoriesChange(normalizeCategories(nextFolders));
      if (filter === from) setFilter(to);
      setRenaming(null);
      setRenameDraft("");
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Não foi possível renomear.");
    } finally {
      setBusy(false);
    }
  }

  function removeCategory(name: string) {
    setCategoryError(null);
    if (countProductsInCategory(products, name) > 0) {
      setCategoryError("Esvazie a categoria antes de apagar, ou mova as peças para outra pasta.");
      return;
    }
    if (!window.confirm(`Apagar a categoria "${name}"?`)) return;
    onCategoriesChange(folders.filter((item) => item !== name));
    if (filter === name) setFilter("Todos");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold">
            {products.length} produtos · {folders.length} categorias
          </h1>
          <p className="mt-1 text-[12px] text-[#A8B5AE]">
            Categoria = pasta do catálogo. Produto = peça dentro da pasta. Arraste ⋮⋮ para ordenar.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            openEditor(filter !== "Todos" ? { ...emptyDraft(), category: filter } : null)
          }
          className="h-11 rounded-[10px] bg-[#C9A84C] px-4 text-[13px] font-semibold text-black"
        >
          {filter !== "Todos" ? "+ Produto nesta categoria" : "+ Produto"}
        </button>
      </div>

      <section className="mt-5 rounded-[14px] border border-[#1E3A2E] bg-[#0A1F18] p-3">
        <div className="mb-2 text-[13px] font-semibold text-[#C9A84C]">Categorias</div>
        <p className="mb-3 text-[11px] leading-relaxed text-[#6B7A72]">
          Crie a pasta primeiro. Depois abra a categoria e adicione as peças dentro dela.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="field-input h-11 min-w-[180px] flex-1"
            placeholder="Ex.: Camisetas Premium"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createCategory();
              }
            }}
          />
          <button
            type="button"
            onClick={createCategory}
            className="h-11 rounded-[10px] border border-[#C9A84C] px-4 text-[13px] font-semibold text-[#C9A84C]"
          >
            + Criar categoria
          </button>
        </div>
        {categoryError && <p className="mt-2 text-[12px] text-[#ef4444]">{categoryError}</p>}
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <FilterPill
          active={filter === "Todos"}
          onClick={() => setFilter("Todos")}
          label={`Todos (${products.length})`}
        />
        {folders.map((c) => {
          const count = countProductsInCategory(products, c);
          const isRenaming = renaming === c;
          return (
            <div key={c} className="flex items-center gap-1">
              {isRenaming ? (
                <div className="flex flex-wrap items-center gap-1 rounded-full border border-[#C9A84C] bg-[#C9A84C18] px-2 py-1">
                  <input
                    className="h-8 w-36 rounded-[8px] border border-[#1E3A2E] bg-[#0A1F18] px-2 text-[12px] text-white"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void confirmRename(c);
                      }
                      if (e.key === "Escape") {
                        setRenaming(null);
                        setRenameDraft("");
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void confirmRename(c)}
                    className="h-8 rounded-[8px] px-2 text-[11px] font-semibold text-[#25D366]"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(null);
                      setRenameDraft("");
                    }}
                    className="h-8 rounded-[8px] px-2 text-[11px] text-[#A8B5AE]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <>
                  <FilterPill
                    active={filter === c}
                    onClick={() => setFilter(c)}
                    label={`${c} (${count})`}
                  />
                  <button
                    type="button"
                    title="Renomear categoria"
                    onClick={() => {
                      setRenaming(c);
                      setRenameDraft(c);
                      setCategoryError(null);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] text-[#6B7A72] hover:bg-[#0F281F] hover:text-[#C9A84C]"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    title="Apagar categoria vazia"
                    onClick={() => removeCategory(c)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] text-[#6B7A72] hover:bg-[#ef444418] hover:text-[#ef4444]"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {filter !== "Todos" && (
        <div className="mt-3 rounded-[12px] border border-[#1E3A2E] bg-[#0F281F] px-3 py-2 text-[12px] text-[#A8B5AE]">
          Pasta aberta: <span className="font-semibold text-[#C9A84C]">{filter}</span>
          {" · "}
          {countProductsInCategory(products, filter)} peça
          {countProductsInCategory(products, filter) === 1 ? "" : "s"}
        </div>
      )}

      <div ref={formAnchorRef} />

      {showForm && (
        <div className="mt-5">
          <ProductForm
            key={formKey}
            catalogId={catalogId}
            initial={editing}
            categories={categoryOptions}
            sizes={sizes}
            colors={colors}
            customProductColors={customProductColors}
            stockControl={stockControl}
            onRegisterCustomColor={onRegisterCustomColor}
            onCreateCategory={(name) => {
              onCategoriesChange(normalizeCategories([...folders, name]));
            }}
            onSave={saveProduct}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      <div className="mt-5 space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#1E3A2E] bg-[#0A1F18] px-4 py-8 text-center">
            <p className="text-[14px] text-[#A8B5AE]">
              {filter === "Todos"
                ? "Nenhuma peça ainda. Crie uma categoria e adicione o primeiro produto."
                : "Esta categoria está vazia. Adicione a primeira peça nela."}
            </p>
            <button
              type="button"
              onClick={() =>
                openEditor(filter !== "Todos" ? { ...emptyDraft(), category: filter } : null)
              }
              className="mt-4 h-11 rounded-[10px] bg-[#C9A84C] px-4 text-[13px] font-semibold text-black"
            >
              {filter !== "Todos" ? "+ Produto nesta categoria" : "+ Produto"}
            </button>
          </div>
        ) : (
          visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              stockControl={stockControl}
              busy={busy}
              selected={editing?.id === product.id && showForm}
              dragging={dragId === product.id}
              onDragStart={() => setDragId(product.id)}
              onDragEnd={() => setDragId(null)}
              onDropOn={() => dropOnProduct(product.id)}
              onEdit={() => openEditor(product)}
              onDuplicate={() => openEditor(duplicateProductDraft(product), `dup-${product.id}-${Date.now()}`)}
              onDelete={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await onDeleteProduct(product.id);
                    if (editing?.id === product.id) {
                      setShowForm(false);
                      setEditing(null);
                    }
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}

function emptyDraft(): ProductDraft {
  return {
    name: "",
    category: "",
    qty: 0,
    sizes: [],
    price: "",
    colors: [],
    images: [],
    videos: [],
    description: "",
  };
}

function FilterPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-11 rounded-full px-4 text-[13px] transition hover:border-[#C9A84C] hover:text-[#C9A84C]"
      style={{
        background: active ? "#C9A84C22" : "#0F281F",
        color: active ? "#C9A84C" : "#A8B5AE",
        border: active ? "1px solid #C9A84C" : "1px solid #1E3A2E",
      }}
    >
      {label}
    </button>
  );
}
