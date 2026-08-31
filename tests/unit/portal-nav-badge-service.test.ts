import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLE_CODES } from "@/lib/constants/roles";
import { PERMISSIONS } from "@/lib/permissions/codes";
import type { AuthContext } from "@/lib/permissions/guards";

const { applicationCount, citizenReportCount, assignmentCount } = vi.hoisted(() => ({
  applicationCount: vi.fn(),
  citizenReportCount: vi.fn(),
  assignmentCount: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    application: { count: applicationCount },
    citizenReport: { count: citizenReportCount },
    applicationFieldReviewAssignment: { count: assignmentCount },
  },
}));

import { PortalNavBadgeService } from "@/lib/services/portal-nav-badge-service";

function ctx(roleCode: string): AuthContext {
  return {
    userId: "user-1",
    email: "a@b.c",
    firstName: "A",
    lastName: "B",
    activeOrgId: "org-1",
    activeOrgType: "ISHMT",
    activeOrgName: "IQMT",
    roleCode: roleCode as AuthContext["roleCode"],
    permissions: [
      PERMISSIONS.APPLICATIONS_VIEW_ALL,
      PERMISSIONS.REPORTS_VIEW,
    ],
  };
}

describe("PortalNavBadgeService", () => {
  beforeEach(() => {
    applicationCount.mockReset();
    citizenReportCount.mockReset();
    assignmentCount.mockReset();
    applicationCount.mockResolvedValue(3);
    citizenReportCount.mockResolvedValue(2);
    assignmentCount.mockResolvedValue(0);
  });

  it("maps active application and report counts for chief inspector", async () => {
    const badges = await PortalNavBadgeService.getForContext(ctx(ROLE_CODES.CHIEF_INSPECTOR));
    expect(badges["/ishmt/chief/applications"]).toBe(3);
    expect(badges["/ishmt/reports"]).toBe(2);
  });

  it("omits zero counts", async () => {
    applicationCount.mockResolvedValue(0);
    citizenReportCount.mockResolvedValue(0);
    const badges = await PortalNavBadgeService.getForContext(ctx(ROLE_CODES.SECTOR_HEAD));
    expect(badges).toEqual({});
  });
});
