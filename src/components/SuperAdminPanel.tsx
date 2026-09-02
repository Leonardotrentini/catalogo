"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, UserRole } from "@/lib/types";
import { catalogPublicUrl, tenantPanelLoginUrl } from "@/lib/hosts";
import { VestoLogo } from "@/components/VestoLogo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type EditForm = {
  fullName: string;
  email: string;
  password: string;
  catalogSlug: string;
  role: UserRole;
  isActive: boolean;
};

function emptyEditForm(): EditForm {
  return {
    fullName: "",
    email: "",
    password: "",
    catalogSlug: "",
    role: "tenant",
    isActive: true,
  };
}

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

  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  function openEdit(user: Profile) {
    setEditingUser(user);
    setEditForm({
      fullName: user.full_name ?? "",
      email: user.email,
      password: "",
      catalogSlug: user.catalog_slug ?? "",
      role: user.role,
      isActive: user.is_active,
    });
    setEditError(null);
  }

  function closeEdit() {
    setEditingUser(null);
    setEditForm(emptyEditForm());
    setEditError(null);
  }

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

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const payload: Record<string, unknown> = {
        fullName: editForm.fullName,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.isActive,
      };
      if (editForm.password.trim()) payload.password = editForm.password.trim();
      if (editForm.role === "tenant") payload.catalogSlug = editForm.catalogSlug;

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Erro ao salvar usuário");
      closeEdit();
      setMessage("Usuário atualizado.");
      await loadUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSavingEdit(false);
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

  const inputClass =
    "h-10 w-full rounded-[10px] border border-white/10 bg-[#0A1F18] px-3 text-[14px] text-white outline-none focus:border-[#C9A84C]";

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
            onClick={() => router.push("/admin/super")}
            className="rounded-[10px] border border-white/10 px-4 py-2 text-[13px] text-[#A8B5AE]"
          >
            Usuários
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
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#A8B5AE]">E-mail</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
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
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] text-[#A8B5AE]">Slug do catálogo (subdomínio)</span>
              <input
                required
                placeholder="baseset"
                value={catalogSlug}
                onChange={(e) => setCatalogSlug(e.target.value)}
                className={inputClass}
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
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead className="bg-[#122E23] text-[#A8B5AE]">
                  <tr>
                    <th className="px-4 py-3 font-medium">E-mail</th>
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Papel</th>
                    <th className="px-4 py-3 font-medium">Catálogo público</th>
                    <th className="px-4 py-3 font-medium">Painel</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Ações</th>
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
                          <button
                            type="button"
                            onClick={() =>
                              router.push(`/admin?slug=${encodeURIComponent(user.catalog_slug!)}`)
                            }
                            className="text-[#C9A84C] underline"
                          >
                            Entrar
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">{user.is_active ? "Ativo" : "Inativo"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="text-[12px] text-[#C9A84C] underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleActive(user)}
                            className="text-[12px] text-[#A8B5AE] underline"
                          >
                            {user.is_active ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="w-full max-w-lg rounded-[16px] border border-[rgba(201,168,76,0.2)] bg-[#122E23] p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="edit-user-title" className="text-[16px] font-semibold">
                  Editar usuário
                </h3>
                <p className="mt-1 text-[12px] text-[#A8B5AE]">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#A8B5AE] hover:bg-white/5"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#A8B5AE]">Nome</span>
                <input
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#A8B5AE]">E-mail</span>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#A8B5AE]">Nova senha (opcional)</span>
                <input
                  type="password"
                  minLength={6}
                  placeholder="Deixe em branco para manter"
                  value={editForm.password}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] text-[#A8B5AE]">Papel</span>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      role: e.target.value as UserRole,
                      catalogSlug: e.target.value === "super_admin" ? "" : prev.catalogSlug,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="tenant">tenant (lojista)</option>
                  <option value="super_admin">super_admin</option>
                </select>
              </label>
              {editForm.role === "tenant" && (
                <label className="block">
                  <span className="mb-1 block text-[12px] text-[#A8B5AE]">Slug do catálogo</span>
                  <input
                    required
                    value={editForm.catalogSlug}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, catalogSlug: e.target.value }))}
                    className={inputClass}
                  />
                  {editForm.catalogSlug.trim() && (
                    <span className="mt-1 block text-[11px] text-[#6B7A72]">
                      {catalogPublicUrl(editForm.catalogSlug.trim().toLowerCase())}
                    </span>
                  )}
                </label>
              )}
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 accent-[#C9A84C]"
                />
                Conta ativa
              </label>
              {editError && (
                <p className="rounded-[8px] border border-[#ef444433] bg-[#ef444418] px-3 py-2 text-[12px] text-[#ef4444]">
                  {editError}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="h-10 flex-1 rounded-[10px] border border-white/10 text-[13px] text-[#A8B5AE]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="h-10 flex-1 rounded-[10px] bg-[#C9A84C] text-[13px] font-semibold text-[#0A1F18] disabled:opacity-60"
                >
                  {savingEdit ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
