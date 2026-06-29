import { describe, expect, it } from "vitest";
import { OrgStatus, OrgType } from "@prisma/client";
import { OrganizationCapabilityService } from "@/lib/services/organization-capability-service";

const baseOrg = {
  id: "org-1",
  name: "Subjekt Test",
  nipt: "K12345678A",
  status: OrgStatus.ACTIVE,
  deletedAt: null,
};

describe("OrganizationCapabilityService", () => {
  it("allows a QKB-valid maintenance company to provide maintenance", () => {
    const result = OrganizationCapabilityService.evaluateMaintenanceCapability(
      { ...baseOrg, type: OrgType.MAINTENANCE, qkbValidated: true },
      { qkbStatus: "ACTIVE", statusLabel: "Aktiv ne QKB" },
    );

    expect(result.ok).toBe(true);
  });

  it("rejects a maintenance company without approved QKB validation", () => {
    const result = OrganizationCapabilityService.evaluateMaintenanceCapability(
      { ...baseOrg, type: OrgType.MAINTENANCE, qkbValidated: false },
      { qkbStatus: "ACTIVE", statusLabel: "Aktiv ne QKB" },
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/validim QKB/);
  });

  it("allows a certifier to provide maintenance only in same-company mode and with active QKB status", () => {
    const result = OrganizationCapabilityService.evaluateMaintenanceCapability(
      { ...baseOrg, type: OrgType.CERTIFIER },
      { qkbStatus: "ACTIVE", statusLabel: "Aktiv ne QKB" },
      { allowCertifier: true },
    );

    expect(result.ok).toBe(true);
  });

  it("rejects a certifier for maintenance when same-company mode is not enabled", () => {
    const result = OrganizationCapabilityService.evaluateMaintenanceCapability(
      { ...baseOrg, type: OrgType.CERTIFIER },
      { qkbStatus: "ACTIVE", statusLabel: "Aktiv ne QKB" },
    );

    expect(result.ok).toBe(false);
  });

  it("requires an active OMI license for periodic inspection", () => {
    expect(
      OrganizationCapabilityService.evaluatePeriodicInspectionCapability({
        ...baseOrg,
        type: OrgType.CERTIFIER,
        hasActiveLicense: true,
      }).ok,
    ).toBe(true);

    expect(
      OrganizationCapabilityService.evaluatePeriodicInspectionCapability({
        ...baseOrg,
        type: OrgType.CERTIFIER,
        hasActiveLicense: false,
      }).ok,
    ).toBe(false);
  });
});
