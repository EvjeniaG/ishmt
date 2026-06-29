import { describe, expect, it } from "vitest";
import { DEFAULT_NUMBER_FORMAT_CONFIG } from "@/lib/services/number-format-service";

describe("Number format templates", () => {
  it("defaults to ISHMT_LEGACY for Albanian production format", () => {
    expect(DEFAULT_NUMBER_FORMAT_CONFIG.registry.active).toBe("ISHMT_LEGACY");
    expect(DEFAULT_NUMBER_FORMAT_CONFIG.registry.formats.ISHMT_LEGACY).toBe("{seq:6} {munLegacyCode}");
  });

  it("includes ELV modern as optional registry format", () => {
    expect(DEFAULT_NUMBER_FORMAT_CONFIG.registry.formats.ELV_MODERN).toContain("ELV-");
  });

  it("includes CR certificate prefix format", () => {
    expect(DEFAULT_NUMBER_FORMAT_CONFIG.certificate.formats.CR_PREFIX).toBe("CR{seq:5}");
  });
});
