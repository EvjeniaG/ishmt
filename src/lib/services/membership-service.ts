import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import {
  buildSessionContextForMembership,
  buildSessionContextForOrg,
} from "@/lib/auth/session-context";
import { InvitationService } from "@/lib/services/invitation-service";
import {
  capabilitiesFromOrg,
  capabilityRoleCodes,
} from "@/lib/organizations/org-capabilities";
import { isRoleValidForOrgType } from "@/lib/constants/org-role-map";

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

  static async switchMembership(userId: string, membershipId: string) {
    const context = await buildSessionContextForMembership(userId, membershipId);

    if (!context) {
      throw new Error("Nuk jeni anëtar i kësaj organizate.");
    }

    return context;
  }

  /** Krijon anëtarësi për çdo funksion të aktivizuar të kompanisë. */
  static async grantCapabilityMemberships(
    tx: Prisma.TransactionClient,
    userId: string,
    organization: {
      id: string;
      type: import("@prisma/client").OrgType;
      capInstall?: boolean | null;
      capMaintenance?: boolean | null;
      capOm?: boolean | null;
    },
    options?: { primaryRoleCode?: RoleCode },
  ) {
    const caps = capabilitiesFromOrg(organization);
    const roleCodes = capabilityRoleCodes(caps);
    const primaryRoleCode = options?.primaryRoleCode ?? roleCodes[0];

    for (const roleCode of roleCodes) {
      const role = await tx.authRole.findUnique({ where: { code: roleCode } });
      if (!role || !isRoleValidForOrgType(roleCode, organization)) continue;

      await tx.orgMembership.upsert({
        where: {
          userId_organizationId_roleId: {
            userId,
            organizationId: organization.id,
            roleId: role.id,
          },
        },
        update: { deactivatedAt: null, isPrimary: roleCode === primaryRoleCode },
        create: {
          userId,
          organizationId: organization.id,
          roleId: role.id,
          isPrimary: roleCode === primaryRoleCode,
        },
      });
    }
  }
}
