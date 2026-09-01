import Link from "next/link";

export default function CatalogNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A1F18] px-6 text-center text-white">
      <h1 className="text-[22px] font-bold">Catálogo não encontrado</h1>
      <p className="mt-2 max-w-md text-[14px] text-[#A8B5AE]">
        Este catálogo não existe ou ainda não foi publicado.
      </p>
      <Link href="/login" className="mt-6 rounded-[10px] bg-[#C9A84C] px-4 py-2 text-[14px] font-semibold text-[#0A1F18]">
        Entrar e configurar catálogo
      </Link>
    </div>
  );
}
