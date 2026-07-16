import { describe, expect, it } from "vitest";
import { buildRegisterDemoData } from "@/lib/demo/register-demo-data";

describe("buildRegisterDemoData", () => {
  const municipalityId = "00000000-0000-4000-8000-000000000001";

  it("builds unique owner demo fields", () => {
    const a = buildRegisterDemoData({ level: "OWNER", municipalityId });
    const b = buildRegisterDemoData({ level: "OWNER", municipalityId });

    expect(a.personalNumber).toMatch(/^I9\d{7}D$/);
    expect(a.email).not.toBe(b.email);
    expect(a.password).toBe("Ishmt2026");
    expect(a.municipalityId).toBe(municipalityId);
  });

  it("builds company demo fields with NIPT", () => {
    const data = buildRegisterDemoData({ level: "INSTALLER", municipalityId });

    expect(data.nipt).toMatch(/^L1\d{7}A$/);
    expect(data.organizationName).toContain("Instalime Demo");
    expect(data.personalNumber).toBeUndefined();
  });
});
