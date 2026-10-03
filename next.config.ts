import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (lokal inkişaf DB-si) WASM faylları ilə gəlir — bundle edilməsin
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
