"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_COLORS } from "@/lib/constants";
import { colorNameFromHex } from "@/lib/utils";

function normalizeHex(hex: string): string {
  const q = hex.trim().toLowerCase();
  if (!q.startsWith("#")) return `#${q}`;
  return q;
}

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
}: {
  value: string[];
  onChange: (colors: string[]) => void;
  colors: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const all = [...new Set([...colors, ...value])].map(normalizeHex);
    return all.sort((a, b) =>
      colorNameFromHex(a).localeCompare(colorNameFromHex(b), "pt-BR"),
    );
  }, [colors, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((hex) => {
      const name = colorNameFromHex(hex).toLowerCase();
      return name.includes(q) || hex.toLowerCase().includes(q);
    });
  }, [options, query]);

  const parsed = normalizeColorInput(query);
  const exact = parsed ? options.some((hex) => normalizeHex(hex) === parsed) : false;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
    }
  }, [open]);

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

  function addCustom() {
    const next = normalizeColorInput(query);
    if (!next || isSelected(next)) return;
    onChange([...value, next]);
    setQuery("");
  }

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
                {colorNameFromHex(hex)}
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
                  aria-label={`Remover ${colorNameFromHex(hex)}`}
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
                    addCustom();
                  } else if (filtered[0]) {
                    toggle(filtered[0]);
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
                    <span style={{ color: selected ? "#C9A84C" : "#E5E7EB" }}>
                      {colorNameFromHex(hex)}
                    </span>
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
              onClick={addCustom}
              className="flex min-h-10 w-full items-center gap-2 border-t border-[#1E3A2E] px-3 text-left text-[13px] font-medium text-[#C9A84C] transition hover:bg-[#C9A84C14]"
            >
              <ColorSwatch hex={parsed} />
              + Adicionar cor {colorNameFromHex(parsed)} ({parsed})
            </button>
          )}
          {query.trim() && !parsed && (
            <div className="border-t border-[#1E3A2E] px-3 py-2 text-[12px] text-[#6B7A72]">
              Use nome (ex: Rosa) ou código hex (ex: #ff00aa)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
