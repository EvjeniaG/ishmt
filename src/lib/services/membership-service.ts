import { db } from "@/lib/db";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { buildSessionContextForOrg } from "@/lib/auth/session-context";
import { InvitationService } from "@/lib/services/invitation-service";

export class MembershipService {
  static async getUserMemberships(userId: string) {
    return db.orgMembership.findMany({
      where: { userId, deactivatedAt: null },
      include: {
        organization: { include: { municipality: true } },
        role: true,
      },
      orderBy: [{ isPrimary: "desc" }, { joinedAt: "asc" }],
    });
  }

  static async inviteOrgAdmin(input: {
    organizationId: string;
    email: string;
    firstName: string;
    lastName: string;
    roleCode: RoleCode;
    invitedById: string;
  }) {
    return InvitationService.createInvitation(input);
  }

  static async inviteMember(
    ctx: { userId: string; activeOrgId: string; roleCode: RoleCode },
    input: { email: string; firstName: string; lastName: string; roleCode: RoleCode },
  ) {
    if (
      ctx.roleCode !== ROLE_CODES.OWNER &&
      ctx.roleCode !== ROLE_CODES.MAINTENANCE &&
      ctx.roleCode !== ROLE_CODES.INSTALLER &&
      ctx.roleCode !== ROLE_CODES.CERTIFIER &&
      ctx.roleCode !== ROLE_CODES.DIRECTORATE &&
      ctx.roleCode !== ROLE_CODES.ADMIN
    ) {
      throw new Error("Nuk keni leje për të ftuar anëtarë.");
    }

    return this.inviteOrgAdmin({
      organizationId: ctx.activeOrgId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      roleCode: input.roleCode,
      invitedById: ctx.userId,
    });
  }

  static async switchOrganization(userId: string, organizationId: string) {
    const context = await buildSessionContextForOrg(userId, organizationId);

    if (!context) {
      throw new Error("Nuk jeni anëtar i kësaj organizate.");
    }

    return context;
  }
}
