"use client";

import { useRef, useState } from "react";
import { CategorySelect } from "./CategorySelect";
import { PRODUCT_COLORS } from "@/lib/constants";
import { normalizeImages, prefersVideoCover, reorder } from "@/lib/media";
import type { Product, ProductImage, VideoItem } from "@/lib/types";
import { colorNameFromHex, isLightHex, readAsDataURL } from "@/lib/utils";

const emptyForm = {
  name: "",
  category: "",
  qty: 0,
  sizes: "",
  price: "",
  colors: [] as string[],
  images: [] as ProductImage[],
  videos: [] as VideoItem[],
  description: "",
  coverType: undefined as "video" | "image" | undefined,
};

export function ProductForm({
  initial,
  categories,
  onSave,
  onCancel,
}: {
  initial: Product | null;
  categories: string[];
  onSave: (product: Omit<Product, "id"> & { id?: number }) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          category: initial.category,
          qty: initial.qty,
          sizes: initial.sizes.join(", "),
          price: initial.price,
          colors: initial.colors,
          images: normalizeImages(initial.images),
          videos: initial.videos,
          description: initial.description,
          coverType: initial.coverType ?? (initial.videos.length > 0 ? "video" : "image"),
        }
      : emptyForm,
  );
  const [videoLink, setVideoLink] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragVideoIndex, setDragVideoIndex] = useState<number | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const canSave = Boolean(form.name.trim() && form.category.trim());
  const videoCover = prefersVideoCover(form);

  function toggleColor(hex: string) {
    setForm((prev) => {
      const nextColors = prev.colors.includes(hex)
        ? prev.colors.filter((c) => c !== hex)
        : [...prev.colors, hex];
      return {
        ...prev,
        colors: nextColors,
        images: prev.images.map((img) =>
          img.color && !nextColors.includes(img.color) ? { ...img, color: undefined } : img,
        ),
      };
    });
  }

  async function addPhotos(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    const urls = await Promise.all(files.map(readAsDataURL));
    const added: ProductImage[] = urls.map((src) => ({ src }));
    setForm((prev) => ({ ...prev, images: [...prev.images, ...added] }));
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
    const items: VideoItem[] = await Promise.all(
      files.map(async (file) => ({
        type: "file" as const,
        src: await readAsDataURL(file),
        name: file.name,
      })),
    );
    setForm((prev) => ({
      ...prev,
      videos: [...prev.videos, ...items],
      coverType: prev.coverType === "image" ? "image" : "video",
    }));
  }

  return (
    <div className="rounded-[14px] border border-[rgba(201,168,76,0.14)] bg-[#0F281F] p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">Nome</span>
          <input
            className="field-input"
            placeholder="Ex: Camiseta Oversized"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="field-label">Categoria</span>
          <CategorySelect
            value={form.category}
            onChange={(category) => setForm((prev) => ({ ...prev, category }))}
            categories={categories}
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
          <span className="field-label">Preço atacado (R$)</span>
          <input
            className="field-input"
            placeholder="27.00"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="field-label">Tamanhos</span>
        <input
          className="field-input"
          placeholder="P, M, G, GG"
          value={form.sizes}
          onChange={(e) => setForm((prev) => ({ ...prev, sizes: e.target.value }))}
        />
      </label>

      <div className="mt-4">
        <div className="field-label">
          Cores disponíveis · {form.colors.length} selecionadas
        </div>
        <div className="grid grid-cols-8 gap-1">
          {PRODUCT_COLORS.map((c) => {
            const active = form.colors.includes(c.hex);
            return (
              <button
                type="button"
                key={c.hex}
                title={c.name}
                onClick={() => toggleColor(c.hex)}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] transition hover:bg-white/5 hover:scale-105 active:scale-95"
                style={{
                  outline: active ? "2px solid #C9A84C" : "2px solid transparent",
                  outlineOffset: 0,
                }}
              >
                <span
                  className="relative flex h-[30px] w-[30px] items-center justify-center rounded-full"
                  style={{
                    background: c.hex,
                    border: "2px solid #2a2a2e",
                  }}
                >
                  {active && (
                    <span
                      className="text-[11px] font-bold"
                      style={{ color: isLightHex(c.hex) ? "#111" : "#fff" }}
                    >
                      ✓
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="field-label">Fotos do produto · clique para selecionar · arraste para definir a ordem (1ª = capa)</div>
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
                          title={`Associar a ${colorNameFromHex(hex)}`}
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
                    {img.color ? colorNameFromHex(img.color) : "Sem cor"}
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
              sizes: form.sizes
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              price: form.price,
              colors: form.colors,
              images: form.images,
              videos: form.videos,
              description: form.description,
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
