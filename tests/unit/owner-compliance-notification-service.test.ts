import { describe, expect, it } from "vitest";
import { OwnerComplianceNotificationService } from "@/lib/services/owner-compliance-notification-service";

describe("OwnerComplianceNotificationService", () => {
  it("maps contract issue rows to owner alerts", () => {
    const alert = OwnerComplianceNotificationService.alertFromContractIssue({
      elevatorId: "elv-1",
      issueType: "no-inspection-contract",
      issueLabel: "Pa kontratë kontrolli periodik (OM)",
      registryNumber: "000901 TR",
      dueDate: null,
    });

    expect(alert.title).toBe("Pa kontratë kontrolli periodik (OM)");
    expect(alert.body).toContain("000901 TR");
    expect(alert.href).toContain("/portal/kontroll-periodik");
    expect(alert.dedupeKey).toBe("elv-1:no-inspection-contract");
  });
});
