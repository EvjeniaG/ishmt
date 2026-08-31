import path from "path";

/** Resolved pdfkit data dir (Helvetica.afm etc.) - works when package is not bundled. */
export function getPdfkitDataDir(): string {
  // Runtime require: Turbopack can stub top-level `import { createRequire } from "module"`,
  // which breaks module-load resolution during Next.js server actions.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkgJson = require.resolve("pdfkit/package.json") as string;
  return path.join(path.dirname(pkgJson), "js", "data");
}

export function assertPdfkitFontsAvailable(): void {
  const dataDir = getPdfkitDataDir();
  const helvetica = path.join(dataDir, "Helvetica.afm");
  const fs = nodeRequire("fs") as typeof import("fs");
  if (!fs.existsSync(helvetica)) {
    throw new Error(`Fontet PDF nuk u gjetën: ${helvetica}`);
  }
}
