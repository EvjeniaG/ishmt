import { describe, expect, it } from "vitest";
import { describeCitizenReportAction } from "@/lib/registration/report-labels";

describe("describeCitizenReportAction", () => {
  it("labels assignment actions in Albanian", () => {
    expect(
      describeCitizenReportAction(
        "ASSIGNED",
        "Caktuar inspektor terreni: Dritan Gjoka (nga Albert Shqalshi)",
      ),
    ).toEqual({
      label: "Inspektor i caktuar",
      detail: "Caktuar inspektor terreni: Dritan Gjoka (nga Albert Shqalshi)",
    });
  });

  it("translates status actions", () => {
    expect(describeCitizenReportAction("INVESTIGATING", null)).toEqual({
      label: "Në hetim",
      detail: null,
    });
  });
});
