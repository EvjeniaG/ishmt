import { describe, expect, it } from "vitest";
import {
  buildMonthlyControlDescription,
  buildMonthlyControlPayload,
  deriveMonthlyControlResult,
  parseMonthlyControlPayload,
  validateMonthlyControlInput,
} from "@/lib/maintenance/monthly-control-payload";
import { allMonthlyControlChecklistItemIds } from "@/lib/constants/monthly-control-checklist";

function fullOkChecklist() {
  return Object.fromEntries(allMonthlyControlChecklistItemIds().map((id) => [id, "ok" as const]));
}

describe("monthly-control-payload", () => {
  it("derives FAIL when any checklist item is not_ok", () => {
    const checklist = fullOkChecklist();
    checklist["brakes"] = "not_ok";
    expect(deriveMonthlyControlResult(checklist)).toBe("FAIL");
  });

  it("validates required checklist and observations for failed controls", () => {
    const checklist = fullOkChecklist();
    checklist["brakes"] = "not_ok";

    expect(() =>
      validateMonthlyControlInput({
        elevatorId: "el-1",
        performedDate: new Date("2026-06-15"),
        periodYear: 2026,
        periodMonth: 6,
        technicianName: "Teknik A",
        checklist,
      }),
    ).toThrow(/vërejtjet/i);

    expect(() =>
      validateMonthlyControlInput({
        elevatorId: "el-1",
        performedDate: new Date("2026-06-15"),
        periodYear: 2026,
        periodMonth: 6,
        technicianName: "Teknik A",
        checklist,
        observations: "Frenat kërkojnë rregullim",
      }),
    ).not.toThrow();
  });

  it("serializes and parses structured monthly control payload", () => {
    const payload = buildMonthlyControlPayload({
      periodYear: 2026,
      periodMonth: 6,
      checklist: fullOkChecklist(),
      notes: "Gjithçka në rregull",
    });

    const json = JSON.stringify(payload);
    const parsed = parseMonthlyControlPayload(json);

    expect(parsed?.monthlyControlForm).toBe(true);
    expect(parsed?.result).toBe("PASS");
    expect(buildMonthlyControlDescription(payload)).toContain("KALUES");
  });
});
