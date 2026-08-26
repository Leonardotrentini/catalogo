"use client";

import { useEffect, useRef, useState } from "react";

export function CategorySelect({
  value,
  onChange,
  categories,
}: {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = categories.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase()),
  );
  const exact = categories.some(
    (c) => c.toLowerCase() === query.trim().toLowerCase(),
  );

  function commit(name: string) {
    const next = name.trim();
    if (!next) return;
    onChange(next);
    setQuery(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        className="field-input"
        placeholder="Categoria"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            const match = categories.find(
              (c) => c.toLowerCase() === query.trim().toLowerCase(),
            );
            commit(match ?? query);
          }
        }}
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-[12px] border border-[#2a2a2e] bg-[#141416] py-1 shadow-xl">
          {filtered.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => commit(c)}
              className="flex min-h-11 w-full items-center px-3 text-left text-[14px] hover:bg-white/5"
            >
              {c}
            </button>
          ))}
          {!exact && query.trim() && (
            <button
              type="button"
              onClick={() => commit(query)}
              className="flex min-h-11 w-full items-center px-3 text-left text-[14px] text-[#C9A84C] hover:bg-white/5"
            >
              + Criar &apos;{query.trim()}&apos;
            </button>
          )}
          {filtered.length === 0 && !query.trim() && (
            <div className="px-3 py-3 text-[13px] text-[#555]">Digite para criar</div>
          )}
        </div>
      )}
    </div>
  );
}
