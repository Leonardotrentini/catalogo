"use client";

import { useState } from "react";
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
  const shortUrl = publicUrl.replace(/^https?:\/\//, "");
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie o link do catálogo:", publicUrl);
    }
  }

  return (
    <header className="border-b border-[rgba(201,168,76,0.18)] bg-[#0A1F18]/95 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <VestoLogo size={44} />
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-tight tracking-wide">Vesto Catálogo</div>
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
      </div>

      {isPublished && (
        <div className="flex justify-end border-t border-[rgba(201,168,76,0.1)] px-4 py-2">
          <div className="flex max-w-full items-center gap-2 rounded-[10px] border border-[rgba(201,168,76,0.22)] bg-[#0F281F] px-2.5 py-1.5">
            <span className="hidden shrink-0 text-[11px] font-medium text-[#25D366] sm:inline">
              Link
            </span>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="max-w-[42vw] truncate text-[12px] text-[#C9A84C] underline-offset-2 hover:underline sm:max-w-[320px]"
              title={publicUrl}
            >
              {shortUrl}
            </a>
            <button
              type="button"
              onClick={() => void copyLink()}
              className="h-8 shrink-0 rounded-[8px] border border-[#C9A84C] px-3 text-[12px] font-semibold text-[#C9A84C] transition hover:bg-[#C9A84C18]"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden h-8 shrink-0 items-center rounded-[8px] bg-[#122E23] px-3 text-[12px] font-medium text-[#A8B5AE] transition hover:text-[#C9A84C] sm:inline-flex"
            >
              Abrir
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
