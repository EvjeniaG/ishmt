import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? "true",
    NEXT_PUBLIC_DEMO_PASSWORD: process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "Ishmt2026",
  },
  // pdfkit loads standard fonts via __dirname; bundling breaks AFM paths in dev/prod.
  serverExternalPackages: ["pdfkit", "fontkit", "linebreak", "png-js", "@prisma/client", ".prisma/client"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pdfkit/js/data/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
