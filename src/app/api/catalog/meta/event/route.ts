import { NextResponse } from "next/server";
import {
  META_CUSTOM_EVENTS,
  sanitizeMetaApiToken,
  sanitizeMetaPixelId,
} from "@/lib/metaTracking";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MetaCustomEventName } from "@/lib/types";

export const runtime = "nodejs";

type Body = {
  slug?: string;
  eventName?: string;
  eventId?: string;
  value?: number;
  currency?: string;
  testEventCode?: string;
  eventSourceUrl?: string;
};

const ALLOWED = new Set<string>([
  META_CUSTOM_EVENTS.pageview,
  META_CUSTOM_EVENTS.addCart,
]);

function clientIp(req: Request): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || undefined;
  return req.headers.get("x-real-ip") || undefined;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const slug = String(body.slug ?? "")
    .trim()
    .toLowerCase();
  const eventName = String(body.eventName ?? "").trim() as MetaCustomEventName;
  const eventId = String(body.eventId ?? "").trim();

  if (!slug) return NextResponse.json({ error: "slug obrigatório" }, { status: 400 });
  if (!ALLOWED.has(eventName)) {
    return NextResponse.json({ error: "evento não permitido" }, { status: 400 });
  }
  if (!eventId) return NextResponse.json({ error: "eventId obrigatório" }, { status: 400 });

  try {
    const supabase = createSupabaseAdminClient();
    const { data: catalog, error } = await supabase
      .from("catalogs")
      .select("brand, is_published")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!catalog || !catalog.is_published) {
      return NextResponse.json({ error: "Catálogo não encontrado" }, { status: 404 });
    }

    const brand = (catalog.brand ?? {}) as {
      metaPixelId?: string;
      metaApiToken?: string;
    };
    const pixelId = sanitizeMetaPixelId(brand.metaPixelId);
    const token = sanitizeMetaApiToken(brand.metaApiToken);

    if (!pixelId) {
      return NextResponse.json({ error: "Pixel ID não configurado" }, { status: 400 });
    }
    if (!token) {
      return NextResponse.json({ error: "API Token não configurado" }, { status: 400 });
    }

    const eventSourceUrl =
      body.eventSourceUrl ||
      req.headers.get("referer") ||
      `https://catalogovesto.vercel.app/catalog/${slug}`;

    const customData: Record<string, unknown> = {
      catalog_slug: slug,
    };
    if (typeof body.value === "number" && Number.isFinite(body.value)) {
      customData.value = body.value;
      customData.currency = (body.currency || "BRL").toUpperCase();
    }

    const userData: Record<string, unknown> = {
      client_user_agent: req.headers.get("user-agent") || undefined,
      client_ip_address: clientIp(req),
    };

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: "website",
          event_source_url: eventSourceUrl,
          user_data: userData,
          custom_data: customData,
        },
      ],
    };

    const testCode = String(body.testEventCode ?? "").trim();
    if (testCode) payload.test_event_code = testCode;

    const graphUrl = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`;
    const graphRes = await fetch(graphUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const graphJson = (await graphRes.json().catch(() => ({}))) as {
      events_received?: number;
      error?: { message?: string };
      fbtrace_id?: string;
    };

    if (!graphRes.ok) {
      return NextResponse.json(
        {
          error: graphJson.error?.message || "Meta CAPI rejeitou o evento",
          fbtrace_id: graphJson.fbtrace_id,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      eventName,
      eventId,
      events_received: graphJson.events_received ?? 1,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
