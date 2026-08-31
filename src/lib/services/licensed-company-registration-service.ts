import { OrgStatus, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { capabilitiesFromOrg, resolvePrimaryOrgType } from "@/lib/organizations/org-capabilities";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { MembershipService } from "@/lib/services/membership-service";

const SERVICE_PROVIDER_ROLE_CODES: RoleCode[] = [
  ROLE_CODES.INSTALLER,
  ROLE_CODES.CERTIFIER,
  ROLE_CODES.MAINTENANCE,
];

export type LicensedCompanyCapabilities = {
  capInstall: boolean;
  capMaintenance: boolean;
  capOm: boolean;
};

export type NiptLookupStatus =
  | { status: "TOO_SHORT" }
  | { status: "HAS_ACTIVE_ACCOUNT"; orgName: string }
  | { status: "NOT_IN_DIRECTORATE" }
  | {
      status: "DIRECTORATE_REGISTERED";
      orgId: string;
      orgName: string;
      nipt: string;
      capabilities: Pick<LicensedCompanyCapabilities, "capInstall" | "capOm">;
      licenses: {
        installLicenseNumber?: string;
        omLicenseNumber?: string;
      };
    };

export type LicensedCompanyLookupStatus =
  | { status: "TOO_SHORT" }
  | { status: "NOT_FOUND" }
  | { status: "INACTIVE" }
  | { status: "HAS_ACTIVE_ACCOUNT"; orgName: string; roleLabel?: string }
  | { status: "NIPT_MISMATCH"; expectedNipt: string }
  | {
      status: "AVAILABLE";
      orgName: string;
      nipt: string | null;
      niptVerified: boolean;
      /** Kompania ekziston në regjistrin e Drejtorisë dhe pret llogari. */
      directorateRegistered?: boolean;
      capabilities?: LicensedCompanyCapabilities;
      licenses?: {
        installLicenseNumber?: string;
        omLicenseNumber?: string;
      };
    };

type LicenseRegistrationConfig = {
  licenseType: "INSTALLATION" | "CERTIFICATION";
  accountRoleCode: RoleCode;
  roleLabel: string;
  licenseRequiredMessage: string;
  notFoundMessage: string;
  activeAccountMessage: (orgName: string) => string;
};

const LICENSE_CONFIG: Record<"INSTALLATION" | "CERTIFICATION", LicenseRegistrationConfig> = {
  INSTALLATION: {
    licenseType: "INSTALLATION",
    accountRoleCode: ROLE_CODES.INSTALLER,
    roleLabel: "instalimi",
    licenseRequiredMessage: "Shkruani numrin e licencës së instalimit nga regjistri i Drejtorisë.",
    notFoundMessage:
      "Numri i licencës së instalimit nuk u gjet në regjistrin e Drejtorisë së Politikave ose nuk është aktiv.",
    activeAccountMessage: (orgName) =>
      `Ekziston tashmë llogari aktive për këtë kompani (${orgName}).`,
  },
  CERTIFICATION: {
    licenseType: "CERTIFICATION",
    accountRoleCode: ROLE_CODES.CERTIFIER,
    roleLabel: "OM",
    licenseRequiredMessage: "Shkruani numrin e licencës OM nga regjistri i Drejtorisë.",
    notFoundMessage:
      "Numri i licencës OM nuk u gjet në regjistrin e Drejtorisë së Politikave ose nuk është aktiv.",
    activeAccountMessage: (orgName) =>
      `Ekziston tashmë llogari aktive për këtë kompani (${orgName}).`,
  },
};

function orgHasServiceProviderAccount(
  memberships: { role: { code: string } }[],
): boolean {
  return memberships.some((membership) =>
    SERVICE_PROVIDER_ROLE_CODES.includes(membership.role.code as RoleCode),
  );
}

function activeLicensesForOrg(
  licenses: { licenseNumber: string; licenseType: string; status: OrgStatus; expiryDate: Date }[],
) {
  const now = new Date();
  return licenses.filter(
    (license) => license.status === OrgStatus.ACTIVE && license.expiryDate >= now,
  );
}

function directorateCapabilitiesFromLicenses(
  licenses: { licenseNumber: string; licenseType: string; status: OrgStatus; expiryDate: Date }[],
) {
  const active = activeLicensesForOrg(licenses);
  const installLicense = active.find((license) => license.licenseType === "INSTALLATION");
  const omLicense = active.find((license) => license.licenseType === "CERTIFICATION");

  return {
    capabilities: {
      capInstall: Boolean(installLicense),
      capOm: Boolean(omLicense),
    },
    licenses: {
      ...(installLicense ? { installLicenseNumber: installLicense.licenseNumber } : {}),
      ...(omLicense ? { omLicenseNumber: omLicense.licenseNumber } : {}),
    },
  };
}

function isDirectorateRegistryOrg(status: OrgStatus) {
  return status === OrgStatus.ACTIVE_AUTHORIZED || status === OrgStatus.ACTIVE;
}

function buildAvailableStatus(
  org: {
    name: string;
    nipt: string | null;
    status: OrgStatus;
    capInstall?: boolean | null;
    capMaintenance?: boolean | null;
    capOm?: boolean | null;
    type: import("@prisma/client").OrgType;
    licenses: { licenseNumber: string; licenseType: string; status: OrgStatus; expiryDate: Date }[];
  },
  niptInput?: string,
) {
  const nipt = niptInput?.trim().toUpperCase();
  const now = new Date();
  const activeLicenses = org.licenses.filter(
    (license) => license.status === OrgStatus.ACTIVE && license.expiryDate >= now,
  );
  const installLicense = activeLicenses.find((license) => license.licenseType === "INSTALLATION");
  const omLicense = activeLicenses.find((license) => license.licenseType === "CERTIFICATION");
  const capabilities = capabilitiesFromOrg(org);

  return {
    status: "AVAILABLE" as const,
    orgName: org.name,
    nipt: org.nipt,
    niptVerified: Boolean(nipt && org.nipt && org.nipt.toUpperCase() === nipt),
    directorateRegistered:
      org.status === OrgStatus.ACTIVE_AUTHORIZED || org.status === OrgStatus.ACTIVE,
    capabilities,
    licenses: {
      ...(installLicense ? { installLicenseNumber: installLicense.licenseNumber } : {}),
      ...(omLicense ? { omLicenseNumber: omLicense.licenseNumber } : {}),
    },
  };
}

export class LicensedCompanyRegistrationService {
  static async lookupNiptStatus(niptRaw: string): Promise<NiptLookupStatus> {
    const nipt = niptRaw.trim().toUpperCase();
    if (nipt.length < 8) {
      return { status: "TOO_SHORT" };
    }

    const org = await db.organization.findFirst({
      where: { nipt, deletedAt: null },
      include: {
        licenses: true,
        memberships: {
          where: { deactivatedAt: null },
          include: { role: true },
        },
      },
    });

    if (org && orgHasServiceProviderAccount(org.memberships)) {
      return { status: "HAS_ACTIVE_ACCOUNT", orgName: org.name };
    }

    if (!org || !isDirectorateRegistryOrg(org.status)) {
      return { status: "NOT_IN_DIRECTORATE" };
    }

    const { capabilities, licenses } = directorateCapabilitiesFromLicenses(org.licenses);
    if (!capabilities.capInstall && !capabilities.capOm) {
      return { status: "NOT_IN_DIRECTORATE" };
    }

    return {
      status: "DIRECTORATE_REGISTERED",
      orgId: org.id,
      orgName: org.name,
      nipt: org.nipt ?? nipt,
      capabilities,
      licenses,
    };
  }

  static async validateNiptClaim(niptRaw: string) {
    const nipt = niptRaw.trim().toUpperCase();
    const lookup = await this.lookupNiptStatus(nipt);

    switch (lookup.status) {
      case "HAS_ACTIVE_ACCOUNT":
        throw new Error(`Ekziston tashmë llogari aktive për këtë kompani (${lookup.orgName}).`);
      case "NOT_IN_DIRECTORATE":
      case "TOO_SHORT":
        throw new Error("NIPT-i nuk u gjet në regjistrin e Drejtorisë me licenca aktive.");
      case "DIRECTORATE_REGISTERED":
        break;
      default:
        throw new Error("Verifikimi i NIPT-it dështoi.");
    }

    const organization = await db.organization.findUniqueOrThrow({
      where: { id: lookup.orgId },
      include: {
        licenses: true,
        memberships: {
          where: { deactivatedAt: null },
          include: { role: true },
        },
      },
    });

    return {
      organization,
      capabilities: lookup.capabilities,
      licenses: lookup.licenses,
    };
  }

  /** Shton funksione të reja kur Drejtoría regjistron licenca pas regjistrimit si mirëmbajtje. */
  static async syncCapabilitiesFromLicenses(
    organizationId: string,
    userId?: string,
    tx: Prisma.TransactionClient = db,
  ) {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      include: { licenses: true },
    });

    if (!org || org.deletedAt) return null;

    const { capabilities } = directorateCapabilitiesFromLicenses(org.licenses);
    const nextCapInstall = org.capInstall === true || capabilities.capInstall;
    const nextCapOm = org.capOm === true || capabilities.capOm;
    const nextType = resolvePrimaryOrgType({
      capInstall: nextCapInstall,
      capMaintenance: org.capMaintenance === true,
      capOm: nextCapOm,
    });
    const shouldAuthorize =
      (nextCapInstall || nextCapOm) && org.status !== OrgStatus.ACTIVE_AUTHORIZED;

    if (
      nextCapInstall === org.capInstall &&
      nextCapOm === org.capOm &&
      nextType === org.type &&
      !shouldAuthorize
    ) {
      return org;
    }

    const updated = await tx.organization.update({
      where: { id: organizationId },
      data: {
        capInstall: nextCapInstall,
        capOm: nextCapOm,
        type: nextType,
        ...(shouldAuthorize ? { status: OrgStatus.ACTIVE_AUTHORIZED } : {}),
      },
    });

    const memberUserIds = userId
      ? [userId]
      : (
          await tx.orgMembership.findMany({
            where: { organizationId, deactivatedAt: null },
            select: { userId: true },
          })
        ).map((membership) => membership.userId);

    for (const memberUserId of memberUserIds) {
      await MembershipService.grantCapabilityMemberships(tx, memberUserId, updated);
    }

    return updated;
  }

  static async lookupLicenseStatus(input: {
    licenseNumber: string;
    nipt?: string;
    licenseKind: keyof typeof LICENSE_CONFIG;
  }): Promise<LicensedCompanyLookupStatus> {
    const config = LICENSE_CONFIG[input.licenseKind];
    const licenseNumber = input.licenseNumber.trim();
    if (licenseNumber.length < 3) {
      return { status: "TOO_SHORT" };
    }

    const license = await db.organizationLicense.findFirst({
      where: {
        licenseNumber: { equals: licenseNumber, mode: "insensitive" },
        licenseType: config.licenseType,
      },
      include: {
        organization: {
          include: {
            licenses: true,
            memberships: {
              where: { deactivatedAt: null },
              include: { role: true },
            },
          },
        },
      },
    });

    if (!license) {
      return { status: "NOT_FOUND" };
    }

    const org = license.organization;
    if (org.deletedAt) {
      return { status: "NOT_FOUND" };
    }

    const now = new Date();
    if (license.status !== OrgStatus.ACTIVE || license.expiryDate < now) {
      return { status: "INACTIVE" };
    }

    if (orgHasServiceProviderAccount(org.memberships)) {
      return {
        status: "HAS_ACTIVE_ACCOUNT",
        orgName: org.name,
        roleLabel: config.roleLabel,
      };
    }

    const nipt = input.nipt?.trim().toUpperCase();
    if (nipt && org.nipt && org.nipt.toUpperCase() !== nipt) {
      return { status: "NIPT_MISMATCH", expectedNipt: org.nipt };
    }

    return buildAvailableStatus(org, nipt);
  }

  static async validateClaim(input: {
    licenseNumber: string;
    nipt: string;
    licenseKind: keyof typeof LICENSE_CONFIG;
  }) {
    const config = LICENSE_CONFIG[input.licenseKind];
    const licenseNumber = input.licenseNumber.trim();
    const nipt = input.nipt.trim().toUpperCase();

    if (licenseNumber.length < 3) {
      throw new Error(config.licenseRequiredMessage);
    }

    const lookup = await this.lookupLicenseStatus({
      licenseNumber,
      nipt,
      licenseKind: input.licenseKind,
    });

    switch (lookup.status) {
      case "NOT_FOUND":
      case "INACTIVE":
        throw new Error(config.notFoundMessage);
      case "HAS_ACTIVE_ACCOUNT":
        throw new Error(config.activeAccountMessage(lookup.orgName));
      case "NIPT_MISMATCH":
        throw new Error("Numri i licencës nuk përputhet me NIPT-in e kompanisë.");
      case "AVAILABLE":
        break;
      default:
        throw new Error(config.licenseRequiredMessage);
    }

    const license = await db.organizationLicense.findFirst({
      where: {
        licenseNumber: { equals: licenseNumber, mode: "insensitive" },
        licenseType: config.licenseType,
        status: OrgStatus.ACTIVE,
        expiryDate: { gte: new Date() },
      },
      include: {
        organization: {
          include: {
            licenses: true,
            memberships: {
              where: { deactivatedAt: null },
              include: { role: true },
            },
          },
        },
      },
    });

    if (!license) {
      throw new Error(config.notFoundMessage);
    }

    return { license, organization: license.organization };
  }
}
