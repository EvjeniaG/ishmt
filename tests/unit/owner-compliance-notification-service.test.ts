import { describe, expect, it } from "vitest";
import { OwnerComplianceNotificationService } from "@/lib/services/owner-compliance-notification-service";

describe("OwnerComplianceNotificationService", () => {
  it("maps contract issue rows to owner alerts", () => {
    const alert = OwnerComplianceNotificationService.alertFromContractIssue({
      elevatorId: "elv-1",
      issueType: "no-inspection-contract",
      issueLabel: "Pa kontratë inspektimi periodik (OMI)",
      registryNumber: "000901 TR",
      dueDate: null,
    });

    expect(alert.title).toBe("Pa kontratë inspektimi periodik (OMI)");
    expect(alert.body).toContain("000901 TR");
    expect(alert.href).toContain("/portal/elevators/elv-1?tab=inspections");
    expect(alert.dedupeKey).toBe("elv-1:no-inspection-contract");
  });
});
