"use client";

import { useEffect, useRef, useState } from "react";
import { CategorySelect } from "./CategorySelect";
import { ColorSelect } from "./ColorSelect";
import { SizeSelect } from "./SizeSelect";
import {
  applyMediaSlotOrder,
  buildMediaSlots,
  moveVideoToStart,
  nextMediaOrder,
  normalizeImages,
  normalizeProductMedia,
  reorder,
  type MediaSlot,
} from "@/lib/media";
import {
  PRODUCT_PHOTO_GUIDE,
  PRODUCT_VIDEO_GUIDE,
  getImageDimensions,
  productPhotoUploadTip,
} from "@/lib/mediaGuide";
import type { Product, ProductImage, StockLine, VideoItem, VolumeDiscount, ProductColorEntry } from "@/lib/types";
import { stockTotal, syncStockGrid } from "@/lib/stock";
import { normalizeVolumeDiscounts } from "@/lib/pricing";
import { prepareProductMediaForSave, uploadImageFile } from "@/lib/mediaUpload";
import { colorNameFromHex, parsePrice } from "@/lib/utils";
import { getYoutubeThumbnailUrl, normalizeYoutubeUrl } from "@/lib/youtube";

const emptyForm = {
  name: "",
  category: "",
  qty: 0,
  sizes: [] as string[],
  price: "",
  colors: [] as string[],
  images: [] as ProductImage[],
  videos: [] as VideoItem[],
  description: "",
  coverType: undefined as "video" | "image" | undefined,
  volumeDiscounts: [] as VolumeDiscount[],
  stock: undefined as StockLine[] | undefined,
};

