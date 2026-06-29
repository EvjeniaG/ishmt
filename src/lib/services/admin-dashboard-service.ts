import { OrgStatus, OrgType, QkbValidationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";

export class AdminDashboardService {
  static async getDashboard(ctx: AuthContext) {
    if (ctx.roleCode !== ROLE_CODES.ADMIN) {
      throw new Error("Vetëm administratori i sistemit mund të shohë këtë panel.");
    }

    const [
      totalUsers,
      activeUsers,
      deactivatedUsers,
      pendingQkb,
      maintenancePendingQkb,
      auditLast24h,
      orgMemberships,
    ] = await Promise.all([
      db.authUser.count({ where: { deletedAt: null } }),
      db.authUser.count({ where: { deletedAt: null, isActive: true } }),
      db.authUser.count({ where: { deletedAt: null, isActive: false } }),
      db.qkbValidation.count({
        where: { status: QkbValidationStatus.PENDING, organization: { deletedAt: null } },
      }),
      db.organization.count({
        where: {
          type: OrgType.MAINTENANCE,
          deletedAt: null,
          qkbValidated: false,
          status: { in: [OrgStatus.ACTIVE, OrgStatus.PENDING_VALIDATION] },
        },
      }),
      db.auditLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      db.orgMembership.count({ where: { deactivatedAt: null } }),
    ]);

    return {
      cards: {
        users: {
          value: activeUsers,
          accent: deactivatedUsers > 0 ? ("warning" as const) : ("primary" as const),
          subtitle: `${totalUsers} total · ${deactivatedUsers} të çaktivizuar`,
        },
        memberships: {
          value: orgMemberships,
          accent: "primary" as const,
          subtitle: "Anëtarësi aktive në organizata",
        },
        qkb: {
          value: pendingQkb + maintenancePendingQkb,
          accent: pendingQkb + maintenancePendingQkb > 0 ? ("warning" as const) : ("success" as const),
          subtitle:
            pendingQkb + maintenancePendingQkb > 0
              ? `${pendingQkb} në radhë · ${maintenancePendingQkb} mirëmbajtje pa QKB`
              : "Nuk ka validime në pritje",
        },
        audit: {
          value: auditLast24h,
          accent: "primary" as const,
          subtitle: "Veprime të regjistruara (24 orë)",
        },
      },
    };
  }
}
