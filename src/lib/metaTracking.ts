import type { Brand, MetaCustomEventName } from "@/lib/types";

export const META_CUSTOM_EVENTS = {
  pageview: "PAGEVIEW_CATALOGO",
  addCart: "ADDCART_CATALOGO",
} as const satisfies Record<string, MetaCustomEventName>;

type FbqFn = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

export function createMetaEventId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeMetaPixelId(raw: string | undefined | null): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length >= 5 ? digits : "";
}

export function sanitizeMetaApiToken(raw: string | undefined | null): string {
  return String(raw ?? "").trim();
}

/** Remove segredos antes de enviar brand ao catálogo público. */
export function stripBrandTrackingSecrets(brand: Brand): Brand {
  if (!brand.metaApiToken) return brand;
  const { metaApiToken: _token, ...rest } = brand;
  return rest;
}

function ensureFbqStub(): FbqFn {
  if (typeof window === "undefined") {
    return (() => undefined) as FbqFn;
  }
  if (window.fbq) return window.fbq;

  const stub = function (...args: unknown[]) {
    (stub.queue = stub.queue || []).push(args);
  } as FbqFn;
  stub.queue = [];
  stub.loaded = true;
  stub.version = "2.0";
  window.fbq = stub;
  window._fbq = stub;
  return stub;
}

/** Carrega o script do Pixel e faz init sem PageView padrão. */
export async function initMetaPixel(pixelId: string): Promise<boolean> {
  const id = sanitizeMetaPixelId(pixelId);
  if (!id || typeof window === "undefined" || typeof document === "undefined") return false;

  const fbq = ensureFbqStub();
  const already = document.querySelector<HTMLScriptElement>('script[data-vesto-meta-pixel="1"]');
  if (!already) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.dataset.vestoMetaPixel = "1";
    document.head.appendChild(script);
    await new Promise<void>((resolve) => {
      script.onload = () => resolve();
      script.onerror = () => resolve();
      window.setTimeout(() => resolve(), 2500);
    });
  }

  fbq("init", id);
  return true;
}

/** Só eventos personalizados — nunca track padrão (PageView, AddToCart, etc.). */
export function trackMetaCustomEvent(
  eventName: MetaCustomEventName,
  params?: Record<string, unknown>,
  eventId?: string,
) {
  if (typeof window === "undefined" || !window.fbq) return;
  const options = eventId ? { eventID: eventId } : undefined;
  window.fbq("trackCustom", eventName, params ?? {}, options);
}

export async function sendMetaCapiEvent(input: {
  slug: string;
  eventName: MetaCustomEventName;
  eventId: string;
  value?: number;
  currency?: string;
  testEventCode?: string;
}): Promise<{ ok: boolean; error?: string; eventsReceived?: number }> {
  try {
    const res = await fetch("/api/catalog/meta/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      events_received?: number;
    };
    if (!res.ok) return { ok: false, error: data.error || "Falha ao enviar evento CAPI" };
    return { ok: true, eventsReceived: data.events_received };
  } catch {
    return { ok: false, error: "Falha de rede ao enviar evento CAPI" };
  }
}

export async function fireCatalogMetaEvent(input: {
  slug?: string;
  pixelId?: string;
  eventName: MetaCustomEventName;
  value?: number;
  currency?: string;
  extra?: Record<string, unknown>;
  /** Se true, tenta Pixel no browser + CAPI no servidor. */
  dual?: boolean;
}): Promise<{ eventId: string; browser: boolean; capi?: { ok: boolean; error?: string } }> {
  const eventId = createMetaEventId(input.eventName.toLowerCase());
  const params = {
    catalog_slug: input.slug || undefined,
    ...(input.value != null ? { value: input.value, currency: input.currency || "BRL" } : {}),
    ...(input.extra ?? {}),
  };

  let browser = false;
  const pixelId = sanitizeMetaPixelId(input.pixelId);
  if (pixelId) {
    browser = await initMetaPixel(pixelId);
    if (browser) trackMetaCustomEvent(input.eventName, params, eventId);
  }

  let capi: { ok: boolean; error?: string } | undefined;
  if (input.dual !== false && input.slug) {
    capi = await sendMetaCapiEvent({
      slug: input.slug,
      eventName: input.eventName,
      eventId,
      value: input.value,
      currency: input.currency || "BRL",
    });
  }

  return { eventId, browser, capi };
}
