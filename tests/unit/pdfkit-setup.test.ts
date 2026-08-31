import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { getPdfkitDataDir } from "@/lib/pdf/pdfkit-setup";

describe("getPdfkitDataDir", () => {
  it("finds Helvetica.afm under node_modules", () => {
    const dataDir = getPdfkitDataDir();
    expect(fs.existsSync(path.join(dataDir, "Helvetica.afm"))).toBe(true);
  });
});
