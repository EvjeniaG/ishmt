import { describe, expect, it } from "vitest";
import { directorateCompanyDemoModeLabel } from "@/lib/demo/directorate-company-demo-prefill";

describe("directorateCompanyDemoModeLabel", () => {
  it("returns Albanian labels for demo modes", () => {
    expect(directorateCompanyDemoModeLabel("install")).toBe("Instalim");
    expect(directorateCompanyDemoModeLabel("om")).toBe("OM");
    expect(directorateCompanyDemoModeLabel("installOm")).toBe("Instalim + OM");
  });
});
