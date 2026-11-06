"use client";

import { useMemo, useState } from "react";
import {
  BLING_DEMO_PRODUCTS,
  HIPER_DEMO_PRODUCTS,
  type ErpDemoProduct,
} from "@/lib/integrations/blingDemo";
import { formatMoney } from "@/lib/utils";

type Step = "idle" | "connecting" | "connected" | "importing" | "imported" | "synced";

type ProviderId = "bling" | "hiper";

/**
 * Demo local das integrações Bling + Hiper — UI completa com dados mock.
 * Não grava no Supabase nem chama APIs reais.
 */
export function IntegrationsTab() {
  const [log, setLog] = useState<string[]>([]);

  function pushLog(message: string) {
    setLog((prev) => [`${new Date().toLocaleTimeString("pt-BR")} · ${message}`, ...prev].slice(0, 12));
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C55] bg-[#C9A84C18] px-3 py-1 text-[11px] font-semibold text-[#C9A84C]">
          DEMO LOCAL · não grava no banco
        </div>
        <h1 className="mt-3 text-[20px] font-bold">Integrações</h1>
        <p className="mt-1 text-[13px] text-[#A8B5AE]">
          Protótipo Bling e Hiper: importar produtos e dar baixa no estoque quando sair pedido no catálogo.
        </p>
      </div>

      <ErpDemoPanel
        provider="bling"
        title="Bling ERP"
        subtitle="OAuth · produtos · estoques · pedidos"
        badge="B"
        badgeColor="#1B4DFF"
        connectLabel="Conectar Bling"
        productsSource={BLING_DEMO_PRODUCTS}
        sampleSku="CAM-OVS-001"
        sampleProductId="bling-1001"
        sampleOrderLabel="Camiseta Oversized · 12 un."
        sampleDelta={12}
        connectHint="Abrindo autorização OAuth do Bling (simulado)…"
        connectedHint="Conta Bling autorizada · escopos: produtos, estoques, pedidos"
        onLog={pushLog}
      />

      <ErpDemoPanel
        provider="hiper"
        title="Hiper"
        subtitle="API personalizada · grade cor/tamanho · atacarejo"
        badge="H"
        badgeColor="#E85D04"
        connectLabel="Conectar Hiper"
        productsSource={HIPER_DEMO_PRODUCTS}
        sampleSku="7891002001001"
        sampleProductId="hiper-2001"
        sampleOrderLabel="Calça Jeans Skinny · 8 un."
        sampleDelta={8}
        connectHint="Validando chave da loja virtual Hiper (simulado)…"
        connectedHint="Hiper conectado · Pacote varejo digital · webhook estoque ativo"
        onLog={pushLog}
      />

      <section className="rounded-[14px] border border-[#1E3A2E] bg-[#0A1F18] p-4 opacity-70">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[14px] font-bold">Kyte</div>
            <div className="text-[12px] text-[#6B7A72]">Sem API pública documentada</div>
          </div>
          <span className="rounded-full border border-[#2a2a2e] px-3 py-1 text-[11px] text-[#6B7A72]">
            Indisponível
          </span>
        </div>
      </section>

      {log.length > 0 && (
        <section className="rounded-[14px] border border-[#1E3A2E] bg-[#071510] p-4">
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B7A72]">
            Log da demo
          </h2>
          <ul className="space-y-1.5 font-mono text-[11px] text-[#A8B5AE]">
            {log.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ErpDemoPanel({
  provider,
  title,
  subtitle,
  badge,
  badgeColor,
  connectLabel,
  productsSource,
  sampleSku,
  sampleProductId,
  sampleOrderLabel,
  sampleDelta,
  connectHint,
  connectedHint,
  onLog,
}: {
  provider: ProviderId;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  connectLabel: string;
  productsSource: Omit<ErpDemoProduct, "selected">[];
  sampleSku: string;
  sampleProductId: string;
  sampleOrderLabel: string;
  sampleDelta: number;
  connectHint: string;
  connectedHint: string;
  onLog: (message: string) => void;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [products, setProducts] = useState<ErpDemoProduct[]>(() =>
    productsSource.map((p) => ({ ...p, selected: true })),
  );
  const [syncStock, setSyncStock] = useState(true);
  const [baixaOnOrder, setBaixaOnOrder] = useState(true);
  const [lastImportAt, setLastImportAt] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => products.filter((p) => p.selected).length,
    [products],
  );
  const connected =
    step === "connected" || step === "importing" || step === "imported" || step === "synced";

  async function connect() {
    setStep("connecting");
    onLog(connectHint);
    await wait(900);
    onLog(connectedHint);
    setStep("connected");
  }

  function disconnect() {
    setStep("idle");
    setLastImportAt(null);
    onLog(`${title} desconectado`);
  }

  async function importSelected() {
    if (selectedCount === 0) return;
    setStep("importing");
    onLog(`Importando ${selectedCount} produto(s) do ${title}…`);
    await wait(700);
    onLog(
      provider === "hiper"
        ? "Lendo grade (cor × tamanho), SKU/código de barras e estoque…"
        : "Mapeando grade (cores × tamanhos) e estoque…",
    );
    await wait(800);
    setLastImportAt(new Date().toLocaleString("pt-BR"));
    setStep("imported");
    onLog(`Importação ${title} concluída (demo — nada gravado no catálogo real)`);
  }

  async function simulateOrderBaixa() {
    setStep("synced");
    onLog(`Pedido Vesto simulado: ${sampleOrderLabel}`);
    await wait(500);
    if (baixaOnOrder) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === sampleProductId
            ? { ...p, estoque: Math.max(0, p.estoque - sampleDelta) }
            : p,
        ),
      );
      onLog(
        provider === "hiper"
          ? `Pedido de venda Hiper + baixa estoque: ${sampleSku} −${sampleDelta} (simulado)`
          : `Baixa no estoque ${title}: ${sampleSku} −${sampleDelta} (simulado)`,
      );
    } else {
      onLog(`Baixa automática desligada — estoque ${title} não alterado`);
    }
  }

  function toggleAll(next: boolean) {
    setProducts((prev) => prev.map((p) => ({ ...p, selected: next })));
  }

  return (
    <section className="rounded-[14px] border border-[rgba(201,168,76,0.18)] bg-[#0F281F] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[12px] text-[13px] font-black text-white"
            style={{ background: badgeColor }}
          >
            {badge}
          </div>
          <div>
            <div className="text-[15px] font-bold">{title}</div>
            <div className="text-[12px] text-[#A8B5AE]">
              {connected ? "Conectado (conta demo)" : subtitle}
            </div>
          </div>
        </div>
        {!connected ? (
          <button
            type="button"
            onClick={() => void connect()}
            disabled={step === "connecting"}
            className="h-11 rounded-[10px] bg-[#C9A84C] px-4 text-[13px] font-semibold text-[#0A1F18] disabled:opacity-60"
          >
            {step === "connecting" ? "Conectando…" : connectLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={disconnect}
            className="h-11 rounded-[10px] border border-[#2a2a2e] px-4 text-[13px] text-[#A8B5AE]"
          >
            Desconectar
          </button>
        )}
      </div>

      {connected && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between rounded-[10px] border border-[#1E3A2E] bg-[#0A1F18] px-3 py-3">
              <span className="text-[13px]">
                Sincronizar estoque
                <span className="mt-0.5 block text-[11px] text-[#6B7A72]">
                  Puxar quantidades do {title}
                </span>
              </span>
              <input
                type="checkbox"
                checked={syncStock}
                onChange={(e) => setSyncStock(e.target.checked)}
                className="h-4 w-4 accent-[#C9A84C]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-[10px] border border-[#1E3A2E] bg-[#0A1F18] px-3 py-3">
              <span className="text-[13px]">
                Baixa automática
                <span className="mt-0.5 block text-[11px] text-[#6B7A72]">
                  {provider === "hiper"
                    ? "Criar pedido de venda no Hiper"
                    : "Ao fechar pedido no Vesto"}
                </span>
              </span>
              <input
                type="checkbox"
                checked={baixaOnOrder}
                onChange={(e) => setBaixaOnOrder(e.target.checked)}
                className="h-4 w-4 accent-[#C9A84C]"
              />
            </label>
          </div>

          <div className="mt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-bold">Produtos no {title}</h2>
                <p className="text-[12px] text-[#6B7A72]">
                  {selectedCount} selecionado(s)
                  {lastImportAt ? ` · última importação ${lastImportAt}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="h-9 rounded-[8px] border border-[#2a2a2e] px-3 text-[12px] text-[#A8B5AE]"
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="h-9 rounded-[8px] border border-[#2a2a2e] px-3 text-[12px] text-[#A8B5AE]"
                >
                  Nenhum
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0 || step === "importing"}
                  onClick={() => void importSelected()}
                  className="h-9 rounded-[8px] bg-[#C9A84C] px-3 text-[12px] font-semibold text-[#0A1F18] disabled:opacity-40"
                >
                  {step === "importing" ? "Importando…" : "Importar selecionados"}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {products.map((product) => (
                <label
                  key={product.id}
                  className="flex cursor-pointer gap-3 rounded-[12px] border border-[#1E3A2E] bg-[#0A1F18] p-3"
                >
                  <input
                    type="checkbox"
                    checked={product.selected}
                    onChange={(e) =>
                      setProducts((prev) =>
                        prev.map((p) =>
                          p.id === product.id ? { ...p, selected: e.target.checked } : p,
                        ),
                      )
                    }
                    className="mt-1 h-4 w-4 accent-[#C9A84C]"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imagem}
                    alt=""
                    className="h-14 w-14 rounded-[10px] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{product.nome}</div>
                    <div className="mt-0.5 text-[11px] text-[#6B7A72]">
                      {product.codigo} · {product.categoria}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-[#C9A84C]">
                        R$ {formatMoney(product.preco)}
                      </span>
                      <span className="rounded-full bg-[#122E23] px-2 py-0.5 text-[11px] text-[#A8B5AE]">
                        Estoque {product.estoque}
                      </span>
                      <span className="text-[11px] text-[#6B7A72]">
                        {product.tamanhos.join(", ")}
                      </span>
                      <span className="flex items-center gap-1">
                        {product.cores.map((hex) => (
                          <span
                            key={hex}
                            className="h-3 w-3 rounded-full border border-white/20"
                            style={{ background: hex }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void simulateOrderBaixa()}
                className="h-10 rounded-[10px] border border-[#25D36655] px-4 text-[12px] font-semibold text-[#25D366]"
              >
                Simular pedido + baixa estoque
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
