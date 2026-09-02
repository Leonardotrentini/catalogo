const DEFAULT_ROOT_DOMAIN = "catalogo.vercel.app";

export function getRootDomain(): string {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || DEFAULT_ROOT_DOMAIN;
}

export function getAppOrigin(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return `${window.location.protocol}//${host}:${window.location.port || "3000"}`;
    }
  }
  return `https://${getRootDomain()}`;
}

function getAltRootDomains(): string[] {
  return (process.env.NEXT_PUBLIC_ALT_ROOT_DOMAINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Domínio principal do app (não é slug de catálogo). */
export function isAppRootHostname(host: string): boolean {
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;

  const roots = [getRootDomain().toLowerCase(), ...getAltRootDomains()];
  for (const root of roots) {
    if (hostname === root || hostname === `www.${root}`) return true;
  }

  // projeto.vercel.app é URL de deploy — nunca tratar como subdomínio de loja
  const parts = hostname.split(".");
  if (parts.length === 3 && parts[1] === "vercel" && parts[2] === "app") {
    return true;
  }

  return false;
}

/** Extrai o slug do subdomínio (ex.: baseset.catalogo.vercel.app → baseset). */
export function getCatalogSlugFromHost(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  if (isAppRootHostname(hostname)) return null;

  const root = getRootDomain().toLowerCase();
  if (hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, -(root.length + 1));
    const slug = sub.split(".")[0];
    if (slug && slug !== "www" && slug !== "admin") return slug;
  }

  return null;
}

/** Catálogo público — usa rota /catalog/slug no domínio principal (funciona sem wildcard). */
export function catalogPublicUrl(slug: string): string {
  const clean = slug.trim().toLowerCase() || "loja";
  return `${getAppOrigin()}/catalog/${clean}`;
}

/** Login do lojista — usa /login?slug= no domínio principal (funciona sem wildcard). */
export function tenantPanelLoginUrl(slug: string): string {
  const clean = slug.trim().toLowerCase() || "loja";
  return `${getAppOrigin()}/login?slug=${encodeURIComponent(clean)}`;
}
