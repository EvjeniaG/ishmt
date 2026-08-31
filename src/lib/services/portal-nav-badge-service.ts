import {
  ApplicationFieldReviewAssignmentStatus,
  ApplicationStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  CITIZEN_REPORT_ACTIVE_STATUSES,
} from "@/lib/ishmt/citizen-report-queue";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import type { AuthContext } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { isFieldInspectorRole, isIshmtInternalRole } from "@/lib/permissions/ishmt-roles";
import { buildIshmtApplicationRegistryWhere } from "@/lib/services/application-participation";

/** Numra sipas href-it të sidebar-it (vetëm > 0). */
export type PortalNavBadges = Partial<Record<string, number>>;

export class PortalNavBadgeService {
  static async getForContext(ctx: AuthContext): Promise<PortalNavBadges> {
    const role = ctx.roleCode as RoleCode;
    const badges: PortalNavBadges = {};

    const counts = await Promise.all([
      this.countActiveApplications(ctx),
      this.countActiveCitizenReports(ctx),
      this.countPendingDocumentReviews(ctx),
    ]);
    const [activeApplications, activeReports, pendingDocReviews] = counts;

    if (role === ROLE_CODES.SECTOR_HEAD && activeApplications > 0) {
      badges["/ishmt/review"] = activeApplications;
    }

    if (role === ROLE_CODES.ISHMT_DIRECTOR && activeApplications > 0) {
      badges["/ishmt/director/review"] = activeApplications;
    }

    if (role === ROLE_CODES.CHIEF_INSPECTOR && activeApplications > 0) {
      badges["/ishmt/chief/applications"] = activeApplications;
    }

    if (roleHasPermission(role, PERMISSIONS.REPORTS_VIEW) && activeReports > 0) {
      badges["/ishmt/reports"] = activeReports;
    }

    if (isFieldInspectorRole(role) && pendingDocReviews > 0) {
      badges["/ishmt/my-application-reviews"] = pendingDocReviews;
    }

    return badges;
  }

  private static async countActiveApplications(ctx: AuthContext): Promise<number> {
    if (!hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL)) return 0;
    if (!isIshmtInternalRole(ctx.roleCode) && ctx.roleCode !== ROLE_CODES.ADMIN) return 0;

    return db.application.count({
      where: buildIshmtApplicationRegistryWhere({ activeOnly: true }),
    });
  }

  private static async countActiveCitizenReports(_ctx: AuthContext): Promise<number> {
    return db.citizenReport.count({
      where: { status: { in: CITIZEN_REPORT_ACTIVE_STATUSES } },
    });
  }

  private static async countPendingDocumentReviews(ctx: AuthContext): Promise<number> {
    if (!isFieldInspectorRole(ctx.roleCode)) return 0;

    return db.applicationFieldReviewAssignment.count({
      where: {
        inspectorId: ctx.userId,
        status: ApplicationFieldReviewAssignmentStatus.PENDING,
        application: {
          deletedAt: null,
          status: ApplicationStatus.PENDING_FIELD_REVIEW,
        },
      },
    });
  }
}
