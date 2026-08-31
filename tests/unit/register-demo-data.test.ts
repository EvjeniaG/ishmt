import { describe, expect, it, beforeEach } from "vitest";
import {
  buildRegisterDemoData,
  DEMO_OM_CLAIM_POOL,
  resetRegisterDemoOmClaimCursor,
} from "@/lib/demo/register-demo-data";
import { resetRegisterDemoInstallClaimCursor } from "@/lib/demo/demo-install-claim-pool";

describe("buildRegisterDemoData", () => {
  beforeEach(() => {
    resetRegisterDemoOmClaimCursor();
    resetRegisterDemoInstallClaimCursor();
  });

  it("builds unique owner demo fields for administrator with canonical NID", () => {
    const a = buildRegisterDemoData({ level: "OWNER", ownerBuildingRole: "ADMINISTRATOR" });
    const b = buildRegisterDemoData({ level: "OWNER", ownerBuildingRole: "ADMINISTRATOR" });

    expect(a.personalNumber).toBe("I90404004D");
    expect(a.email).toBe("arben.demo@example.al");
    expect(a.password).toBe("Ishmt2026");
    expect(a.nipt).toBe("");
    expect(a.ownerBuildingRole).toBe("ADMINISTRATOR");
    expect(b.personalNumber).toBe(a.personalNumber);
  });

  it("builds owner demo with canonical NIPT and NID for construction company", () => {
    const data = buildRegisterDemoData({ level: "OWNER", ownerBuildingRole: "CONSTRUCTION_COMPANY" });

    expect(data.personalNumber).toBe("I90404006F");
    expect(data.nipt).toBe("L6040406A");
    expect(data.email).toBe("ndertim.demo@example.al");
    expect(data.organizationName).toBe("Kompani Ndërtimi Demo");
    expect(data.ownerBuildingRole).toBe("CONSTRUCTION_COMPANY");
  });

  it("builds company demo with install license when capInstall is selected", () => {
    const data = buildRegisterDemoData({
      level: "COMPANY",
      capabilities: ["capInstall"],
    });

    expect(data.nipt).toMatch(/^L\d{8}A$/);
    expect(data.installLicenseNumber).toBe("INST-DEMO-REG-001");
    expect(data.organizationName).toBe("Instalim Demo Regjistrim Sh.p.k.");
    expect(data.omLicenseNumber).toBeUndefined();
  });

  it("builds company demo with OM license when capOm is selected", () => {
    const data = buildRegisterDemoData({
      level: "COMPANY",
      capabilities: ["capOm"],
    });

    expect(data.nipt).toBe(DEMO_OM_CLAIM_POOL[0].nipt);
    expect(data.omLicenseNumber).toBe("OM-DEMO-REG-001");
    expect(data.organizationName).toBe("OM Demo Regjistrim Sh.p.k.");
    expect(data.installLicenseNumber).toBeUndefined();
  });

  it("prefers install NIPT when both install and OM are selected", () => {
    const data = buildRegisterDemoData({
      level: "COMPANY",
      capabilities: ["capInstall", "capOm"],
    });

    expect(data.installLicenseNumber).toBe("INST-DEMO-REG-001");
    expect(data.omLicenseNumber).toBe("OM-DEMO-REG-001");
    expect(data.nipt).toMatch(/^L\d{8}A$/);
    expect(data.nipt).not.toMatch(/^M/);
  });

  it("rotates OM demo licenses across registrations", () => {
    const first = buildRegisterDemoData({ level: "COMPANY", capabilities: ["capOm"] });
    const second = buildRegisterDemoData({ level: "COMPANY", capabilities: ["capOm"] });

    expect(first.omLicenseNumber).toBe("OM-DEMO-REG-001");
    expect(second.omLicenseNumber).toBe("OM-DEMO-REG-002");
    expect(first.nipt).not.toBe(second.nipt);
  });
});
