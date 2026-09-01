"use client";

import type { BrandSeller } from "@/lib/types";
import { newSellerId } from "@/lib/sellers";

export function SellersEditor({
  sellers,
  onChange,
}: {
  sellers: BrandSeller[];
  onChange: (sellers: BrandSeller[]) => void;
}) {
  function updateSeller(index: number, patch: Partial<BrandSeller>) {
    onChange(sellers.map((seller, i) => (i === index ? { ...seller, ...patch } : seller)));
  }

  function removeSeller(index: number) {
    onChange(sellers.filter((_, i) => i !== index));
  }

  function addSeller() {
    onChange([...sellers, { id: newSellerId(), name: "", phone: "" }]);
  }

  return (
    <section>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-bold">Vendedores</h2>
          <p className="mt-1 text-[12px] text-[#6B7A72]">
            Nome e WhatsApp de cada vendedor. No checkout o cliente escolhe para quem enviar o pedido.
          </p>
        </div>
        <button
          type="button"
          onClick={addSeller}
          className="h-9 shrink-0 rounded-[8px] border border-[#C9A84C] px-3 text-[12px] font-semibold text-[#C9A84C]"
        >
          + Vendedor
        </button>
      </div>

      {sellers.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-[#1E3A2E] bg-[#0A1F18] px-3 py-4 text-[12px] text-[#6B7A72]">
          Nenhum vendedor cadastrado. Adicione pelo menos um para receber pedidos.
        </p>
      ) : (
        <div className="space-y-3">
          {sellers.map((seller, index) => (
            <div
              key={seller.id}
              className="rounded-[12px] border border-[#1E3A2E] bg-[#0A1F18] p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-[#A8B5AE]">
                  Vendedor {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeSeller(index)}
                  className="flex h-8 w-8 items-center justify-center text-[#ef4444]"
                  aria-label="Remover vendedor"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="field-label">Nome</span>
                  <input
                    className="field-input"
                    placeholder="Ex: João"
                    value={seller.name}
                    onChange={(e) => updateSeller(index, { name: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="field-label">WhatsApp</span>
                  <input
                    className="field-input"
                    placeholder="5511999999999"
                    value={seller.phone}
                    onChange={(e) => updateSeller(index, { phone: e.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
