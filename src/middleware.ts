import { type NextRequest, NextResponse } from "next/server";
import { getCatalogSlugFromHost } from "@/lib/hosts";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const slug = getCatalogSlugFromHost(host);
  const { pathname } = request.nextUrl;

  if (
    slug &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/auth") &&
    !pathname.startsWith("/login")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/catalog/${slug}`;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/admin") || pathname === "/login") {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
