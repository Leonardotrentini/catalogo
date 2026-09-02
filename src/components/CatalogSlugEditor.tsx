"use client";

import { useEffect, useState } from "react";
import { catalogPublicUrl } from "@/lib/hosts";
import { toSlug } from "@/lib/utils";

export function CatalogSlugEditor({
  catalogId,
  slug,
  onSaved,
}: {
  catalogId: string;
  slug: string;
  onSaved: (slug: string) => void;
}) {
  const [draft, setDraft] = useState(slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(slug);
  }, [slug]);

  async function save(raw: string) {
    const nextSlug = toSlug(raw.trim());
    if (!nextSlug) {
      setError("Use apenas letras, números e hífens.");
      setDraft(slug);
      return;
    }
    if (nextSlug === slug) {
      setDraft(nextSlug);
      setError(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/catalog/slug", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId, slug: nextSlug }),
      });
      const body = (await res.json()) as { slug?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao salvar endereço");
      const savedSlug = body.slug ?? nextSlug;
      setDraft(savedSlug);
      setSaved(true);
      onSaved(savedSlug);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      setDraft(slug);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[12px] border border-[#1E3A2E] bg-[#0A1F18] p-3">
      <div className="field-label mb-1">Endereço público do catálogo</div>
      <p className="mb-3 text-[11px] text-[#6B7A72]">
        Esse é o link final que seus clientes vão acessar. Use apenas letras minúsculas, números e hífens.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="mb-1 truncate text-[11px] text-[#6B7A72]">
            {catalogPublicUrl(draft || slug).replace(/^https?:\/\//, "")}
          </div>
          <input
            className="field-input font-mono text-[14px]"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              setError(null);
            }}
            onBlur={() => void save(draft)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void save(draft);
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            placeholder="minha-loja"
            disabled={saving}
          />
        </div>
        <button
          type="button"
          disabled={saving || toSlug(draft) === slug}
          onClick={() => void save(draft)}
          className="h-11 shrink-0 rounded-[10px] border border-[#C9A84C] px-4 text-[13px] font-semibold text-[#C9A84C] disabled:opacity-40"
        >
          {saving ? "Salvando…" : "Salvar endereço"}
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-[#ef4444]">{error}</p>}
      {saved && <p className="mt-2 text-[12px] font-medium text-[#25D366]">Endereço atualizado!</p>}
    </div>
  );
}
