"use client";

import type { Product } from "@/lib/types";
import { productThumbIsVideo, productThumbSrc } from "@/lib/media";
import { hasVolumePricing, lowestTierUnitPrice } from "@/lib/pricing";
import { formatMoney } from "@/lib/utils";

export function ProductCard({
  product,
  busy,
  onEdit,
  onDelete,
}: {
  product: Product;
  busy?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const thumb = productThumbSrc(product);
  const hasThumb = Boolean(thumb);
  const isDraft = !product.price || product.images.length === 0;
  const isOutOfStock = product.qty <= 0;
  const visibleSizes = product.sizes.slice(0, 3);
  const extraSizes = product.sizes.length - visibleSizes.length;
  const visibleColors = product.colors.slice(0, 4);
  const extraColors = product.colors.length - visibleColors.length;

  function handleCardClick(e: React.MouseEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-card-action]")) return;
    onEdit();
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`Excluir "${product.name}"?`)) return;
    onDelete();
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className="group cursor-pointer rounded-[14px] border border-[rgba(201,168,76,0.14)] bg-[#122E23] p-3.5 transition hover:border-[rgba(201,168,76,0.28)] hover:bg-[#142f24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"
    >
      <div className="flex gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[12px] border border-[rgba(201,168,76,0.1)] bg-[#0F281F]">
          {productThumbIsVideo(product) ? (
            <video
              src={thumb}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
          ) : hasThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-[#1E3A2E] to-[#0A1F18] text-[#6B7A72]">
              <span className="text-lg leading-none">🖼</span>
              <span className="text-[9px] font-medium">Sem foto</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-[16px] font-semibold leading-tight text-white">
                {product.name}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {product.category && (
                  <span className="rounded-full border border-[#C9A84C44] bg-[#C9A84C18] px-2 py-0.5 text-[11px] font-medium text-[#C9A84C]">
                    {product.category}
                  </span>
                )}
                {isDraft && (
                  <span className="rounded-full border border-[#C9A84C33] bg-[#C9A84C12] px-2 py-0.5 text-[11px] font-medium text-[#C9A84C]">
                    Rascunho
                  </span>
                )}
                {isOutOfStock && (
                  <span className="rounded-full border border-[#ef444433] bg-[#ef444418] px-2 py-0.5 text-[11px] font-medium text-[#ef4444]">
                    Esgotado
                  </span>
                )}
                {hasVolumePricing(product) && lowestTierUnitPrice(product) != null && (
                  <span className="rounded-full border border-[#22c55e33] bg-[#22c55e18] px-2 py-0.5 text-[11px] font-medium text-[#22c55e]">
                    A partir de R$ {formatMoney(lowestTierUnitPrice(product)!)}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-[16px] font-bold leading-none text-[#C9A84C]">
                R$ {formatMoney(product.price)}
              </div>
              <div className="mt-1 text-[12px] font-medium text-[#A8B5AE]">
                {product.qty} un.
              </div>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {visibleSizes.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1">
                {visibleSizes.map((size) => (
                  <span
                    key={size}
                    className="rounded-md border border-[#1E3A2E] bg-[#0A1F18] px-1.5 py-0.5 text-[11px] font-medium text-[#A8B5AE]"
                  >
                    {size}
                  </span>
                ))}
                {extraSizes > 0 && (
                  <span className="text-[11px] text-[#6B7A72]">+{extraSizes}</span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-[#6B7A72]">Sem tamanhos</span>
            )}

            {visibleColors.length > 0 && (
              <div className="flex items-center gap-1">
                {visibleColors.map((color) => (
                  <span
                    key={color}
                    className="h-3.5 w-3.5 rounded-full border border-white/15"
                    style={{ background: color }}
                    title={color}
                  />
                ))}
                {extraColors > 0 && (
                  <span className="text-[11px] text-[#6B7A72]">+{extraColors}</span>
                )}
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-[11px] text-[#A8B5AE]">
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>📷</span>
                {product.images.length} foto{product.images.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1">
                <span aria-hidden>🎬</span>
                {product.videos.length} vídeo{product.videos.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <button
                type="button"
                data-card-action
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-9 rounded-[8px] border border-[#1E3A2E] px-3 text-[12px] font-medium text-[#A8B5AE] transition hover:border-[#C9A84C] hover:text-[#C9A84C]"
              >
                Editar
              </button>
              <button
                type="button"
                data-card-action
                disabled={busy}
                onClick={handleDelete}
                className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#ef4444] transition hover:bg-[#ef444418] disabled:opacity-50"
                aria-label={`Excluir ${product.name}`}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
