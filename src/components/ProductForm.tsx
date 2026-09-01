"use client";

import { useRef, useState } from "react";
import { CategorySelect } from "./CategorySelect";
import { ColorSelect } from "./ColorSelect";
import { SizeSelect } from "./SizeSelect";
import { normalizeImages, prefersVideoCover, reorder } from "@/lib/media";
import {
  PRODUCT_PHOTO_GUIDE,
  PRODUCT_VIDEO_GUIDE,
  getImageDimensions,
  getVideoDimensions,
  productPhotoUploadTip,
  productVideoUploadTip,
} from "@/lib/mediaGuide";
import type { Product, ProductImage, VideoItem, VolumeDiscount, ProductColorEntry } from "@/lib/types";
import { normalizeVolumeDiscounts } from "@/lib/pricing";
import { colorNameFromHex, parsePrice, readAsDataURL } from "@/lib/utils";

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
};

export function ProductForm({
  initial,
  categories,
  sizes,
  colors: colorOptions,
  customProductColors = [],
  onRegisterCustomColor,
  onSave,
  onCancel,
}: {
  initial: Product | null;
  categories: string[];
  sizes: string[];
  colors: string[];
  customProductColors?: ProductColorEntry[];
  onRegisterCustomColor?: (entry: ProductColorEntry) => void;
  onSave: (product: Omit<Product, "id"> & { id?: number }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          category: initial.category,
          qty: initial.qty,
          sizes: [...initial.sizes],
          price: initial.price,
          colors: initial.colors,
          images: normalizeImages(initial.images),
          videos: initial.videos,
          description: initial.description,
          coverType: initial.coverType ?? (initial.videos.length > 0 ? "video" : "image"),
          volumeDiscounts: normalizeVolumeDiscounts(initial.volumeDiscounts, initial.price),
        }
      : emptyForm,
  );
  const [videoLink, setVideoLink] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragVideoIndex, setDragVideoIndex] = useState<number | null>(null);
  const [mediaTip, setMediaTip] = useState<string | null>(null);
  const [normalPriceConfirmed, setNormalPriceConfirmed] = useState(() =>
    Boolean(initial?.price?.trim() && parsePrice(initial.price) > 0),
  );
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const canSave = Boolean(form.name.trim() && form.category.trim());
  const videoCover = prefersVideoCover(form);
  const colorLabel = (hex: string) => colorNameFromHex(hex, customProductColors);

  function setColors(next: string[]) {
    setForm((prev) => ({
      ...prev,
      colors: next,
      images: prev.images.map((img) =>
        img.color && !next.some((c) => c.toLowerCase() === img.color?.toLowerCase())
          ? { ...img, color: undefined }
          : img,
      ),
    }));
  }

  async function addPhotos(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const tips: string[] = [];
    const urls = await Promise.all(
      files.map(async (file) => {
        try {
          const { width, height } = await getImageDimensions(file);
          const tip = productPhotoUploadTip(width, height);
          if (tip) tips.push(tip);
        } catch {
          // ignore dimension read errors
        }
        return readAsDataURL(file);
      }),
    );
    const added: ProductImage[] = urls.map((src) => ({ src }));
    setForm((prev) => ({ ...prev, images: [...prev.images, ...added] }));
    setMediaTip(tips[0] ?? null);
  }

  function addVideoLink() {
    const src = videoLink.trim();
    if (!src) return;
    const item: VideoItem = { type: "link", src, name: src };
    setForm((prev) => ({
      ...prev,
      videos: [...prev.videos, item],
      coverType: prev.coverType === "image" ? "image" : "video",
    }));
    setVideoLink("");
  }

  async function addVideoFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const tips: string[] = [];
    const items: VideoItem[] = await Promise.all(
      files.map(async (file) => {
        try {
          const { width, height } = await getVideoDimensions(file);
          const tip = productVideoUploadTip(width, height);
          if (tip) tips.push(tip);
        } catch {
          // ignore dimension read errors
        }
        return {
          type: "file" as const,
          src: await readAsDataURL(file),
          name: file.name,
        };
      }),
    );
    setForm((prev) => ({
      ...prev,
      videos: [...prev.videos, ...items],
      coverType: prev.coverType === "image" ? "image" : "video",
    }));
    setMediaTip(tips[0] ?? null);
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
          <span className="field-label">Quantidade</span>
          <input
            className="field-input"
            type="number"
            min={0}
            value={form.qty}
            onChange={(e) => setForm((prev) => ({ ...prev, qty: Number(e.target.value) }))}
          />
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
                  <input
                    type="number"
                    min={1}
                    className="field-input h-10 w-20 py-2 text-center text-[13px]"
                    value={tier.minQty}
                    onChange={(e) => {
                      const minQty = Math.max(1, Number(e.target.value) || 1);
                      setForm((prev) => ({
                        ...prev,
                        volumeDiscounts: prev.volumeDiscounts.map((row, i) =>
                          i === index ? { ...row, minQty } : row,
                        ),
                      }));
                    }}
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
        <div className="field-label">Categoria</div>
        <CategorySelect
          value={form.category}
          onChange={(category) => setForm((prev) => ({ ...prev, category }))}
          categories={categories}
        />
      </div>

      <div className="mt-3">
        <div className="field-label">Tamanhos</div>
        <SizeSelect
          value={form.sizes}
          onChange={(next) => setForm((prev) => ({ ...prev, sizes: next }))}
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

      <div className="mt-4">
        <div className="field-label">Fotos do produto · clique para selecionar · arraste para definir a ordem (1ª = capa)</div>
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
          {form.images.map((img, i) => {
            const selected = selectedPhoto === i;
            const isCover = !videoCover && i === 0;
            return (
              <div key={`${img.src}-${i}`} className="w-[88px]">
                <div className="relative">
                  <button
                    type="button"
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex === null) return;
                      setForm((prev) => ({
                        ...prev,
                        coverType: "image",
                        images: reorder(prev.images, dragIndex, i),
                      }));
                      setSelectedPhoto(i);
                      setDragIndex(null);
                    }}
                    onClick={() => setSelectedPhoto(i)}
                    className="relative h-[88px] w-[88px] cursor-grab overflow-hidden rounded-[8px] transition hover:scale-[1.03] active:scale-95 active:cursor-grabbing"
                    style={{
                      outline: selected || isCover ? "2px solid #C9A84C" : "2px solid #2a2a2e",
                      outlineOffset: 2,
                      opacity: selected ? 1 : 0.92,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt="" className="pointer-events-none h-full w-full object-cover" />
                    {isCover && (
                      <span className="absolute left-1 top-1 rounded bg-[#C9A84C] px-1 text-[8px] font-bold text-black">
                        CAPA
                      </span>
                    )}
                    {img.color && (
                      <span
                        className="absolute bottom-1 left-1 h-3 w-3 rounded-full border border-white/40"
                        style={{ background: img.color }}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }));
                      setSelectedPhoto(null);
                    }}
                    className="absolute -right-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/85 text-[11px] text-white hover:bg-[#ef4444]"
                    aria-label="Remover foto"
                  >
                    ✕
                  </button>
                </div>
                {form.colors.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {form.colors.map((hex) => {
                      const linked = img.color === hex;
                      return (
                        <button
                          type="button"
                          key={hex}
                          title={`Associar a ${colorLabel(hex)}`}
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              images: prev.images.map((item, idx) =>
                                idx === i ? { ...item, color: linked ? undefined : hex } : item,
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
                    {img.color ? colorLabel(img.color) : "Sem cor"}
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
        <div className="field-label">Vídeos · clique para selecionar · arraste para reordenar (1º = capa)</div>
        <p className="mb-2 text-[11px] leading-relaxed text-[#6B7A72]">{PRODUCT_VIDEO_GUIDE}</p>
        <div className="flex gap-2">
          <input
            className="field-input"
            placeholder="YouTube / Reels / TikTok"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addVideoLink();
              }
            }}
          />
          <button
            type="button"
            onClick={addVideoLink}
            className="h-11 min-w-11 rounded-[10px] border border-[#2a2a2e] px-3 text-lg transition hover:border-[#C9A84C]"
          >
            +
          </button>
        </div>
        <input
          ref={videoRef}
          type="file"
          multiple
          accept="video/mp4,video/quicktime,.mp4,.mov"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void addVideoFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => videoRef.current?.click()}
          className="mt-2 h-11 rounded-[10px] border border-[#2a2a2e] px-4 text-[13px] transition hover:border-[#C9A84C]"
        >
          Upload MP4 / MOV
        </button>
        <div className="mt-3 space-y-2">
          {form.videos.map((video, i) => {
            const selected = selectedVideo === i;
            const isCover = videoCover && i === 0;
            return (
              <div
                key={`${video.src}-${i}`}
                draggable
                onDragStart={() => setDragVideoIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragVideoIndex === null) return;
                  setForm((prev) => ({
                    ...prev,
                    coverType: "video",
                    videos: reorder(prev.videos, dragVideoIndex, i),
                  }));
                  setSelectedVideo(i);
                  setDragVideoIndex(null);
                }}
                onClick={() => {
                  setSelectedVideo(i);
                  setForm((prev) => ({ ...prev, coverType: "video" }));
                }}
                className="flex cursor-grab items-center gap-2 rounded-[10px] p-2 transition hover:bg-white/5 active:cursor-grabbing"
                style={{
                  border: selected || isCover ? "1px solid #C9A84C" : "1px solid rgba(255,255,255,0.06)",
                  background: selected ? "#C9A84C14" : "transparent",
                }}
              >
                {video.type === "file" ? (
                  <video src={video.src} className="pointer-events-none h-10 w-10 rounded object-cover" muted />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1a2744] text-[10px] text-[#60a5fa]">
                    URL
                  </div>
                )}
                <span
                  className="rounded px-2 py-1 text-[11px] font-semibold"
                  style={
                    video.type === "file"
                      ? { background: "#1a3a2a", color: "#4ade80" }
                      : { background: "#1a2744", color: "#60a5fa" }
                  }
                >
                  {video.type === "file" ? "MP4" : "URL"}
                </span>
                {isCover && (
                  <span className="shrink-0 rounded-[3px] bg-[#C9A84C] px-2.5 py-1 text-[11px] font-black leading-none tracking-[0.12em] text-black">
                    CAPA
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#999]">
                  {video.name ?? video.src}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setForm((prev) => {
                      const videos = prev.videos.filter((_, idx) => idx !== i);
                      return {
                        ...prev,
                        videos,
                        coverType: videos.length === 0 ? "image" : prev.coverType,
                      };
                    });
                    setSelectedVideo(null);
                  }}
                  className="flex h-11 w-11 items-center justify-center text-[#ef4444] hover:bg-white/5"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
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

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            void onSave({
              id: initial?.id,
              name: form.name.trim(),
              category: form.category.trim(),
              qty: form.qty,
              sizes: form.sizes,
              price: form.price,
              colors: form.colors,
              images: form.images,
              videos: form.videos,
              description: form.description,
              volumeDiscounts: normalizeVolumeDiscounts(form.volumeDiscounts, form.price),
              coverType:
                form.videos.length === 0 ? "image" : (form.coverType ?? "video"),
            });
          }}
          className="h-11 rounded-[10px] bg-[#C9A84C] px-5 text-[14px] font-semibold text-black disabled:opacity-40"
        >
          {initial ? "Salvar" : "Adicionar"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 rounded-[10px] border border-[#2a2a2e] px-5 text-[14px] hover:border-white/30"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
