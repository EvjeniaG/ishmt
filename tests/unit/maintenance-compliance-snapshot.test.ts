import { describe, expect, it } from "vitest";
import { computeMaintenanceComplianceMetrics } from "@/lib/elevators/maintenance-compliance-snapshot";

function daysAgo(n: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
}

describe("computeMaintenanceComplianceMetrics", () => {
  const now = new Date("2026-08-31T12:00:00Z");

  it("returns null when no interventions exist", () => {
    expect(computeMaintenanceComplianceMetrics([], { now })).toBeNull();
  });

  it("uses monthly report when no other intervention exists", () => {
    const reportDate = new Date(now.getFullYear(), now.getMonth(), 5);
    const result = computeMaintenanceComplianceMetrics(
      [{ interventionType: "RAPORT_MUJOR", performedDate: reportDate }],
      { now },
    );

    expect(result?.lastMaintenanceDate).toEqual(reportDate);
    expect(result?.isCompliant).toBe(true);
    expect(result?.daysOverdue).toBe(0);
  });

  it("marks compliant when recent intervention and monthly report exist", () => {
    const interventionDate = daysAgo(10, now);
    const result = computeMaintenanceComplianceMetrics(
      [
        { interventionType: "Rutinë", performedDate: interventionDate },
        { interventionType: "RAPORT_MUJOR", performedDate: new Date(now.getFullYear(), now.getMonth(), 5) },
      ],
      { now },
    );

    expect(result?.isCompliant).toBe(true);
    expect(result?.daysOverdue).toBe(0);
    expect(result?.lastMaintenanceDate).toEqual(interventionDate);
  });

  it("marks overdue when intervention is older than max days without monthly report", () => {
    const interventionDate = daysAgo(40, now);
    const result = computeMaintenanceComplianceMetrics(
      [{ interventionType: "Rutinë", performedDate: interventionDate }],
      { now, maintenanceReportMaxDays: 30 },
    );

    expect(result?.isCompliant).toBe(false);
    expect(result?.daysOverdue).toBe(10);
  });
});
