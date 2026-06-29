import { createRequire } from "module";
import path from "path";

const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));

/** Resolved pdfkit data dir (Helvetica.afm etc.) - works when package is not bundled. */
export function getPdfkitDataDir(): string {
  const pkgJson = nodeRequire.resolve("pdfkit/package.json");
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
