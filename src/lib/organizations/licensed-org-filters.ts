import { OrgStatus, OrgType, type Prisma } from "@prisma/client";

export const LICENSE_TYPES = {
  INSTALLATION: "INSTALLATION",
  CERTIFICATION: "CERTIFICATION",
} as const;

export type LicensedOrgKind = keyof typeof LICENSE_TYPES;

export function activeLicenseWhere(
  licenseType: LicensedOrgKind,
  now = new Date(),
): Prisma.OrganizationLicenseWhereInput {
  return {
    status: OrgStatus.ACTIVE,
    expiryDate: { gte: now },
    licenseType,
  };
}

export function installerOrgWhere(): Prisma.OrganizationWhereInput {
  return { OR: [{ type: OrgType.INSTALLER }, { capInstall: true }] };
}

export function certifierOrgWhere(): Prisma.OrganizationWhereInput {
  return { OR: [{ type: OrgType.CERTIFIER }, { capOm: true }] };
}

export function activeInstallerOrgWhere(now = new Date()): Prisma.OrganizationWhereInput {
  return {
    ...installerOrgWhere(),
    deletedAt: null,
    status: { in: [OrgStatus.ACTIVE, OrgStatus.ACTIVE_AUTHORIZED] },
    licenses: { some: activeLicenseWhere("INSTALLATION", now) },
  };
}

export function activeCertifierOrgWhere(now = new Date()): Prisma.OrganizationWhereInput {
  return {
    ...certifierOrgWhere(),
    deletedAt: null,
    status: { in: [OrgStatus.ACTIVE, OrgStatus.ACTIVE_AUTHORIZED] },
    licenses: { some: activeLicenseWhere("CERTIFICATION", now) },
  };
}
