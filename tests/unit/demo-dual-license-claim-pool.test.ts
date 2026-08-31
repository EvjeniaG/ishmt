import { describe, expect, it } from "vitest";
import { DEMO_DUAL_LICENSE_CLAIM_POOL } from "@/lib/demo/demo-dual-license-claim-pool";

describe("DEMO_DUAL_LICENSE_CLAIM_POOL", () => {
  it("defines paired install and OM licenses on the same NIPT", () => {
    const first = DEMO_DUAL_LICENSE_CLAIM_POOL[0];

    expect(first.nipt).toMatch(/^D\d{8}A$/);
    expect(first.installLicenseNumber).toBe("INST-DEMO-DUAL-001");
    expect(first.omLicenseNumber).toBe("OM-DEMO-DUAL-001");
    expect(first.orgName).toBe("Shërbim Ashensorë Demo Sh.p.k.");
  });

  it("uses unique NIPTs across the pool", () => {
    const nipts = DEMO_DUAL_LICENSE_CLAIM_POOL.map((claim) => claim.nipt);
    expect(new Set(nipts).size).toBe(nipts.length);
  });
});