export function ProductForm({
  catalogId,
  initial,
  categories,
  sizes,
  colors: colorOptions,
  customProductColors = [],
  stockControl = false,
  onRegisterCustomColor,
  onCreateCategory,
  onSave,
  onCancel,
}: {
  catalogId: string;
  initial: (Omit<Product, "id"> & { id?: number }) | null;
  categories: string[];
  sizes: string[];
  colors: string[];
  customProductColors?: ProductColorEntry[];
  stockControl?: boolean;
  onRegisterCustomColor?: (entry: ProductColorEntry) => void;
  onCreateCategory?: (name: string) => void;
  onSave: (product: Omit<Product, "id"> & { id?: number }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(() => {
    if (!initial) return emptyForm;
    const media = normalizeProductMedia(initial);
    return {
      name: initial.name,
      category: initial.category,
      qty: initial.qty,
      sizes: [...initial.sizes],
      price: initial.price,
      colors: initial.colors,
      images: media.images,
      videos: media.videos,
      description: initial.description,
      coverType: media.coverType,
      volumeDiscounts: normalizeVolumeDiscounts(initial.volumeDiscounts, initial.price),
      stock: initial.stock
        ? syncStockGrid(initial.stock, initial.colors, initial.sizes)
        : undefined,
    };
  });
  const [stockOn, setStockOn] = useState(() => stockControl && Array.isArray(initial?.stock));
  const [videoLink, setVideoLink] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [dragSlot, setDragSlot] = useState<number | null>(null);
  const [mediaTip, setMediaTip] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [saveProgress, setSaveProgress] = useState<string | null>(null);
  const [normalPriceConfirmed, setNormalPriceConfirmed] = useState(() =>
    Boolean(initial?.price?.trim() && parsePrice(initial.price) > 0),
  );
  const photoRef = useRef<HTMLInputElement>(null);
  const canSave = Boolean(form.name.trim() && form.category.trim());
  const colorLabel = (hex: string) => colorNameFromHex(hex, customProductColors);
  const mediaSlots = buildMediaSlots(form);
  const firstImageSlot = mediaSlots.find((slot) => slot.kind === "image");
  const linkPreview = videoLink.trim() ? getYoutubeThumbnailUrl(videoLink.trim()) : null;

  function setColors(next: string[]) {
    setForm((prev) => ({
      ...prev,
      colors: next,
      stock: syncStockGrid(prev.stock, next, prev.sizes),
      images: prev.images.map((img) =>
        img.color && !next.some((c) => c.toLowerCase() === img.color?.toLowerCase())
          ? { ...img, color: undefined }
          : img,
      ),
    }));
  }

  function setLineQty(color: string, size: string, qty: number) {
    const nextQty = Math.max(0, Math.floor(qty) || 0);
    setStockOn(true);
    setForm((prev) => ({
      ...prev,
      stock: syncStockGrid(prev.stock, prev.colors, prev.sizes).map((line) =>
        line.color.toLowerCase() === color.toLowerCase() && line.size === size
          ? { ...line, qty: nextQty }
          : line,
      ),
    }));
  }

  async function addPhotos(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploadingMedia(true);
    setSaveError(null);
    const tips: string[] = [];
    try {
      const added: ProductImage[] = [];
      const failed: string[] = [];
      for (const file of files) {
        try {
          const { width, height } = await getImageDimensions(file);
          const tip = productPhotoUploadTip(width, height);
          if (tip) tips.push(tip);
        } catch {
          // ignore dimension read errors
        }
        try {
          const url = await uploadImageFile(catalogId, file);
          added.push({ src: url });
        } catch (err) {
          failed.push(file.name);
          if (added.length === 0 && files.length === 1) {
            throw err;
          }
        }
      }
      if (added.length > 0) {
        setForm((prev) => {
          let order = nextMediaOrder(prev.images, prev.videos);
          const images = [
            ...prev.images,
            ...added.map((img) => {
              const withOrder = { ...img, order };
              order += 1;
              return withOrder;
            }),
          ];
          const slots = buildMediaSlots({ ...prev, images });
          return {
            ...prev,
            ...applyMediaSlotOrder(images, prev.videos, slots),
          };
        });
        setMediaTip(tips[0] ?? null);
      }
      if (failed.length > 0) {
        setSaveError(
          `${added.length} foto(s) enviada(s). Falha em ${failed.length}: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}.`,
        );
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Falha ao enviar imagem.");
    } finally {
      setUploadingMedia(false);
    }
  }

  function addVideoLink(raw?: string): boolean {
    const src = (raw ?? videoLink).trim();
    if (!src) return false;
    const normalized = normalizeYoutubeUrl(src);
    if (!normalized) {
      setSaveError("Cole um link válido do YouTube ou Shorts (youtube.com/shorts/...).");
      return false;
    }
    const already = form.videos.some(
      (v) => normalizeYoutubeUrl(v.src) === normalized || v.src === normalized,
    );
    if (already) {
      setVideoLink("");
      setSaveError(null);
      return true;
    }
    setSaveError(null);
    setForm((prev) => {
      const videos = [
        ...prev.videos,
        { type: "link" as const, src: normalized, name: "YouTube" },
      ];
      // New YouTube opens the product (position 0); CAPA stays the first photo.
      const applied = moveVideoToStart(prev.images, videos, videos.length - 1);
      return { ...prev, ...applied };
    });
    setVideoLink("");
    return true;
  }

  function reorderSlots(from: number, to: number) {
    if (from === to) return;
    setForm((prev) => {
      const slots = reorder(buildMediaSlots(prev), from, to);
      return { ...prev, ...applyMediaSlotOrder(prev.images, prev.videos, slots) };
    });
  }

  function putVideoFirst(videoIndex: number) {
    setForm((prev) => ({
      ...prev,
      ...moveVideoToStart(prev.images, prev.videos, videoIndex),
    }));
  }

  function removeSlot(slot: MediaSlot) {
    setForm((prev) => {
      const images =
        slot.kind === "image" ? prev.images.filter((_, idx) => idx !== slot.index) : prev.images;
      const videos =
        slot.kind === "video" ? prev.videos.filter((_, idx) => idx !== slot.index) : prev.videos;
      const slots = buildMediaSlots({ images, videos, coverType: prev.coverType });
      return { ...prev, ...applyMediaSlotOrder(images, videos, slots) };
    });
    if (slot.kind === "image") setSelectedPhoto(null);
  }

  async function handleSave() {
    if (!canSave) {
      setSaveError("Preencha o nome e a categoria do produto.");
      return;
    }

    let images = form.images;
    let videos = form.videos;
    let coverType = form.coverType;

    const pending = videoLink.trim();
    if (pending) {
      const normalized = normalizeYoutubeUrl(pending);
      if (!normalized) {
        setSaveError("Cole um link válido do YouTube ou Shorts antes de salvar.");
        return;
      }
      const already = videos.some(
        (v) => normalizeYoutubeUrl(v.src) === normalized || v.src === normalized,
      );
      if (!already) {
        videos = [...videos, { type: "link", src: normalized, name: "YouTube" }];
        const applied = moveVideoToStart(images, videos, videos.length - 1);
        images = applied.images;
        videos = applied.videos;
        coverType = applied.coverType;
        setForm((prev) => ({ ...prev, ...applied }));
        setVideoLink("");
      }
    }

    setSaving(true);
    setSaveError(null);
    setSaveProgress(null);
    try {
      // Always stamp order from the visual gallery — source of truth for Preview.
      const ordered = normalizeProductMedia({ images, videos, coverType });
      const media = await prepareProductMediaForSave(
        catalogId,
        ordered.images,
        ordered.videos,
        setSaveProgress,
      );
      const matrix =
        stockControl && stockOn && (form.sizes.length > 0 || form.colors.length > 0)
          ? syncStockGrid(form.stock, form.colors, form.sizes)
          : undefined;
      await onSave({
        id: initial?.id,
        name: form.name.trim(),
        category: form.category.trim(),
        qty: matrix ? stockTotal(matrix) : form.qty,
        stock: stockControl ? matrix : initial?.stock,
        sizes: form.sizes,
        price: form.price,
        colors: form.colors,
        images: media.images,
        videos: media.videos,
        description: form.description,
        volumeDiscounts: normalizeVolumeDiscounts(form.volumeDiscounts, form.price),
        coverType: ordered.coverType,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erro ao salvar produto.");
    } finally {
      setSaving(false);
      setSaveProgress(null);
    }
  }

  return (
    <div className="rounded-[14px] border border-[rgba(201,168,76,0.14)] bg-[#0F281F] p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="field-label">Nome</span>
          <input
            className="field-input"
            placeholder="Ex: Camiseta Oversized"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="field-label">Em estoque</span>
          {stockControl && stockOn && (form.sizes.length > 0 || form.colors.length > 0) ? (
            <div className="field-input flex items-center text-[#A8B5AE]">
              {stockTotal(syncStockGrid(form.stock, form.colors, form.sizes))} no total
            </div>
          ) : (
            <input
              className="field-input"
              type="number"
              min={0}
              value={form.qty}
              onChange={(e) => setForm((prev) => ({ ...prev, qty: Number(e.target.value) }))}
            />
          )}
        </label>
        <label className="block">
          <span className="field-label">Valor (R$)</span>
          <div className="flex flex-wrap gap-2">
            <input
              className="field-input min-w-0 flex-1"
              placeholder="30.00"
              value={form.price}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, price: e.target.value }));
                setNormalPriceConfirmed(false);
              }}
            />
            {!normalPriceConfirmed && (
              <button
                type="button"
                disabled={parsePrice(form.price) <= 0}
                onClick={() => setNormalPriceConfirmed(true)}
                className="h-11 shrink-0 rounded-[8px] border border-[#C9A84C] px-4 text-[12px] font-semibold text-[#C9A84C] disabled:opacity-40"
              >
                Confirmar valor
              </button>
            )}
          </div>
          {normalPriceConfirmed ? (
            <p className="mt-1.5 text-[11px] font-medium text-[#25D366]">
              Valor normal confirmado: R$ {form.price}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-[#6B7A72]">
              Confirme o valor normal antes de configurar o desconto progressivo.
            </p>
          )}
        </label>
      </div>

      {normalPriceConfirmed && (
      <div className="mt-4 rounded-[12px] border border-[#1E3A2E] bg-[#0A1F18] p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="field-label mb-0">Desconto progressivo</div>
            <p className="mt-1 text-[11px] text-[#6B7A72]">
              A partir de X peças, defina o novo valor por unidade.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                volumeDiscounts: [...prev.volumeDiscounts, { minQty: 5, unitPrice: "" }],
              }))
            }
            className="h-9 shrink-0 rounded-[8px] border border-[#C9A84C] px-3 text-[12px] font-semibold text-[#C9A84C]"
          >
            + Faixa
          </button>
        </div>

        {form.volumeDiscounts.length === 0 ? (
          <p className="text-[12px] text-[#6B7A72]">Nenhuma faixa configurada.</p>
        ) : (
          <div className="space-y-3">
            {form.volumeDiscounts.map((tier, index) => (
              <div
                key={`${tier.minQty}-${index}`}
                className="rounded-[10px] border border-[#1E3A2E] bg-[#0F281F] p-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-[#A8B5AE]">A partir de</span>
                  <TierQtyInput
                    key={`tier-qty-${index}`}
                    value={tier.minQty}
                    onChange={(minQty) =>
                      setForm((prev) => ({
                        ...prev,
                        volumeDiscounts: prev.volumeDiscounts.map((row, i) =>
                          i === index ? { ...row, minQty } : row,
                        ),
                      }))
                    }
                  />
                  <span className="text-[12px] text-[#A8B5AE]">peças</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        volumeDiscounts: prev.volumeDiscounts.filter((_, i) => i !== index),
                      }))
                    }
                    className="ml-auto flex h-9 w-9 items-center justify-center text-[#ef4444]"
                    aria-label="Remover faixa"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-[#A8B5AE]">peças → R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="field-input h-10 w-28 py-2 text-[13px]"
                    placeholder={form.price || "25,50"}
                    value={tier.unitPrice}
                    onChange={(e) => {
                      setForm((prev) => ({
                        ...prev,
                        volumeDiscounts: prev.volumeDiscounts.map((row, i) =>
                          i === index ? { ...row, unitPrice: e.target.value } : row,
                        ),
                      }));
                    }}
                  />
                  <span className="text-[11px] text-[#6B7A72]">/ unidade</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="mt-3">
        <div className="field-label">Categoria (pasta)</div>
        <p className="mb-2 text-[11px] leading-relaxed text-[#6B7A72]">
          Escolha a pasta do catálogo. A peça fica dentro dela. Se precisar, crie uma categoria nova.
        </p>
        <CategorySelect
          value={form.category}
          onChange={(category) => setForm((prev) => ({ ...prev, category }))}
          categories={categories}
          onCreate={onCreateCategory}
        />
      </div>

      <div className="mt-3">
        <div className="field-label">Tamanhos</div>
        <SizeSelect
          value={form.sizes}
          onChange={(next) =>
            setForm((prev) => ({
              ...prev,
              sizes: next,
              stock: syncStockGrid(prev.stock, prev.colors, next),
            }))
          }
          sizes={sizes}
        />
      </div>

      <div className="mt-3">
        <div className="field-label">Cores</div>
        <ColorSelect
          value={form.colors}
          onChange={setColors}
          colors={colorOptions}
          customColors={customProductColors}
          onRegisterColor={onRegisterCustomColor}
        />
      </div>

      {stockControl && (form.sizes.length > 0 || form.colors.length > 0) && (
        <StockGrid
          colors={form.colors}
          sizes={form.sizes}
          stock={syncStockGrid(form.stock, form.colors, form.sizes)}
          colorLabel={colorLabel}
          legacyQty={stockOn ? null : form.qty}
          onChange={setLineQty}
        />
      )}

      <div className="mt-4">
        <div className="field-label">
          Galeria · arraste para ordenar · YouTube no início = abre no vídeo · CAPA = foto na grade
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-[#6B7A72]">{PRODUCT_PHOTO_GUIDE}</p>
        <input
          ref={photoRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-3">
          {mediaSlots.map((slot, slotIndex) => {
            const isFirst = slotIndex === 0;
            const isCoverPhoto =
              slot.kind === "image" &&
              firstImageSlot?.kind === "image" &&
              firstImageSlot.index === slot.index;
            const selected = slot.kind === "image" && selectedPhoto === slot.index;
            const ytThumb =
              slot.kind === "video" ? getYoutubeThumbnailUrl(slot.src) : null;

            return (
              <div
                key={`${slot.kind}-${slot.index}-${slot.src}`}
                className="w-[88px]"
              >
                <div className="relative">
                  <div
                    draggable
                    onDragStart={() => setDragSlot(slotIndex)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragSlot === null) return;
                      reorderSlots(dragSlot, slotIndex);
                      setDragSlot(null);
                    }}
                    onClick={() => {
                      if (slot.kind === "image") setSelectedPhoto(slot.index);
                    }}
                    className="relative h-[88px] w-[88px] cursor-grab overflow-hidden rounded-[8px] transition hover:scale-[1.03] active:scale-95 active:cursor-grabbing"
                    style={{
                      outline:
                        selected || isFirst || isCoverPhoto
                          ? "2px solid #C9A84C"
                          : "2px solid #2a2a2e",
                      outlineOffset: 2,
                      opacity: selected ? 1 : 0.92,
                    }}
                  >
                    {slot.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={slot.src}
                        alt=""
                        className="pointer-events-none h-full w-full object-cover"
                      />
                    ) : ytThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ytThumb}
                        alt=""
                        className="pointer-events-none h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#1a2744] text-[10px] font-semibold text-[#60a5fa]">
                        YT
                      </div>
                    )}
                    {slot.kind === "video" && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-lg text-white">
                        ▶
                      </span>
                    )}
                    {isFirst && slot.kind === "video" && (
                      <span className="absolute left-1 top-1 rounded bg-[#C9A84C] px-1 text-[8px] font-bold text-black">
                        PLAY
                      </span>
                    )}
                    {isCoverPhoto && (
                      <span className="absolute left-1 top-1 rounded bg-[#C9A84C] px-1 text-[8px] font-bold text-black">
                        CAPA
                      </span>
                    )}
                    {slot.kind === "image" && slot.color && (
                      <span
                        className="absolute bottom-1 left-1 h-3 w-3 rounded-full border border-white/40"
                        style={{ background: slot.color }}
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSlot(slot)}
                    className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/85 text-[11px] text-white hover:bg-[#ef4444]"
                    aria-label={slot.kind === "image" ? "Remover foto" : "Remover vídeo"}
                  >
                    ✕
                  </button>
                </div>
                {slot.kind === "image" && form.colors.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {form.colors.map((hex) => {
                      const linked = slot.color === hex;
                      return (
                        <button
                          type="button"
                          key={hex}
                          title={`Associar a ${colorLabel(hex)}`}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              images: prev.images.map((item, idx) =>
                                idx === slot.index
                                  ? { ...item, color: linked ? undefined : hex }
                                  : item,
                              ),
                            }))
                          }
                          className="h-5 w-5 rounded-full transition hover:scale-110"
                          style={{
                            background: hex,
                            outline: linked ? "2px solid #C9A84C" : "1px solid #2a2a2e",
                            outlineOffset: 1,
                          }}
                        />
                      );
                    })}
                  </div>
                )}
                {selected && form.colors.length > 0 && (
                  <div className="mt-1 text-[10px] text-[#C9A84C]">
                    {slot.color ? colorLabel(slot.color) : "Sem cor"}
                  </div>
                )}
                {slot.kind === "video" && (
                  <div className="mt-1 space-y-1 text-center">
                    <div className="text-[10px] text-[#60a5fa]">YouTube</div>
                    {!isFirst && (
                      <button
                        type="button"
                        onClick={() => putVideoFirst(slot.index)}
                        className="w-full rounded bg-[#C9A84C] px-1 py-0.5 text-[9px] font-bold text-black"
                      >
                        Abrir 1º
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="flex h-[88px] w-[88px] items-center justify-center rounded-[8px] border border-dashed border-[#2a2a2e] text-xl text-[#999] transition hover:border-[#C9A84C] hover:text-[#C9A84C]"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="field-label">Vídeo do YouTube</div>
        <p className="mb-2 text-[11px] leading-relaxed text-[#6B7A72]">{PRODUCT_VIDEO_GUIDE}</p>
        <div className="flex gap-2">
          <input
            className="field-input"
            placeholder="https://youtube.com/shorts/... ou youtu.be/..."
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addVideoLink();
              }
            }}
            onBlur={() => {
              if (videoLink.trim() && normalizeYoutubeUrl(videoLink)) {
                addVideoLink();
              }
            }}
          />
          <button
            type="button"
            onClick={() => addVideoLink()}
            className="h-11 min-w-11 rounded-[10px] border border-[#2a2a2e] px-3 text-lg transition hover:border-[#C9A84C]"
          >
            +
          </button>
        </div>
        {linkPreview && (
          <div className="mt-2 flex items-center gap-3 rounded-[10px] border border-[#1E3A2E] bg-[#0A1F18] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={linkPreview}
              alt=""
              className="h-14 w-24 rounded object-cover"
            />
            <div className="min-w-0 flex-1 text-[12px] text-[#A8B5AE]">
              Miniatura pronta. Clique em + ou Salvar — o Shorts entra na galeria.
            </div>
          </div>
        )}
      </div>

      {mediaTip && (
        <div className="mt-3 rounded-[10px] border border-[#C9A84C44] bg-[#C9A84C12] px-3 py-2 text-[12px] leading-relaxed text-[#C9A84C]">
          {mediaTip}
        </div>
      )}

      <label className="mt-4 block">
        <span className="field-label">Descrição</span>
        <textarea
          className="field-input min-h-[80px] resize-y"
          placeholder="Material, acabamento, diferenciais..."
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </label>

      {saveError && (
        <div className="mt-3 rounded-[10px] border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-[13px] text-[#fca5a5]">
          {saveError}
        </div>
      )}

      {uploadingMedia && (
        <div className="mt-3 text-[12px] text-[#C9A84C]">Enviando mídia…</div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canSave || saving || uploadingMedia}
          onClick={() => void handleSave()}
          className="h-11 rounded-[10px] bg-[#C9A84C] px-5 text-[14px] font-semibold text-black disabled:opacity-40"
        >
          {saving ? (saveProgress ?? "Salvando…") : initial ? "Salvar" : "Adicionar"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="h-11 rounded-[10px] border border-[#2a2a2e] px-5 text-[14px] hover:border-white/30 disabled:opacity-40"
        >
          Cancelar
        </button>
        {!canSave && (
          <span className="text-[12px] text-[#6B7A72]">Nome e categoria são obrigatórios.</span>
        )}
      </div>
    </div>
  );
}

function StockGrid({
  colors,
  sizes,
  stock,
  colorLabel,
  legacyQty,
  onChange,
}: {
  colors: string[];
  sizes: string[];
  stock: StockLine[];
  colorLabel: (hex: string) => string;
  legacyQty: number | null;
  onChange: (color: string, size: string, qty: number) => void;
}) {
  const colorAxis = colors.length > 0 ? colors : [""];
  const sizeAxis = sizes.length > 0 ? sizes : [""];
  const total = stockTotal(stock);

  return (
    <div className="mt-4 rounded-[12px] border border-[#1E3A2E] bg-[#0A1F18] p-3">
      <div className="field-label mb-1">Unidades por tamanho e cor</div>
      <p className="mb-3 text-[11px] leading-relaxed text-[#6B7A72]">
        Cada casa é uma combinação. Quando chegar a 0, ela sai do catálogo. Se todas chegarem a 0, a peça sai até você acrescentar.
      </p>
      {legacyQty != null && legacyQty > 0 && (
        <p className="mb-3 text-[11px] text-[#C9A84C]">
          Estoque geral atual: {legacyQty} peças, ainda sem divisão. Preencha a grade e salve para passar a controlar.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-2 text-left">
          <thead>
            <tr>
              <th className="pr-2 text-[11px] font-medium text-[#6B7A72]">{colors.length > 0 ? "Cor" : ""}</th>
              {sizeAxis.map((size) => (
                <th key={size || "unico"} className="px-1 text-[11px] font-medium text-[#A8B5AE]">
                  {size || "Qtd"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colorAxis.map((color) => (
              <tr key={color || "sem-cor"}>
                <td className="pr-2 text-[12px] text-[#A8B5AE]">
                  {color ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: color }} />
                      {colorLabel(color)}
                    </span>
                  ) : (
                    "Peças"
                  )}
                </td>
                {sizeAxis.map((size) => {
                  const line = stock.find(
                    (entry) => entry.color.toLowerCase() === color.toLowerCase() && entry.size === size,
                  );
                  return (
                    <td key={`${color}-${size}`} className="px-1">
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        className="field-input h-10 w-16 py-2 text-center text-[13px]"
                        value={line?.qty ?? 0}
                        onChange={(e) => onChange(color, size, Number(e.target.value))}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-[#A8B5AE]">Total: {total} peças</p>
    </div>
  );
}

function TierQtyInput({ value, onChange }: { value: number; onChange: (minQty: number) => void }) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit(raw: string) {
    const minQty = Math.max(1, parseInt(raw, 10) || 1);
    setDraft(String(minQty));
    onChange(minQty);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      className="field-input h-10 w-20 py-2 text-center text-[13px]"
      value={draft}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
      onBlur={() => commit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(draft);
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}
