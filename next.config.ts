import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_ISHMT_DEMO_TOOLS: process.env.ISHMT_DEMO_TOOLS ?? "",
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
