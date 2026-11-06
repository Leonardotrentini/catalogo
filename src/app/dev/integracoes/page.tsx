"use client";

import { IntegrationsTab } from "@/components/IntegrationsTab";

/** Página local de preview da integração — abra em /dev/integracoes */
export default function DevIntegracoesPage() {
  return (
    <div className="min-h-screen bg-[#0A1F18] text-white">
      <header className="border-b border-[rgba(201,168,76,0.18)] px-6 py-4">
        <div className="mx-auto flex max-w-[680px] items-center justify-between gap-3">
          <div>
            <div className="text-[15px] font-bold">Vesto · Preview de Integrações</div>
            <div className="text-[12px] text-[#6B7A72]">Somente local · dados mock do Bling</div>
          </div>
          <a
            href="/admin"
            className="rounded-[8px] border border-[#2a2a2e] px-3 py-2 text-[12px] text-[#A8B5AE]"
          >
            Ir ao admin
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-[680px] px-6 py-7">
        <IntegrationsTab />
      </main>
    </div>
  );
}
