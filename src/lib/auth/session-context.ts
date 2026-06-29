import { OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { getPermissionsForRole } from "@/lib/permissions/matrix";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { isRoleValidForOrgType } from "@/lib/constants/org-role-map";
import type { PermissionCode } from "@/lib/permissions/codes";

export type SessionContext = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  activeOrgId: string;
  activeOrgType: OrgType;
  activeOrgName: string;
  roleCode: RoleCode;
  permissions: PermissionCode[];
};

export async function buildSessionContext(
  userId: string,
  preferredOrgId?: string | null,
): Promise<SessionContext | null> {
  const user = await db.authUser.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    include: {
      memberships: {
        where: { deactivatedAt: null },
        include: {
          organization: true,
          role: true,
        },
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    return null;
  }

  let membership = user.memberships.find((m) => m.organizationId === preferredOrgId);

  if (!membership) {
    membership =
      user.memberships.find((m) => m.isPrimary) ??
      user.memberships.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
  }

  const roleCode = membership.role.code as RoleCode;

  if (roleCode === ROLE_CODES.PUBLIC) {
    return null;
  }

  if (!isRoleValidForOrgType(roleCode, membership.organization.type)) {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    activeOrgId: membership.organizationId,
    activeOrgType: membership.organization.type,
    activeOrgName: membership.organization.name,
    roleCode,
    permissions: getPermissionsForRole(roleCode),
  };
}

export async function buildSessionContextForOrg(
  userId: string,
  organizationId: string,
): Promise<SessionContext | null> {
  return buildSessionContext(userId, organizationId);
}
