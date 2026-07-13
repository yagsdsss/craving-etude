import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit lit ses fichiers de métriques de police (.afm) via fs au runtime ;
  // le bundler casse ces chemins s'il essaie de l'empaqueter. On le laisse en require() natif.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
