"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_COLORS } from "@/lib/constants";
import type { ProductColorEntry } from "@/lib/types";
import { colorNameFromHex, normalizeHex } from "@/lib/utils";

function normalizeColorInput(input: string): string | null {
  const q = input.trim();
  if (!q) return null;

  const byName = PRODUCT_COLORS.find((c) => c.name.toLowerCase() === q.toLowerCase());
  if (byName) return normalizeHex(byName.hex);

  let raw = q.startsWith("#") ? q.slice(1) : q;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    raw = raw
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }

  return null;
}

function ColorSwatch({ hex, size = 16 }: { hex: string; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full border border-[#2a2a2e]"
      style={{ background: hex, width: size, height: size }}
    />
  );
}

export function ColorSelect({
  value,
  onChange,
  colors,
  customColors = [],
  onRegisterColor,
}: {
  value: string[];
  onChange: (colors: string[]) => void;
  colors: string[];
  customColors?: ProductColorEntry[];
  onRegisterColor?: (entry: ProductColorEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#c9a84c");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  const label = (hex: string) => colorNameFromHex(hex, customColors);

  const options = useMemo(() => {
    const fromCustom = customColors.map((c) => normalizeHex(c.hex));
    const all = [...new Set([...colors, ...fromCustom, ...value])].map(normalizeHex);
    return all.sort((a, b) => label(a).localeCompare(label(b), "pt-BR"));
  }, [colors, customColors, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((hex) => {
      const name = label(hex).toLowerCase();
      return name.includes(q) || hex.toLowerCase().includes(q);
    });
  }, [options, query, customColors]);

  const parsed = normalizeColorInput(query);
  const exact = parsed ? options.some((hex) => normalizeHex(hex) === parsed) : false;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open && !creating) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (open && creating) {
      window.setTimeout(() => nameRef.current?.focus(), 0);
    }
    if (!open) {
      setQuery("");
      setCreating(false);
      setNewName("");
      setNewHex("#c9a84c");
    }
  }, [open, creating]);

  function isSelected(hex: string) {
    const norm = normalizeHex(hex);
    return value.some((v) => normalizeHex(v) === norm);
  }

  function toggle(hex: string) {
    const norm = normalizeHex(hex);
    if (isSelected(norm)) {
      onChange(value.filter((v) => normalizeHex(v) !== norm));
    } else {
      onChange([...value, norm]);
    }
  }

  function addHex(hex: string, name?: string) {
    const norm = normalizeHex(hex);
    if (name?.trim() && onRegisterColor) {
      onRegisterColor({ name: name.trim(), hex: norm });
    }
    if (!isSelected(norm)) {
      onChange([...value, norm]);
    }
    setQuery("");
    setCreating(false);
    setNewName("");
  }

  function addCustomFromSearch() {
    if (!parsed) return;
    addHex(parsed);
  }

  function openCreatePanel(prefillHex?: string) {
    setCreating(true);
    setNewName(query.trim() && !parsed ? query.trim() : "");
    setNewHex(prefillHex ?? parsed ?? "#c9a84c");
  }

  function confirmCreate() {
    const name = newName.trim();
    const hex = normalizeHex(newHex);
    if (!name) return;
    addHex(hex, name);
  }

  const canCreate = newName.trim().length > 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="field-input flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {value.length > 0 ? (
            value.map((hex) => (
              <span
                key={hex}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#C9A84C55] bg-[#C9A84C22] px-2 py-0.5 text-[12px] font-medium text-[#C9A84C]"
              >
                <ColorSwatch hex={hex} size={14} />
                {label(hex)}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(hex);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(hex);
                    }
                  }}
                  className="cursor-pointer text-[10px] opacity-80 hover:opacity-100"
                  aria-label={`Remover ${label(hex)}`}
                >
                  ✕
                </span>
              </span>
            ))
          ) : (
            <span className="truncate text-[14px] text-[#6B7A72]">Selecione as cores</span>
          )}
        </span>
        <span
          className="shrink-0 text-[12px] text-[#6B7A72] transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-[12px] border border-[#1E3A2E] bg-[#0F281F] shadow-xl">
          {!creating ? (
            <>
              <div className="border-b border-[#1E3A2E] p-2">
                <input
                  ref={inputRef}
                  className="field-input h-10 py-2 text-[13px]"
                  placeholder="Buscar cor ou digite #hex / nome"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (parsed && exact) {
                        toggle(parsed);
                      } else if (parsed && !exact) {
                        addCustomFromSearch();
                      } else if (filtered[0]) {
                        toggle(filtered[0]);
                      } else if (query.trim()) {
                        openCreatePanel();
                      }
                    }
                    if (e.key === "Escape") setOpen(false);
                  }}
                />
              </div>

              <ul className="max-h-52 overflow-y-auto py-1">
                {filtered.map((hex) => {
                  const selected = isSelected(hex);
                  return (
                    <li key={hex}>
                      <button
                        type="button"
                        onClick={() => toggle(hex)}
                        className="flex min-h-10 w-full items-center gap-2.5 px-3 text-left text-[14px] transition hover:bg-white/5"
                      >
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] font-bold"
                          style={{
                            borderColor: selected ? "#C9A84C" : "#2a2a2e",
                            background: selected ? "#C9A84C" : "transparent",
                            color: selected ? "#000" : "transparent",
                          }}
                        >
                          ✓
                        </span>
                        <ColorSwatch hex={hex} />
                        <span style={{ color: selected ? "#C9A84C" : "#E5E7EB" }}>{label(hex)}</span>
                        <span className="ml-auto text-[11px] text-[#6B7A72]">{hex}</span>
                      </button>
                    </li>
                  );
                })}
                {filtered.length === 0 && !query.trim() && (
                  <li className="px-3 py-3 text-[13px] text-[#555]">Nenhuma cor encontrada</li>
                )}
              </ul>

              {parsed && !exact && (
                <button
                  type="button"
                  onClick={addCustomFromSearch}
                  className="flex min-h-10 w-full items-center gap-2 border-t border-[#1E3A2E] px-3 text-left text-[13px] font-medium text-[#C9A84C] transition hover:bg-[#C9A84C14]"
                >
                  <ColorSwatch hex={parsed} />
                  + Adicionar {label(parsed)} ({parsed})
                </button>
              )}

              {query.trim() && !parsed && (
                <button
                  type="button"
                  onClick={() => openCreatePanel()}
                  className="flex min-h-10 w-full items-center gap-2 border-t border-[#1E3A2E] px-3 text-left text-[13px] font-medium text-[#C9A84C] transition hover:bg-[#C9A84C14]"
                >
                  + Criar cor &quot;{query.trim()}&quot;
                </button>
              )}

              <button
                type="button"
                onClick={() => openCreatePanel()}
                className="flex min-h-11 w-full items-center justify-center gap-2 border-t border-[#1E3A2E] bg-[#122E23] px-3 text-[13px] font-semibold text-[#C9A84C] transition hover:bg-[#1a3d2f]"
              >
                <span className="text-[16px] leading-none">+</span>
                Criar nova cor
              </button>
            </>
          ) : (
            <div className="p-4">
              <p className="mb-3 text-[13px] font-semibold text-white">Nova cor</p>

              <label className="mb-3 block">
                <span className="mb-1 block text-[12px] text-[#A8B5AE]">Nome da cor</span>
                <input
                  ref={nameRef}
                  className="field-input h-10 text-[13px]"
                  placeholder="Ex: Verde musgo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canCreate) {
                      e.preventDefault();
                      confirmCreate();
                    }
                    if (e.key === "Escape") setCreating(false);
                  }}
                />
              </label>

              <label className="mb-4 block">
                <span className="mb-2 block text-[12px] text-[#A8B5AE]">Cor (conta-gotas)</span>
                <div className="flex items-center gap-3">
                  <label className="relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-[10px] border border-[#2a2a2e]">
                    <span className="block h-full w-full" style={{ background: newHex }} />
                    <input
                      type="color"
                      value={newHex}
                      onChange={(e) => setNewHex(e.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      aria-label="Selecionar cor"
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    <input
                      className="field-input h-10 font-mono text-[13px]"
                      value={newHex}
                      onChange={(e) => {
                        const next = normalizeColorInput(e.target.value);
                        if (next) setNewHex(next);
                        else setNewHex(e.target.value);
                      }}
                      placeholder="#000000"
                    />
                    <p className="mt-1 text-[11px] text-[#6B7A72]">Clique no quadrado para abrir o conta-gotas</p>
                  </div>
                </div>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="h-10 flex-1 rounded-[10px] border border-white/10 text-[13px] text-[#A8B5AE]"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={!canCreate}
                  onClick={confirmCreate}
                  className="h-10 flex-1 rounded-[10px] bg-[#C9A84C] text-[13px] font-semibold text-[#0A1F18] disabled:opacity-50"
                >
                  Adicionar cor
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
