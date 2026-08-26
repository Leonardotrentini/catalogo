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
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] bg-[#0a0a0c]/90 px-4 py-3 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <VestoLogo />
        <div className="min-w-0">
          <div className="text-[15px] font-bold leading-tight">Vesto Catálogo</div>
          <div className="truncate text-[12px] text-[#999]">
            {slug}.vestocatalogo.com
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onPublish}
        className="h-11 shrink-0 rounded-[10px] bg-[#C9A84C] px-4 text-[13px] font-semibold text-[#0a0a0c]"
      >
        Publicar catálogo
      </button>
    </header>
  );
}
