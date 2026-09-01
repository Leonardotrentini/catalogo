"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types";
import { catalogPublicUrl, tenantPanelLoginUrl } from "@/lib/hosts";
import { VestoLogo } from "@/components/VestoLogo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SuperAdminPanel() {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [catalogSlug, setCatalogSlug] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Falha ao carregar usuários");
      }
      setUsers((await res.json()) as Profile[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, catalogSlug, role: "tenant" }),
      });
      const slug = catalogSlug.trim().toLowerCase();
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao criar usuário");
      setEmail("");
      setPassword("");
      setFullName("");
      setCatalogSlug("");
      setMessage(`Usuário criado! Painel: ${tenantPanelLoginUrl(slug)}`);
      await loadUsers();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(user: Profile) {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    if (res.ok) await loadUsers();
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[#0A1F18] text-white">
      <header className="flex items-center justify-between border-b border-[rgba(201,168,76,0.18)] px-6 py-4">
        <div className="flex items-center gap-3">
          <VestoLogo size={44} />
          <div>
            <div className="font-bold">Super Admin — Usuários</div>
            <div className="text-[12px] text-[#A8B5AE]">Gerencie lojistas e acessos</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-[10px] border border-white/10 px-4 py-2 text-[13px] text-[#A8B5AE]"
          >
            Voltar
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

      <main className="mx-auto max-w-4xl px-6 py-8">
        <section className="mb-10 rounded-[14px] border border-[rgba(201,168,76,0.2)] bg-[#122E23] p-6">
          <h2 className="mb-4 text-[16px] font-semibold">Novo lojista</h2>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#A8B5AE]">Nome</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-white/10 bg-[#0A1F18] px-3 text-[14px]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#A8B5AE]">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-white/10 bg-[#0A1F18] px-3 text-[14px]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#A8B5AE]">Senha</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-white/10 bg-[#0A1F18] px-3 text-[14px]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#A8B5AE]">Slug do catálogo (subdomínio)</span>
              <input
                required
                placeholder="baseset"
                value={catalogSlug}
                onChange={(e) => setCatalogSlug(e.target.value)}
                className="h-10 w-full rounded-[10px] border border-white/10 bg-[#0A1F18] px-3 text-[14px]"
              />
              {catalogSlug.trim() && (
                <span className="mt-1 block text-[11px] text-[#6B7A72]">
                  Catálogo público: {catalogPublicUrl(catalogSlug.trim().toLowerCase())}
                  <br />
                  Login do lojista: {tenantPanelLoginUrl(catalogSlug.trim().toLowerCase())}
                </span>
              )}
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={creating}
                className="h-10 rounded-[10px] bg-[#C9A84C] px-5 text-[13px] font-semibold text-[#0A1F18] disabled:opacity-60"
              >
                {creating ? "Criando…" : "Criar usuário"}
              </button>
            </div>
          </form>
          {message && <p className="mt-3 text-[13px] text-[#C9A84C]">{message}</p>}
        </section>

        <section>
          <h2 className="mb-4 text-[16px] font-semibold">Usuários cadastrados</h2>
          {loading && <p className="text-[#A8B5AE]">Carregando…</p>}
          {error && <p className="text-[#ef4444]">{error}</p>}
          {!loading && !error && (
            <div className="overflow-x-auto rounded-[14px] border border-white/10">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead className="bg-[#122E23] text-[#A8B5AE]">
                  <tr>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Papel</th>
                    <th className="px-4 py-3 font-medium">Catálogo público</th>
                    <th className="px-4 py-3 font-medium">Painel (login)</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-t border-white/5">
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.full_name || "—"}</td>
                      <td className="px-4 py-3">{user.role}</td>
                      <td className="px-4 py-3">
                        {user.catalog_slug ? (
                          <a
                            href={catalogPublicUrl(user.catalog_slug)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#C9A84C] underline"
                          >
                            {user.catalog_slug}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {user.catalog_slug ? (
                          <a
                            href={tenantPanelLoginUrl(user.catalog_slug)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#C9A84C] underline"
                          >
                            Entrar
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{user.is_active ? "Ativo" : "Inativo"}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void toggleActive(user)}
                          className="text-[12px] text-[#A8B5AE] underline"
                        >
                          {user.is_active ? "Desativar" : "Ativar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
