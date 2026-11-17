"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  META_CUSTOM_EVENTS,
  fireCatalogMetaEvent,
  sanitizeMetaApiToken,
  sanitizeMetaPixelId,
} from "@/lib/metaTracking";
import type { Brand, MetaCustomEventName } from "@/lib/types";

export function PixelTrackingTab({
  brand,
  setBrand,
  catalogSlug,
}: {
  brand: Brand;
  setBrand: Dispatch<SetStateAction<Brand>>;
  catalogSlug: string;
}) {
  const [testing, setTesting] = useState<MetaCustomEventName | "both" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  const pixelId = brand.metaPixelId ?? "";
  const token = brand.metaApiToken ?? "";

  async function runTest(eventName: MetaCustomEventName | "both") {
    setTesting(eventName);
    setResult(null);
    setError(null);

    const id = sanitizeMetaPixelId(pixelId);
    if (!id) {
      setError("Informe o Pixel ID antes de testar.");
      setTesting(null);
      return;
    }

    try {
      const events: MetaCustomEventName[] =
        eventName === "both"
          ? [META_CUSTOM_EVENTS.pageview, META_CUSTOM_EVENTS.addCart]
          : [eventName];

      const lines: string[] = [];
      for (const name of events) {
        const out = await fireCatalogMetaEvent({
          slug: catalogSlug,
          pixelId: id,
          eventName: name,
          value: name === META_CUSTOM_EVENTS.addCart ? 1 : undefined,
          currency: "BRL",
          extra: { source: "admin_test" },
          dual: true,
        });
        const capiPart = sanitizeMetaApiToken(token)
          ? out.capi?.ok
            ? "CAPI ok"
            : `CAPI falhou: ${out.capi?.error || "erro"}`
          : "CAPI pulado (sem token)";
        lines.push(
          `${name} · eventId ${out.eventId} · Pixel ${out.browser ? "ok" : "falhou"} · ${capiPart}`,
        );
        if (out.capi && !out.capi.ok && sanitizeMetaApiToken(token)) {
          setError(out.capi.error || "Falha no CAPI");
        }
      }
      setResult(lines.join("\n"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao testar eventos");
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[20px] font-bold">Pixel e rastreamento</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-[#A8B5AE]">
          Configure o Meta Pixel e o token da Conversions API. O catálogo dispara só eventos
          personalizados — sem PageView/AddToCart padrão.
        </p>
      </div>

      <section className="rounded-[14px] border border-[#1E3A2E] bg-[#0A1F18] p-4">
        <h2 className="text-[15px] font-bold">Meta</h2>
        <div className="mt-3 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] text-[#A8B5AE]">Pixel ID</span>
            <input
              className="field-input font-mono text-[13px]"
              inputMode="numeric"
              placeholder="Ex.: 123456789012345"
              value={pixelId}
              onChange={(e) =>
                setBrand((prev) => ({
                  ...prev,
                  metaPixelId: e.target.value.replace(/\D/g, ""),
                }))
              }
            />
          </label>

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[12px] text-[#A8B5AE]">API Token (Conversions API)</span>
              <button
                type="button"
                className="text-[11px] font-semibold text-[#C9A84C]"
                onClick={() => setShowToken((v) => !v)}
              >
                {showToken ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <input
              className="field-input font-mono text-[13px]"
              type={showToken ? "text" : "password"}
              autoComplete="off"
              placeholder="EAAB..."
              value={token}
              onChange={(e) =>
                setBrand((prev) => ({
                  ...prev,
                  metaApiToken: e.target.value.trim(),
                }))
              }
            />
            <span className="mt-1 block text-[11px] text-[#6B7A72]">
              O token fica só no admin/servidor — nunca vai para o HTML público do catálogo.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-[14px] border border-[#1E3A2E] bg-[#0F281F] p-4">
        <h2 className="text-[15px] font-bold">Eventos personalizados</h2>
        <ul className="mt-3 space-y-2 text-[13px] text-[#A8B5AE]">
          <li>
            <span className="font-mono font-semibold text-[#C9A84C]">
              {META_CUSTOM_EVENTS.pageview}
            </span>{" "}
            — ao abrir o catálogo
          </li>
          <li>
            <span className="font-mono font-semibold text-[#C9A84C]">
              {META_CUSTOM_EVENTS.addCart}
            </span>{" "}
            — ao enviar o pedido do carrinho para o WhatsApp
          </li>
        </ul>
      </section>

      <section className="rounded-[14px] border border-[rgba(201,168,76,0.25)] bg-[#0A1F18] p-4">
        <h2 className="text-[15px] font-bold">Testar eventos</h2>
        <p className="mt-1 text-[12px] text-[#6B7A72]">
          Dispara Pixel no browser + CAPI no servidor (se o token estiver preenchido). Confira no
          Events Manager / Test Events da Meta.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={testing !== null}
            onClick={() => void runTest(META_CUSTOM_EVENTS.pageview)}
            className="h-11 rounded-[10px] border border-[#C9A84C] px-3 text-[12px] font-semibold text-[#C9A84C] disabled:opacity-50"
          >
            {testing === META_CUSTOM_EVENTS.pageview ? "Enviando…" : "Testar PAGEVIEW_CATALOGO"}
          </button>
          <button
            type="button"
            disabled={testing !== null}
            onClick={() => void runTest(META_CUSTOM_EVENTS.addCart)}
            className="h-11 rounded-[10px] border border-[#C9A84C] px-3 text-[12px] font-semibold text-[#C9A84C] disabled:opacity-50"
          >
            {testing === META_CUSTOM_EVENTS.addCart ? "Enviando…" : "Testar ADDCART_CATALOGO"}
          </button>
          <button
            type="button"
            disabled={testing !== null}
            onClick={() => void runTest("both")}
            className="h-11 rounded-[10px] bg-[#C9A84C] px-3 text-[12px] font-semibold text-[#0A1F18] disabled:opacity-50"
          >
            {testing === "both" ? "Enviando…" : "Testar os dois"}
          </button>
        </div>
        {result && (
          <pre className="mt-3 whitespace-pre-wrap rounded-[10px] border border-[#1E3A2E] bg-[#0F281F] px-3 py-2 text-[11px] text-[#A8B5AE]">
            {result}
          </pre>
        )}
        {error && (
          <p className="mt-2 rounded-[8px] border border-[#ef444433] bg-[#ef444418] px-3 py-2 text-[12px] text-[#ef4444]">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
