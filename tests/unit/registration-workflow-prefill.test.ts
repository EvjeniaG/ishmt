import { describe, expect, it } from "vitest";
import {
  buildRegistrationWorkflowPrefillFromCount,
  inferElevatorConditionFromInServiceDate,
} from "@/lib/registration/registration-workflow-prefill";

describe("buildRegistrationWorkflowPrefillFromCount", () => {
  it("returns first application defaults when owner has no registered elevators", () => {
    expect(buildRegistrationWorkflowPrefillFromCount(0)).toEqual({
      elevatorConditionType: "EXISTING",
      applicationSubtype: "FIRST",
    });
  });

  it("returns additional application with count when owner has registered elevators", () => {
    expect(buildRegistrationWorkflowPrefillFromCount(3)).toEqual({
      elevatorConditionType: "EXISTING",
      applicationSubtype: "ADDITIONAL",
      existingRegisteredElevatorsCount: 3,
    });
  });

  it("reuses last condition type for additional applications when provided", () => {
    expect(buildRegistrationWorkflowPrefillFromCount(2, "NEW")).toEqual({
      elevatorConditionType: "NEW",
      applicationSubtype: "ADDITIONAL",
      existingRegisteredElevatorsCount: 2,
    });
  });
});

describe("inferElevatorConditionFromInServiceDate", () => {
  it("classifies dates from 2020 onwards as NEW", () => {
    expect(inferElevatorConditionFromInServiceDate("2020-01-01")).toBe("NEW");
    expect(inferElevatorConditionFromInServiceDate("2024-06-15")).toBe("NEW");
  });

  it("classifies dates before 2020 as EXISTING", () => {
    expect(inferElevatorConditionFromInServiceDate("2019-12-31")).toBe("EXISTING");
    expect(inferElevatorConditionFromInServiceDate("1998-03-10")).toBe("EXISTING");
  });
});
