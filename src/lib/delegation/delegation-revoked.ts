import { DelegationStatus, DelegationType } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";

export const DELEGATION_REVOKED_STATUS_LABEL = "Ftesa u tërhoq";
export const DELEGATION_REVOKED_ACTION_LABEL = "E tërhequr nga personi përgjegjës";
export const DELEGATION_REVOKED_ORG_SUFFIX = "(e tërhequr)";

export type DelegationRef = {
  accessType: DelegationType;
  organizationId: string;
  status: DelegationStatus;
  organization?: { name: string } | null;
};

const LIVE_DELEGATION_STATUSES: DelegationStatus[] = [
  DelegationStatus.PENDING,
  DelegationStatus.INVITED,
  DelegationStatus.ACCEPTED,
];

export function delegationAccessTypeForRole(roleCode: RoleCode): DelegationType | null {
  if (roleCode === ROLE_CODES.INSTALLER) return DelegationType.INSTALLER;
  if (roleCode === ROLE_CODES.CERTIFIER) return DelegationType.CERTIFIER;
  return null;
}

export function findOrgDelegation(
  delegations: DelegationRef[] | undefined,
  orgId: string,
  accessType: DelegationType,
) {
  return delegations?.find((d) => d.organizationId === orgId && d.accessType === accessType);
}

function activeAssigneeOrgId(
  accessType: DelegationType,
  app: { installerOrgId?: string | null; certifierOrgId?: string | null },
) {
  return accessType === DelegationType.INSTALLER ? app.installerOrgId : app.certifierOrgId;
}

/**
 * Revoked delegates keep a frozen view until the same company is invited again.
 * Re-invite clears REVOKED on the org's delegation row (upsert → INVITED).
 */
export function isDelegationRevokedForOrg(
  delegations: DelegationRef[] | undefined,
  roleCode: RoleCode,
  orgId: string | undefined,
  app?: { installerOrgId?: string | null; certifierOrgId?: string | null },
): boolean {
  if (!orgId) return false;
  const accessType = delegationAccessTypeForRole(roleCode);
  if (!accessType) return false;

  const delegation = findOrgDelegation(delegations, orgId, accessType);
  if (!delegation) return false;

  if (app) {
    const activeOrgId = activeAssigneeOrgId(accessType, app);
    if (activeOrgId === orgId && LIVE_DELEGATION_STATUSES.includes(delegation.status)) {
      return false;
    }
  }

  return delegation.status === DelegationStatus.REVOKED;
}

export function findRevokedDelegation(
  delegations: DelegationRef[] | undefined,
  accessType: DelegationType,
) {
  return delegations?.find(
    (d) => d.accessType === accessType && d.status === DelegationStatus.REVOKED,
  );
}

export function displayInstallerColumn(
  app: {
    installerOrg?: { name: string } | null;
    installerOrgId?: string | null;
    delegations?: DelegationRef[];
  },
  ctx: { roleCode: RoleCode; activeOrgId?: string; activeOrgName?: string },
): string {
  if (app.installerOrg?.name) return app.installerOrg.name;

  const revokedForViewer =
    ctx.activeOrgId &&
    isDelegationRevokedForOrg(app.delegations, ROLE_CODES.INSTALLER, ctx.activeOrgId, app);
  if (revokedForViewer && ctx.roleCode === ROLE_CODES.INSTALLER && ctx.activeOrgName) {
    return `${ctx.activeOrgName} ${DELEGATION_REVOKED_ORG_SUFFIX}`;
  }

  const revoked = findRevokedDelegation(app.delegations, DelegationType.INSTALLER);
  if (revoked && !app.installerOrgId && revoked.organization?.name) {
    return `${revoked.organization.name} ${DELEGATION_REVOKED_ORG_SUFFIX}`;
  }

  return "-";
}

export function displayCertifierColumn(
  app: {
    certifierOrg?: { name: string } | null;
    certifierOrgId?: string | null;
    data?: { omiNumber?: string | null } | null;
    delegations?: DelegationRef[];
  },
  ctx: { roleCode: RoleCode; activeOrgId?: string; activeOrgName?: string },
  formatCertifierName: (orgName?: string | null, omiNumber?: string | null) => string | null,
): string {
  const activeName = formatCertifierName(app.certifierOrg?.name, app.data?.omiNumber ?? null);
  if (activeName) return activeName;

  const revokedForViewer =
    ctx.activeOrgId &&
    isDelegationRevokedForOrg(app.delegations, ROLE_CODES.CERTIFIER, ctx.activeOrgId, app);
  if (revokedForViewer && ctx.roleCode === ROLE_CODES.CERTIFIER && ctx.activeOrgName) {
    return `${ctx.activeOrgName} ${DELEGATION_REVOKED_ORG_SUFFIX}`;
  }

  const revoked = findRevokedDelegation(app.delegations, DelegationType.CERTIFIER);
  if (revoked && !app.certifierOrgId && revoked.organization?.name) {
    const revokedLabel = formatCertifierName(revoked.organization.name, app.data?.omiNumber ?? null);
    return `${revokedLabel ?? revoked.organization.name} ${DELEGATION_REVOKED_ORG_SUFFIX}`;
  }

  return "-";
}
