import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
