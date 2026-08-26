"use client";

import { useMemo, useState } from "react";
import { ProductForm } from "./ProductForm";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import type { Product } from "@/lib/types";
import { formatMoney } from "@/lib/utils";
import { productThumbIsVideo, productThumbSrc } from "@/lib/media";

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
            onSave={saveProduct}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      <div className="mt-5 space-y-2">
        {visible.map((product) => (
          <article
            key={product.id}
            className="flex items-center gap-3 rounded-[14px] border border-[rgba(201,168,76,0.14)] bg-[#122E23] p-3"
          >
            <div className="h-[52px] w-[52px] shrink-0 overflow-hidden rounded-[10px] bg-[#0F281F]">
              {productThumbIsVideo(product) ? (
                <video src={productThumbSrc(product)} className="h-full w-full object-cover" muted playsInline />
              ) : productThumbSrc(product) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={productThumbSrc(product)} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#1E3A2E] to-[#0A1F18]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold">{product.name}</div>
              <div className="truncate text-[12px] text-[#999]">
                {product.category} · {product.qty} · {product.sizes.join(", ") || "—"} · R${" "}
                {formatMoney(product.price)}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {product.colors.slice(0, 5).map((c) => (
                    <span
                      key={c}
                      className="h-3 w-3 rounded-full border border-white/10"
                      style={{ background: c }}
                    />
                  ))}
                  {product.colors.length > 5 && (
                    <span className="text-[11px] text-[#999]">+{product.colors.length - 5}</span>
                  )}
                </div>
                <span className="text-[11px] text-[#555]">
                  {product.images.length} fotos · {product.videos.length} vídeos
                </span>
              </div>
            </div>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[#999] transition hover:bg-white/5 hover:text-white"
              onClick={() => {
                setEditing(product);
                setShowForm(true);
              }}
              aria-label="Editar"
            >
              ✎
            </button>
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[#ef4444] transition hover:bg-white/5 disabled:opacity-50"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  try {
                    await onDeleteProduct(product.id);
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
              aria-label="Excluir"
            >
              ✕
            </button>
          </article>
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
