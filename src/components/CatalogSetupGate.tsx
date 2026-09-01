"use client";

import Link from "next/link";
import { VestoLogo } from "@/components/VestoLogo";
import { tenantPanelLoginUrl } from "@/lib/hosts";

export function CatalogSetupGate({ slug }: { slug: string }) {
  const loginHref = tenantPanelLoginUrl(slug);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A1F18] px-6 text-center text-white">
      <VestoLogo size={64} />
      <h1 className="mt-6 text-[22px] font-bold capitalize">{slug}</h1>
      <p className="mt-2 max-w-md text-[14px] text-[#A8B5AE]">
        Este catálogo ainda não foi publicado.
      </p>
      <p className="mt-1 max-w-md text-[13px] text-[#6B7A72]">
        É o lojista? Entre com seu e-mail e senha para configurar produtos, marca e publicar.
      </p>
      <Link
        href={loginHref}
        className="mt-8 rounded-[12px] bg-[#C9A84C] px-6 py-3 text-[15px] font-semibold text-[#0A1F18]"
      >
        Entrar e configurar catálogo
      </Link>
    </div>
  );
}
