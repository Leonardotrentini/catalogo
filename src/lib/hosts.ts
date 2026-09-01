const DEFAULT_ROOT_DOMAIN = "catalogo.vercel.app";

export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || DEFAULT_ROOT_DOMAIN;
}

/** Extrai o slug do subdomínio (ex.: baseset.catalogo.vercel.app → baseset). */
export function getCatalogSlugFromHost(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;

  const root = getRootDomain().toLowerCase();
  if (hostname === root || hostname === `www.${root}`) return null;

  if (hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, -(root.length + 1));
    const slug = sub.split(".")[0];
    if (slug && slug !== "www" && slug !== "admin") return slug;
  }

  const parts = hostname.split(".");
  if (parts.length >= 3 && parts[0] !== "www" && parts[0] !== "admin") {
    return parts[0];
  }

  return null;
}

export function catalogPublicUrl(slug: string): string {
  const clean = slug.trim() || "loja";
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return `${window.location.protocol}//${host}:${window.location.port || "3000"}/catalog/${clean}`;
    }
  }
  return `https://${clean}.${getRootDomain()}`;
}
