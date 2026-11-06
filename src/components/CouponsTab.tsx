"use client";

import { useEffect, useState } from "react";
import { normalizeCouponCode } from "@/lib/coupons";
import {
  addManualCouponSale,
  deleteInfluencer,
  listCouponSales,
  listInfluencers,
  upsertInfluencer,
} from "@/lib/supabase/influencers";
import type { CouponSale, Influencer } from "@/lib/types";
import { formatMoney } from "@/lib/utils";

const emptyForm = {
  id: undefined as string | undefined,
  name: "",
  phone: "",
  couponCode: "",
  discountPercent: "10",
  active: true,
  notes: "",
};

export function CouponsTab({ catalogId }: { catalogId: string }) {
  const [items, setItems] = useState<Influencer[]>([]);
  const [sales, setSales] = useState<CouponSale[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [manualTotal, setManualTotal] = useState("");
  const [manualPieces, setManualPieces] = useState("1");
  const [manualName, setManualName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function reload(keepSelected = true) {
    setLoading(true);
    setError(null);
    try {
      const list = await listInfluencers(catalogId);
      setItems(list);
      const nextSelected =
        keepSelected && selectedId && list.some((item) => item.id === selectedId)
          ? selectedId
          : list[0]?.id ?? null;
      setSelectedId(nextSelected);
      if (nextSelected) {
        setSales(await listCouponSales(catalogId, nextSelected));
      } else {
        setSales([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os cupons.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogId]);

  async function openInfluencer(item: Influencer) {
    setSelectedId(item.id);
    setForm({
      id: item.id,
      name: item.name,
      phone: item.phone,
      couponCode: item.couponCode,
      discountPercent: String(item.discountPercent),
      active: item.active,
      notes: item.notes,
    });
    setMessage(null);
    setError(null);
    try {
      setSales(await listCouponSales(catalogId, item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar vendas.");
    }
  }

  function startCreate() {
    setSelectedId(null);
    setForm(emptyForm);
    setSales([]);
    setMessage(null);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await upsertInfluencer(catalogId, {
        id: form.id,
        name: form.name,
        phone: form.phone,
        couponCode: form.couponCode,
        discountPercent: Number(form.discountPercent) || 0,
        active: form.active,
        notes: form.notes,
      });
      setMessage(form.id ? "Influenciador atualizado." : "Influenciador cadastrado.");
      await reload(false);
      await openInfluencer(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!form.id) return;
    if (!window.confirm(`Apagar "${form.name}"? O histórico de vendas permanece.`)) return;
    setBusy(true);
    try {
      await deleteInfluencer(catalogId, form.id);
      startCreate();
      await reload(false);
      setMessage("Influenciador removido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao apagar.");
    } finally {
      setBusy(false);
    }
  }

  async function markSale() {
    if (!form.id) return;
    setBusy(true);
    setError(null);
    try {
      await addManualCouponSale(catalogId, {
        influencerId: form.id,
        customerName: manualName,
        pieces: Number(manualPieces) || 0,
        total: Number(manualTotal.replace(",", ".")) || 0,
      });
      setManualName("");
      setManualPieces("1");
      setManualTotal("");
      setMessage("Venda marcada no cadastro.");
      await openInfluencer({
        id: form.id,
        catalogId,
        name: form.name,
        phone: form.phone,
        couponCode: normalizeCouponCode(form.couponCode),
        discountPercent: Number(form.discountPercent) || 0,
        active: form.active,
        notes: form.notes,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao marcar venda.");
    } finally {
      setBusy(false);
    }
  }

  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold">Cupons e influenciadores</h1>
          <p className="mt-1 text-[12px] text-[#A8B5AE]">
            Cadastre o influenciador com o cupom dele. Cada pedido enviado com esse cupom entra no histórico.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="h-11 rounded-[10px] bg-[#C9A84C] px-4 text-[13px] font-semibold text-black"
        >
          + Influenciador
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-[13px] text-[#6B7A72]">Carregando…</p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-2">
            {items.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[#1E3A2E] px-3 py-6 text-center text-[12px] text-[#6B7A72]">
                Nenhum influenciador ainda.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void openInfluencer(item)}
                  className="w-full rounded-[12px] border px-3 py-3 text-left transition"
                  style={{
                    borderColor: selectedId === item.id ? "#C9A84C" : "#1E3A2E",
                    background: selectedId === item.id ? "#C9A84C18" : "#0A1F18",
                  }}
                >
                  <div className="truncate text-[14px] font-semibold text-white">{item.name}</div>
                  <div className="mt-1 text-[11px] text-[#C9A84C]">{item.couponCode}</div>
                  <div className="mt-1 text-[11px] text-[#6B7A72]">
                    {item.salesCount ?? 0} venda{(item.salesCount ?? 0) === 1 ? "" : "s"} · R${" "}
                    {formatMoney(item.salesTotal ?? 0)}
                    {!item.active ? " · inativo" : ""}
                  </div>
                </button>
              ))
            )}
          </aside>

          <div className="space-y-4">
            <section className="rounded-[14px] border border-[#1E3A2E] bg-[#0A1F18] p-4">
              <h2 className="text-[15px] font-bold">
                {form.id ? "Editar influenciador" : "Novo influenciador"}
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="field-label">Nome</span>
                  <input
                    className="field-input"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex.: Maria Silva"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Cupom</span>
                  <input
                    className="field-input uppercase"
                    value={form.couponCode}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, couponCode: e.target.value.toUpperCase() }))
                    }
                    placeholder="MARIA10"
                  />
                </label>
                <label className="block">
                  <span className="field-label">Desconto (%)</span>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    max={100}
                    value={form.discountPercent}
                    onChange={(e) => setForm((prev) => ({ ...prev, discountPercent: e.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="field-label">WhatsApp (opcional)</span>
                  <input
                    className="field-input"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="47999999999"
                  />
                </label>
                <label className="flex items-center gap-2 pt-6 text-[13px] text-[#A8B5AE]">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                  />
                  Cupom ativo
                </label>
                <label className="block sm:col-span-2">
                  <span className="field-label">Observações</span>
                  <textarea
                    className="field-input min-h-[72px]"
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Comissão combinada, campanha, etc."
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save()}
                  className="h-11 rounded-[10px] bg-[#C9A84C] px-4 text-[13px] font-semibold text-black disabled:opacity-50"
                >
                  Salvar
                </button>
                {form.id && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove()}
                    className="h-11 rounded-[10px] border border-[#ef4444] px-4 text-[13px] font-semibold text-[#ef4444] disabled:opacity-50"
                  >
                    Apagar
                  </button>
                )}
              </div>
              {message && <p className="mt-3 text-[12px] text-[#25D366]">{message}</p>}
              {error && <p className="mt-3 text-[12px] text-[#ef4444]">{error}</p>}
            </section>

            {form.id && selected && (
              <>
                <section className="rounded-[14px] border border-[#1E3A2E] bg-[#0A1F18] p-4">
                  <h2 className="text-[15px] font-bold">Marcar venda manual</h2>
                  <p className="mt-1 text-[11px] text-[#6B7A72]">
                    Use quando o pedido fechou fora do catálogo, mas foi pelo cupom {selected.couponCode}.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <label className="block">
                      <span className="field-label">Cliente</span>
                      <input
                        className="field-input"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Opcional"
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">Peças</span>
                      <input
                        className="field-input"
                        type="number"
                        min={0}
                        value={manualPieces}
                        onChange={(e) => setManualPieces(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="field-label">Total (R$)</span>
                      <input
                        className="field-input"
                        value={manualTotal}
                        onChange={(e) => setManualTotal(e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void markSale()}
                    className="mt-3 h-11 rounded-[10px] border border-[#C9A84C] px-4 text-[13px] font-semibold text-[#C9A84C] disabled:opacity-50"
                  >
                    Marcar no cadastro
                  </button>
                </section>

                <section className="rounded-[14px] border border-[#1E3A2E] bg-[#0A1F18] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[15px] font-bold">Vendas pelo cupom</h2>
                    <span className="text-[12px] text-[#A8B5AE]">
                      {selected.salesCount ?? sales.length} · R$ {formatMoney(selected.salesTotal ?? 0)}
                    </span>
                  </div>
                  {sales.length === 0 ? (
                    <p className="mt-3 text-[12px] text-[#6B7A72]">Nenhuma venda registrada ainda.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {sales.map((sale) => (
                        <div
                          key={sale.id}
                          className="rounded-[10px] border border-[#1E3A2E] bg-[#0F281F] px-3 py-2 text-[12px]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white">
                              {sale.customerName || "Cliente"}
                            </span>
                            <span className="text-[#C9A84C]">R$ {formatMoney(sale.total)}</span>
                          </div>
                          <div className="mt-1 text-[#6B7A72]">
                            {sale.pieces} peça{sale.pieces === 1 ? "" : "s"} · {sale.source === "manual" ? "manual" : "WhatsApp"} ·{" "}
                            {new Date(sale.createdAt).toLocaleString("pt-BR")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
