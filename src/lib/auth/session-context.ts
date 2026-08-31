import { OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { getPermissionsForRole } from "@/lib/permissions/matrix";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { isRoleValidForOrgType } from "@/lib/constants/org-role-map";
import type { PermissionCode } from "@/lib/permissions/codes";
import {
  capabilitiesFromOrg,
  capabilityRoleCodes,
  isLicensedServiceProvider,
  type OrgCapabilities,
} from "@/lib/organizations/org-capabilities";
import { LicensedCompanyRegistrationService } from "@/lib/services/licensed-company-registration-service";

export type SessionContext = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  activeMembershipId: string;
  activeOrgId: string;
  activeOrgType: OrgType;
  activeOrgName: string;
  roleCode: RoleCode;
  permissions: PermissionCode[];
  orgCapabilities: OrgCapabilities | null;
};

function mergePermissionsForOrganization(
  roleCode: RoleCode,
  organization: {
    type: OrgType;
    capInstall?: boolean | null;
    capMaintenance?: boolean | null;
    capOm?: boolean | null;
  },
): PermissionCode[] {
  if (!isLicensedServiceProvider(organization)) {
    return getPermissionsForRole(roleCode);
  }

  const caps = capabilitiesFromOrg(organization);
  const roleCodes = capabilityRoleCodes(caps);
  const merged = new Set<PermissionCode>();
  for (const code of roleCodes) {
    for (const permission of getPermissionsForRole(code)) {
      merged.add(permission);
    }
  }
  return [...merged];
}

export type SessionPreference =
  | string
  | null
  | undefined
  | {
      organizationId?: string | null;
      membershipId?: string | null;
    };

function normalizePreference(preference: SessionPreference) {
  if (typeof preference === "string") {
    return { organizationId: preference, membershipId: null as string | null };
  }
  return {
    organizationId: preference?.organizationId ?? null,
    membershipId: preference?.membershipId ?? null,
  };
}

export async function buildSessionContext(
  userId: string,
  preference?: SessionPreference,
): Promise<SessionContext | null> {
  const { organizationId, membershipId } = normalizePreference(preference);

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

  let membership =
    (membershipId ? user.memberships.find((m) => m.id === membershipId) : null) ??
    (organizationId ? user.memberships.find((m) => m.organizationId === organizationId) : null);

  if (!membership) {
    membership =
      user.memberships.find((m) => m.isPrimary) ??
      user.memberships.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime())[0];
  }

  const roleCode = membership.role.code as RoleCode;

  if (roleCode === ROLE_CODES.PUBLIC) {
    return null;
  }

  if (!isRoleValidForOrgType(roleCode, membership.organization)) {
    return null;
  }

  let organization = membership.organization;
  if (isLicensedServiceProvider(organization)) {
    const synced = await LicensedCompanyRegistrationService.syncCapabilitiesFromLicenses(
      organization.id,
      user.id,
    );
    if (synced) {
      organization = { ...organization, ...synced };
    }
  }

  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    activeMembershipId: membership.id,
    activeOrgId: membership.organizationId,
    activeOrgType: organization.type,
    activeOrgName: organization.name,
    roleCode,
    permissions: mergePermissionsForOrganization(roleCode, organization),
    orgCapabilities: isLicensedServiceProvider(organization)
      ? capabilitiesFromOrg(organization)
      : null,
  };
}

export async function buildSessionContextForOrg(
  userId: string,
  organizationId: string,
  membershipId?: string | null,
): Promise<SessionContext | null> {
  return buildSessionContext(userId, { organizationId, membershipId });
}

export async function buildSessionContextForMembership(
  userId: string,
  membershipId: string,
): Promise<SessionContext | null> {
  return buildSessionContext(userId, { membershipId });
}
