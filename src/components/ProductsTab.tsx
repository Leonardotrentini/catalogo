"use client";

import { useMemo, useState } from "react";
import { ProductCard } from "./ProductCard";
import { ProductForm } from "./ProductForm";
import { DEFAULT_CATEGORIES, DEFAULT_SIZES, PRODUCT_COLORS } from "@/lib/constants";
import type { Product } from "@/lib/types";

export function ProductsTab({
  products,
  onSaveProduct,
  onDeleteProduct,
}: {
  products: Product[];
  onSaveProduct: (data: Omit<Product, "id"> & { id?: number }) => Promise<void>;
  onDeleteProduct: (productId: number) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [filter, setFilter] = useState("Todos");
  const [busy, setBusy] = useState(false);

  const categories = useMemo(() => {
    const extra = products.map((p) => p.category).filter(Boolean);
    return [...new Set([...DEFAULT_CATEGORIES, ...extra])];
  }, [products]);

  const sizes = useMemo(() => {
    const extra = products.flatMap((p) => p.sizes).filter(Boolean);
    return [...new Set([...DEFAULT_SIZES, ...extra])];
  }, [products]);

  const colors = useMemo(() => {
    const defaults = PRODUCT_COLORS.map((c) => c.hex);
    const extra = products.flatMap((p) => p.colors).filter(Boolean);
    return [...new Set([...defaults, ...extra])];
  }, [products]);

  const usedCategories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))],
    [products],
  );

  const visible =
    filter === "Todos" ? products : products.filter((p) => p.category === filter);

  async function saveProduct(data: Omit<Product, "id"> & { id?: number }) {
    setBusy(true);
    try {
      await onSaveProduct(data);
      setShowForm(false);
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold">
            {products.length} produtos · {usedCategories.length} categorias
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="h-11 rounded-[10px] bg-[#C9A84C] px-4 text-[13px] font-semibold text-black"
        >
          + Produto
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <FilterPill
          active={filter === "Todos"}
          onClick={() => setFilter("Todos")}
          label={`Todos (${products.length})`}
        />
        {usedCategories.map((c) => (
          <FilterPill
            key={c}
            active={filter === c}
            onClick={() => setFilter(c)}
            label={`${c} (${products.filter((p) => p.category === c).length})`}
          />
        ))}
      </div>

      {showForm && (
        <div className="mt-5">
          <ProductForm
            initial={editing}
            categories={categories}
            sizes={sizes}
            colors={colors}
            onSave={saveProduct}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      <div className="mt-5 space-y-3">
        {visible.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            busy={busy}
            onEdit={() => {
              setEditing(product);
              setShowForm(true);
            }}
            onDelete={() => {
              void (async () => {
                setBusy(true);
                try {
                  await onDeleteProduct(product.id);
                } finally {
                  setBusy(false);
                }
              })();
            }}
          />
        ))}
      </div>
    </div>
  );
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
