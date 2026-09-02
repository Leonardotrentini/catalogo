"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminApp } from "@/components/AdminApp";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Profile } from "@/lib/types";
import { VestoLogo } from "@/components/VestoLogo";

export function AdminShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const impersonateSlug = searchParams.get("slug")?.trim().toLowerCase() || null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login");
          return;
        }

        let { data: row } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

        if (!row) {
          const res = await fetch("/api/auth/bootstrap", { method: "POST" });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(body.error ?? "Não foi possível criar seu perfil.");
          }
          row = (await res.json()) as Profile;
        }

        if (!row.is_active) {
          await supabase.auth.signOut();
          throw new Error("Sua conta está desativada. Fale com o administrador.");
        }

        if (cancelled) return;
        setProfile(row as Profile);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar sessão");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!profile || loading) return;
    if (profile.role === "super_admin" && !impersonateSlug) {
      router.replace("/admin/super");
    }
  }, [profile, impersonateSlug, loading, router]);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1F18] text-[#A8B5AE]">
        Carregando painel…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A1F18] px-6 text-center text-white">
        <VestoLogo size={56} />
        <p className="text-[16px] font-semibold text-[#ef4444]">{error ?? "Sessão inválida"}</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="rounded-[10px] bg-[#C9A84C] px-4 py-2 text-[14px] font-semibold text-[#0A1F18]"
        >
          Ir para login
        </button>
      </div>
    );
  }

  if (profile.role === "super_admin" && !impersonateSlug) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A1F18] text-[#A8B5AE]">
        Redirecionando…
      </div>
    );
  }

  const catalogSlug =
    profile.role === "super_admin" && impersonateSlug ? impersonateSlug : profile.catalog_slug;

  if (!catalogSlug) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0A1F18] px-6 text-center text-white">
        <p className="text-[16px] font-semibold">Catálogo não configurado</p>
        <p className="text-[13px] text-[#A8B5AE]">Peça ao administrador para vincular um slug ao seu usuário.</p>
      </div>
    );
  }

  return (
    <AdminApp
      catalogSlug={catalogSlug}
      userEmail={profile.email}
      isSuperAdmin={profile.role === "super_admin"}
      onLogout={() => void handleLogout()}
      onOpenSuperAdmin={() => router.push("/admin/super")}
    />
  );
}
