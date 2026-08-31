import { describe, expect, it } from "vitest";
import { DEMO_OM_CLAIM_POOL } from "@/lib/demo/demo-om-claim-pool";

describe("DEMO_OM_CLAIM_POOL", () => {
  it("contains 20 unique OM demo licenses", () => {
    expect(DEMO_OM_CLAIM_POOL).toHaveLength(20);

    const licenseNumbers = DEMO_OM_CLAIM_POOL.map((item) => item.licenseNumber);
    const nipts = DEMO_OM_CLAIM_POOL.map((item) => item.nipt);

    expect(new Set(licenseNumbers).size).toBe(20);
    expect(new Set(nipts).size).toBe(20);
    expect(licenseNumbers[0]).toBe("OM-DEMO-REG-001");
    expect(licenseNumbers[19]).toBe("OM-DEMO-REG-020");
  });
});
