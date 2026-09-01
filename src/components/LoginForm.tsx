"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { VestoLogo } from "@/components/VestoLogo";

export function LoginForm({
  catalogSlug,
  redirectTo = "/admin",
}: {
  catalogSlug?: string | null;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storeLabel = catalogSlug ? catalogSlug : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1F18] px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[16px] border border-[rgba(201,168,76,0.2)] bg-[#122E23] p-8"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <VestoLogo size={56} />
          <h1 className="text-[18px] font-bold text-white">Vesto Catálogo</h1>
          {storeLabel ? (
            <>
              <p className="text-center text-[15px] font-semibold text-[#C9A84C]">{storeLabel}</p>
              <p className="text-center text-[13px] text-[#A8B5AE]">
                Entre para configurar e publicar seu catálogo
              </p>
            </>
          ) : (
            <p className="text-center text-[13px] text-[#A8B5AE]">Entre para gerenciar seu catálogo</p>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-[10px] bg-[#ef4444]/15 px-3 py-2 text-center text-[13px] text-[#fca5a5]">
            {error}
          </p>
        )}

        <label className="mb-4 block">
          <span className="mb-1 block text-[12px] text-[#A8B5AE]">E-mail</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-white/10 bg-[#0A1F18] px-3 text-[14px] text-white outline-none focus:border-[#C9A84C]"
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1 block text-[12px] text-[#A8B5AE]">Senha</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-white/10 bg-[#0A1F18] px-3 text-[14px] text-white outline-none focus:border-[#C9A84C]"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-[10px] bg-[#C9A84C] text-[14px] font-semibold text-[#0A1F18] disabled:opacity-60"
        >
          {loading ? "Entrando…" : "Entrar no painel"}
        </button>
      </form>
    </div>
  );
}
