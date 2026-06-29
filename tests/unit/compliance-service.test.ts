import { describe, expect, it } from "vitest";
import { ComplianceIndicator, ElevatorStatus } from "@prisma/client";
import { ComplianceService } from "@/lib/services/compliance-service";

describe("ComplianceService", () => {
  it("returns GREEN when all factors valid", () => {
    expect(
      ComplianceService.calculateIndicator({
        status: ElevatorStatus.ACTIVE,
        inspectionValid: true,
        certificateValid: true,
        maintenanceValid: true,
        inspectionExpiring: false,
        certificateExpiring: false,
        maintenanceExpiring: false,
      }),
    ).toBe(ComplianceIndicator.GREEN);
  });

  it("returns YELLOW when expiring soon", () => {
    expect(
      ComplianceService.calculateIndicator({
        status: ElevatorStatus.ACTIVE,
        inspectionValid: true,
        certificateValid: true,
        maintenanceValid: true,
        inspectionExpiring: true,
        certificateExpiring: false,
        maintenanceExpiring: false,
      }),
    ).toBe(ComplianceIndicator.YELLOW);
  });

  it("returns RED when suspended", () => {
    expect(
      ComplianceService.calculateIndicator({
        status: ElevatorStatus.SUSPENDED,
        inspectionValid: true,
        certificateValid: true,
        maintenanceValid: true,
        inspectionExpiring: false,
        certificateExpiring: false,
        maintenanceExpiring: false,
      }),
    ).toBe(ComplianceIndicator.RED);
  });

  it("exposes centralized public display profile", () => {
    const display = ComplianceService.getPublicDisplay(ComplianceIndicator.GREEN);
    expect(display.label).toBe("Në përputhje");
    expect(display.bgClass).toContain("green");
  });
});
