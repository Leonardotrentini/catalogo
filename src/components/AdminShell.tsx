"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminApp } from "@/components/AdminApp";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Profile } from "@/lib/types";
import { VestoLogo } from "@/components/VestoLogo";

export function AdminShell() {
  const router = useRouter();
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
          router.replace("/admin/login");
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

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
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
          onClick={() => router.push("/admin/login")}
          className="rounded-[10px] bg-[#C9A84C] px-4 py-2 text-[14px] font-semibold text-[#0A1F18]"
        >
          Ir para login
        </button>
      </div>
    );
  }

  if (profile.role === "super_admin" && !profile.catalog_slug) {
    return (
      <div className="min-h-screen bg-[#0A1F18] text-white">
        <header className="flex items-center justify-between border-b border-[rgba(201,168,76,0.18)] px-6 py-4">
          <div className="flex items-center gap-3">
            <VestoLogo size={44} />
            <div>
              <div className="font-bold">Super Admin</div>
              <div className="text-[12px] text-[#A8B5AE]">{profile.email}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/admin/super")}
              className="rounded-[10px] border border-[#C9A84C] px-4 py-2 text-[13px] font-semibold text-[#C9A84C]"
            >
              Gerenciar usuários
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-[10px] bg-[#122E23] px-4 py-2 text-[13px] text-[#A8B5AE]"
            >
              Sair
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-6 py-16 text-center">
          <p className="text-[18px] font-semibold">Painel de administração</p>
          <p className="mt-2 text-[14px] text-[#A8B5AE]">
            Como super admin, você gerencia lojistas e catálogos. Use o botão acima para criar e controlar usuários.
          </p>
        </main>
      </div>
    );
  }

  if (!profile.catalog_slug) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0A1F18] px-6 text-center text-white">
        <p className="text-[16px] font-semibold">Catálogo não configurado</p>
        <p className="text-[13px] text-[#A8B5AE]">Peça ao administrador para vincular um slug ao seu usuário.</p>
      </div>
    );
  }

  return (
    <AdminApp
      catalogSlug={profile.catalog_slug}
      userEmail={profile.email}
      isSuperAdmin={profile.role === "super_admin"}
      onLogout={() => void handleLogout()}
      onOpenSuperAdmin={() => router.push("/admin/super")}
    />
  );
}
