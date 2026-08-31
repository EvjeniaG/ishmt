import { describe, expect, it } from "vitest";
import { buildPeriodicControlSchedule } from "@/lib/elevators/periodic-control-schedule";
import { buildInspectionRegistryView } from "@/lib/elevators/registry-view-models";

describe("periodic-control-schedule", () => {
  it("uses 12 months for residential buildings", () => {
    const schedule = buildPeriodicControlSchedule({
      buildingType: "RESIDENTIAL",
      usagePurpose: "ELECTRIC_PASSENGER",
      registrationDate: new Date("2026-01-15T00:00:00.000Z"),
    });
    expect(schedule.intervalMonths).toBe(12);
    expect(schedule.nextInspectionDueLabel).toBe("15.01.2027");
  });

  it("uses 6 months for workplace buildings", () => {
    const schedule = buildPeriodicControlSchedule({
      buildingType: "WORKPLACE",
      registrationDate: new Date("2026-01-15T00:00:00.000Z"),
    });
    expect(schedule.intervalMonths).toBe(6);
    expect(schedule.intervalRuleLabel).toContain("6 muaj");
  });
});

describe("buildInspectionRegistryView next due", () => {
  it("derives next due from registration when no periodic inspection exists", () => {
    const view = buildInspectionRegistryView({
      inspections: [],
      maintenanceContracts: [],
      intervalMonths: 12,
      registrationDate: new Date("2026-01-15T00:00:00.000Z"),
      buildingType: "RESIDENTIAL",
    });
    expect(view.nextDue).toBeTruthy();
    expect(new Date(view.nextDue!).getUTCFullYear()).toBe(2027);
  });
});
