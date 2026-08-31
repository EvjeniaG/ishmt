import { CitizenReportStatus, CitizenReportType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildPublicCitizenReportStatus,
  isValidCitizenReportNumber,
  normalizeCitizenReportNumber,
} from "@/lib/citizen-reports/public-report-status";

describe("public-report-status", () => {
  it("validates report number format", () => {
    expect(isValidCitizenReportNumber("RPT-2026-000001")).toBe(true);
    expect(isValidCitizenReportNumber("rpt-2026-000001")).toBe(true);
    expect(isValidCitizenReportNumber("RPT-2026-1")).toBe(false);
    expect(normalizeCitizenReportNumber(" rpt-2026-000002 ")).toBe("RPT-2026-000002");
  });

  it("builds timeline for submitted report", () => {
    const submittedAt = new Date("2026-08-31T10:00:00.000Z");
    const status = buildPublicCitizenReportStatus({
      reportNumber: "RPT-2026-000001",
      type: CitizenReportType.SAFETY_ISSUE,
      status: CitizenReportStatus.SUBMITTED,
      createdAt: submittedAt,
      resolvedAt: null,
      actions: [],
    });

    expect(status.readAt).toBeNull();
    expect(status.timeline[0]?.done).toBe(true);
    expect(status.timeline[1]?.done).toBe(false);
    expect(status.timeline[2]?.done).toBe(false);
  });

  it("marks read and resolved steps when closed", () => {
    const submittedAt = new Date("2026-08-31T10:00:00.000Z");
    const readAt = new Date("2026-09-01T09:00:00.000Z");
    const resolvedAt = new Date("2026-09-05T16:00:00.000Z");

    const status = buildPublicCitizenReportStatus({
      reportNumber: "RPT-2026-000002",
      type: CitizenReportType.COMPLAINT,
      status: CitizenReportStatus.RESOLVED,
      createdAt: submittedAt,
      resolvedAt,
      actions: [{ action: CitizenReportStatus.TRIAGED, createdAt: readAt }],
    });

    expect(status.readAt?.toISOString()).toBe(readAt.toISOString());
    expect(status.resolvedAt?.toISOString()).toBe(resolvedAt.toISOString());
    expect(status.timeline.every((step) => step.done)).toBe(true);
  });
});
