import { describe, expect, it } from "vitest";
import { OwnerComplianceNotificationService } from "@/lib/services/owner-compliance-notification-service";

describe("OwnerComplianceNotificationService.resolveStakeholderOrgIds", () => {
  it("includes owner and maintenance company for maintenance contract issues", () => {
    const ids = OwnerComplianceNotificationService.resolveStakeholderOrgIds({
      ownerOrgId: "owner-1",
      maintenanceOrgId: "maint-1",
      certifierOrgId: "cert-1",
      issueType: "maintenance-contract-expired",
    });

    expect(ids).toEqual(["owner-1", "maint-1"]);
  });

  it("includes owner and certifier for inspection contract issues", () => {
    const ids = OwnerComplianceNotificationService.resolveStakeholderOrgIds({
      ownerOrgId: "owner-1",
      maintenanceOrgId: "maint-1",
      certifierOrgId: "cert-1",
      issueType: "inspection-contract-expiring",
    });

    expect(ids).toEqual(["owner-1", "cert-1"]);
  });

  it("includes only owner when no company is assigned", () => {
    const ids = OwnerComplianceNotificationService.resolveStakeholderOrgIds({
      ownerOrgId: "owner-1",
      maintenanceOrgId: null,
      certifierOrgId: null,
      issueType: "no-maintenance-contract",
    });

    expect(ids).toEqual(["owner-1"]);
  });
});
