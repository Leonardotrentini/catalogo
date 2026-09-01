"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCatalogSlugFromHost } from "@/lib/hosts";

function LoginContent() {
  const searchParams = useSearchParams();
  const querySlug = searchParams.get("slug");

  const catalogSlug = useMemo(() => {
    if (querySlug) return querySlug;
    if (typeof window !== "undefined") {
      return getCatalogSlugFromHost(window.location.host);
    }
    return null;
  }, [querySlug]);

  return <LoginForm catalogSlug={catalogSlug} redirectTo="/admin" />;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A1F18] text-[#A8B5AE]">
          Carregando…
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
