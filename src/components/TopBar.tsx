"use client";

import { VestoLogo } from "./VestoLogo";
import { catalogPublicUrl } from "@/lib/hosts";

export function TopBar({
  slug,
  isPublished,
  userEmail,
  isSuperAdmin,
  onPublish,
  onLogout,
  onOpenSuperAdmin,
}: {
  slug: string;
  isPublished: boolean;
  userEmail: string;
  isSuperAdmin: boolean;
  onPublish: () => void;
  onLogout: () => void;
  onOpenSuperAdmin: () => void;
}) {
  const publicUrl = catalogPublicUrl(slug);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-3 border-b border-[rgba(201,168,76,0.18)] bg-[#0A1F18]/95 px-4 py-3 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <VestoLogo size={44} />
        <div className="min-w-0">
          <div className="text-[15px] font-bold leading-tight tracking-wide">Vesto Catálogo</div>
          <div className="truncate text-[12px] text-[#A8B5AE]">{publicUrl.replace(/^https?:\/\//, "")}</div>
          <div className="truncate text-[11px] text-[#6B7A72]">{userEmail}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isSuperAdmin && (
          <button
            type="button"
            onClick={onOpenSuperAdmin}
            className="hidden h-11 rounded-[10px] border border-[#C9A84C] px-3 text-[12px] font-semibold text-[#C9A84C] sm:block"
          >
            Usuários
          </button>
        )}
        <span
          className="hidden rounded-full px-2 py-1 text-[11px] font-medium sm:inline"
          style={{
            background: isPublished ? "rgba(37,211,102,0.15)" : "rgba(239,68,68,0.12)",
            color: isPublished ? "#25D366" : "#fca5a5",
          }}
        >
          {isPublished ? "Publicado" : "Rascunho"}
        </span>
        <button
          type="button"
          onClick={onPublish}
          className="h-11 shrink-0 rounded-[10px] bg-[#C9A84C] px-4 text-[13px] font-semibold text-[#0A1F18]"
        >
          Publicar
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="h-11 shrink-0 rounded-[10px] bg-[#122E23] px-3 text-[12px] text-[#A8B5AE]"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
