import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "olzgxpzhtipugyovivwv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // HTML/RSC: evita o WebView do WhatsApp/celular ficar preso em build antigo.
  async headers() {
    const noStore = [
      { key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" },
      { key: "Pragma", value: "no-cache" },
      { key: "CDN-Cache-Control", value: "no-store" },
      { key: "Vercel-CDN-Cache-Control", value: "no-store" },
    ];
    return [
      { source: "/catalog/:path*", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/login", headers: noStore },
      { source: "/admin", headers: noStore },
      { source: "/", headers: noStore },
    ];
  },
};

export default nextConfig;
