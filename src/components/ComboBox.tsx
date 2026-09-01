"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ComboBoxBase = {
  options: string[];
  placeholder?: string;
  createLabel?: (query: string) => string;
};

type ComboBoxProps =
  | (ComboBoxBase & {
      mode: "single";
      value: string;
      onChange: (value: string) => void;
    })
  | (ComboBoxBase & {
      mode: "multiple";
      value: string[];
      onChange: (value: string[]) => void;
    });

export function ComboBox(props: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(() => {
    const current =
      props.mode === "single" ? (props.value ? [props.value] : []) : props.value;
    const all = [...new Set([...props.options, ...current])];
    return all.sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [props]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const exact = options.some((o) => o.toLowerCase() === query.trim().toLowerCase());
  const createLabel = props.createLabel ?? ((q) => `Criar "${q}"`);

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

  function commitCreate() {
    const next = query.trim();
    if (!next) return;
    if (props.mode === "single") {
      props.onChange(next);
      setOpen(false);
    } else if (!props.value.includes(next)) {
      props.onChange([...props.value, next]);
    }
    setQuery("");
  }

  function selectSingle(option: string) {
    if (props.mode !== "single") return;
    props.onChange(option);
    setOpen(false);
    setQuery("");
  }

  function toggleMultiple(option: string) {
    if (props.mode !== "multiple") return;
    if (props.value.includes(option)) {
      props.onChange(props.value.filter((v) => v !== option));
    } else {
      props.onChange([...props.value, option]);
    }
  }

  const placeholder = props.placeholder ?? "Selecionar...";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="field-input flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {props.mode === "multiple" && props.value.length > 0 ? (
            props.value.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-full border border-[#C9A84C55] bg-[#C9A84C22] px-2 py-0.5 text-[12px] font-medium text-[#C9A84C]"
              >
                {item}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMultiple(item);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleMultiple(item);
                    }
                  }}
                  className="cursor-pointer text-[10px] opacity-80 hover:opacity-100"
                  aria-label={`Remover ${item}`}
                >
                  ✕
                </span>
              </span>
            ))
          ) : props.mode === "single" && props.value ? (
            <span className="truncate text-[14px] text-white">{props.value}</span>
          ) : (
            <span className="truncate text-[14px] text-[#6B7A72]">{placeholder}</span>
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
              placeholder="Buscar ou criar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (exact && props.mode === "single") {
                    const match = options.find(
                      (o) => o.toLowerCase() === query.trim().toLowerCase(),
                    );
                    if (match) selectSingle(match);
                  } else if (!exact && query.trim()) {
                    commitCreate();
                  } else if (props.mode === "single" && filtered[0]) {
                    selectSingle(filtered[0]);
                  }
                }
                if (e.key === "Escape") setOpen(false);
              }}
            />
          </div>

          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.map((option) => {
              const selected =
                props.mode === "single"
                  ? props.value === option
                  : props.value.includes(option);
              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() =>
                      props.mode === "single" ? selectSingle(option) : toggleMultiple(option)
                    }
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
                    <span style={{ color: selected ? "#C9A84C" : "#E5E7EB" }}>{option}</span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && !query.trim() && (
              <li className="px-3 py-3 text-[13px] text-[#555]">Nenhuma opção encontrada</li>
            )}
          </ul>

          {!exact && query.trim() && (
            <button
              type="button"
              onClick={commitCreate}
              className="flex min-h-10 w-full items-center border-t border-[#1E3A2E] px-3 text-left text-[13px] font-medium text-[#C9A84C] transition hover:bg-[#C9A84C14]"
            >
              + {createLabel(query.trim())}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
