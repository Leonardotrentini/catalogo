"use client";

import { VestoLogo } from "./VestoLogo";

export function TopBar({
  slug,
  onPublish,
}: {
  slug: string;
  onPublish: () => void;
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-b border-[rgba(201,168,76,0.18)] bg-[#0A1F18]/95 px-4 py-3 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <VestoLogo size={44} />
        <div className="min-w-0">
          <div className="text-[15px] font-bold leading-tight tracking-wide">Vesto Catálogo</div>
          <div className="truncate text-[12px] text-[#A8B5AE]">
            {slug}.vestocatalogo.com
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onPublish}
        className="h-11 shrink-0 rounded-[10px] bg-[#C9A84C] px-4 text-[13px] font-semibold text-[#0A1F18]"
      >
        Publicar catálogo
      </button>
    </header>
  );
}
