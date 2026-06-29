import { OrgStatus } from "@prisma/client";

/** Companies authorized by Drejtoria for installer/certifier selection. */
export const AUTHORIZED_COMPANY_STATUSES: OrgStatus[] = [
  OrgStatus.ACTIVE_AUTHORIZED,
  OrgStatus.ACTIVE,
];

/** Statuses that block company selection in applications. */
export const BLOCKED_COMPANY_STATUSES: OrgStatus[] = [
  OrgStatus.PENDING_VALIDATION,
  OrgStatus.REJECTED,
  OrgStatus.SUSPENDED,
  OrgStatus.REVOKED,
  OrgStatus.EXPIRED,
  OrgStatus.INACTIVE,
];

export const ORG_STATUS_LABELS: Record<OrgStatus, string> = {
  [OrgStatus.PENDING_VALIDATION]: "Në pritje validimi",
  [OrgStatus.ACTIVE_AUTHORIZED]: "E autorizuar",
  [OrgStatus.ACTIVE]: "Aktive",
  [OrgStatus.REJECTED]: "E refuzuar",
  [OrgStatus.SUSPENDED]: "E pezulluar",
  [OrgStatus.REVOKED]: "E revokuar",
  [OrgStatus.EXPIRED]: "Licencë e skaduar",
  [OrgStatus.INACTIVE]: "Joaktive",
};

export function isAuthorizedCompany(status: OrgStatus): boolean {
  return AUTHORIZED_COMPANY_STATUSES.includes(status);
}
