import { Suspense } from "react";
import { AdminShell } from "@/components/AdminShell";

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0A1F18] text-[#A8B5AE]">
          Carregando painel…
        </div>
      }
    >
      <AdminShell />
    </Suspense>
  );
}
