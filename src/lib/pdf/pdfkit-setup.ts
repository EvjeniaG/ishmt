import fs from "fs";
import path from "path";
import { createRequire } from "node:module";

let cachedDataDir: string | null = null;

function dirHasHelvetica(dir: string): boolean {
  if (!dir || dir.includes("[externals]") || dir.includes("[external]")) {
    return false;
  }
  return fs.existsSync(path.join(dir, "Helvetica.afm"));
}

/** Resolved pdfkit data dir (Helvetica.afm etc.) - works with Next/Turbopack externals. */
export function getPdfkitDataDir(): string {
  if (cachedDataDir) return cachedDataDir;

  const candidates: string[] = [];

  try {
    const requireFromApp = createRequire(path.join(process.cwd(), "package.json"));
    const pkgJson = requireFromApp.resolve("pdfkit/package.json");
    candidates.push(path.join(path.dirname(pkgJson), "js", "data"));
  } catch {
    // ignore
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkgJson = require.resolve("pdfkit/package.json") as string;
    candidates.push(path.join(path.dirname(pkgJson), "js", "data"));
  } catch {
    // ignore
  }

  candidates.push(path.join(process.cwd(), "node_modules", "pdfkit", "js", "data"));
  candidates.push(
    path.join(process.cwd(), ".next", "standalone", "node_modules", "pdfkit", "js", "data"),
  );

  for (const dir of candidates) {
    if (dirHasHelvetica(dir)) {
      cachedDataDir = dir;
      return dir;
    }
  }

  throw new Error(
    "Fontet PDF nuk u gjetën (Helvetica.afm). Ekzekutoni npm install dhe sigurohuni që pdfkit/js/data është i pranishëm.",
  );
}

export function assertPdfkitFontsAvailable(): void {
  getPdfkitDataDir();
}
