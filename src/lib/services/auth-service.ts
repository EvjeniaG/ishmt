import { OrgStatus, OrgType, type OwnerBuildingRole } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import {
  capabilitiesFromRegistration,
  resolvePrimaryOrgType,
  resolvePrimaryRoleCode,
  type OrgCapabilities,
} from "@/lib/organizations/org-capabilities";
import { MembershipService } from "@/lib/services/membership-service";
import { InstallLicenseRegistrationService, OmLicenseRegistrationService } from "@/lib/services/om-license-registration-service";
import { LicensedCompanyRegistrationService } from "@/lib/services/licensed-company-registration-service";

type RegistrationLevel =
  | "OWNER"
  | "COMPANY"
  | "INSTALLER"
  | "CERTIFIER"
  | "MAINTENANCE"
  | "INSPECTOR"
  | "CHIEF_INSPECTOR"
  | "ADMIN"
  | "DIRECTORATE";

const LEVEL_CONFIG: Record<
  Exclude<RegistrationLevel, "COMPANY">,
  { orgType: OrgType; roleCode: RoleCode; status: OrgStatus; sharedOrg: boolean; requiresQkb: boolean }
> = {
  OWNER: { orgType: OrgType.OWNER, roleCode: ROLE_CODES.OWNER, status: OrgStatus.ACTIVE, sharedOrg: false, requiresQkb: false },
  INSTALLER: { orgType: OrgType.INSTALLER, roleCode: ROLE_CODES.INSTALLER, status: OrgStatus.PENDING_VALIDATION, sharedOrg: false, requiresQkb: false },
  CERTIFIER: { orgType: OrgType.CERTIFIER, roleCode: ROLE_CODES.CERTIFIER, status: OrgStatus.PENDING_VALIDATION, sharedOrg: false, requiresQkb: false },
  MAINTENANCE: { orgType: OrgType.MAINTENANCE, roleCode: ROLE_CODES.MAINTENANCE, status: OrgStatus.PENDING_VALIDATION, sharedOrg: false, requiresQkb: true },
  INSPECTOR: { orgType: OrgType.ISHMT, roleCode: ROLE_CODES.INSPECTOR, status: OrgStatus.ACTIVE, sharedOrg: true, requiresQkb: false },
  CHIEF_INSPECTOR: { orgType: OrgType.ISHMT, roleCode: ROLE_CODES.CHIEF_INSPECTOR, status: OrgStatus.ACTIVE, sharedOrg: true, requiresQkb: false },
  ADMIN: { orgType: OrgType.ISHMT, roleCode: ROLE_CODES.ADMIN, status: OrgStatus.ACTIVE, sharedOrg: true, requiresQkb: false },
  DIRECTORATE: { orgType: OrgType.DIRECTORATE, roleCode: ROLE_CODES.DIRECTORATE, status: OrgStatus.ACTIVE, sharedOrg: true, requiresQkb: false },
};

export class AuthService {
  static async registerOwner(input: {
    personalNumber: string;
    idCardNumber: string;
    email: string;
    password: string;
    firstName: string;
    fatherName: string;
    lastName: string;
    motherName: string;
    birthDate: string;
    phone?: string;
    organizationName?: string;
    nipt?: string;
    municipalityId: string;
  }) {
    const passwordCheck = validatePassword(input.password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(" "));
    }

    const email = input.email.toLowerCase().trim();
    const nid = input.personalNumber.trim().toUpperCase();

    const existingEmail = await db.authUser.findUnique({ where: { email } });
    if (existingEmail) {
      throw new Error("Ky email është i regjistruar tashmë.");
    }

    const existingNid = await db.authUser.findUnique({ where: { nid } });
    if (existingNid) {
      throw new Error("Ky Numër Personal është i regjistruar tashmë.");
    }

    const ownerRole = await db.authRole.findUnique({ where: { code: ROLE_CODES.OWNER } });
    if (!ownerRole) {
      throw new Error("Roli OWNER nuk ekziston. Ekzekutoni seed-in.");
    }

    const passwordHash = await hashPassword(input.password);
    const organizationName =
      input.organizationName?.trim() || `${input.firstName} ${input.lastName}`.trim();

    return db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          type: OrgType.OWNER,
          name: organizationName,
          nipt: input.nipt?.trim().toUpperCase() || null,
          municipalityId: input.municipalityId,
          status: OrgStatus.ACTIVE,
        },
      });

      const user = await tx.authUser.create({
        data: {
          email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          nid,
          idCardNumber: input.idCardNumber.trim().toUpperCase(),
          fatherName: input.fatherName,
          motherName: input.motherName,
          birthDate: new Date(input.birthDate),
          emailVerified: true,
        },
      });

      await tx.orgMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: ownerRole.id,
          isPrimary: true,
        },
      });

      return { user, organization };
    });
  }

  static async registerMaintenance(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    organizationName: string;
    nipt: string;
    municipalityId: string;
    address?: string;
  }) {
    const passwordCheck = validatePassword(input.password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(" "));
    }

    const email = input.email.toLowerCase().trim();
    const nipt = input.nipt.trim().toUpperCase();

    const existingUser = await db.authUser.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error("Ky email është i regjistruar tashmë.");
    }

    const existingNipt = await db.organization.findFirst({
      where: { nipt, deletedAt: null },
    });
    if (existingNipt) {
      throw new Error("Ky NIPT është i regjistruar tashmë.");
    }

    const maintenanceRole = await db.authRole.findUnique({
      where: { code: ROLE_CODES.MAINTENANCE },
    });
    if (!maintenanceRole) {
      throw new Error("Roli MAINTENANCE nuk ekziston. Ekzekutoni seed-in.");
    }

    const passwordHash = await hashPassword(input.password);

    return db.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          type: OrgType.MAINTENANCE,
          name: input.organizationName,
          nipt,
          municipalityId: input.municipalityId,
          address: input.address,
          status: OrgStatus.PENDING_VALIDATION,
          qkbValidated: false,
        },
      });

      const user = await tx.authUser.create({
        data: {
          email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          emailVerified: true,
        },
      });

      await tx.orgMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          roleId: maintenanceRole.id,
          isPrimary: true,
        },
      });

      await tx.qkbValidation.create({
        data: {
          organizationId: organization.id,
          nipt,
          status: "PENDING",
          initiatedById: user.id,
          requestData: {
            nipt,
            organizationName: input.organizationName,
            submittedAt: new Date().toISOString(),
          },
        },
      });

      return { user, organization };
    });
  }

  /** Generic self-registration that works for every access level. */
  static async registerAccount(input: {
    level: RegistrationLevel;
    capInstall?: boolean;
    capMaintenance?: boolean;
    capOm?: boolean;
    omLicenseNumber?: string;
    installLicenseNumber?: string;
    personalNumber?: string;
    idCardNumber?: string;
    email: string;
    password: string;
    firstName: string;
    fatherName?: string;
    lastName: string;
    motherName?: string;
    birthDate?: string;
    phone?: string;
    organizationName?: string;
    ownerBuildingRole?: string;
    nipt?: string;
    municipalityId?: string;
  }) {
    // Defense in depth: even if the validation layer is bypassed, public self-registration
    // can NEVER create privileged institutional accounts. These are provisioned internally.
    const PUBLIC_SELF_REGISTRATION_LEVELS: RegistrationLevel[] = [
      "OWNER",
      "COMPANY",
      "INSTALLER",
      "CERTIFIER",
      "MAINTENANCE",
    ];
    if (!PUBLIC_SELF_REGISTRATION_LEVELS.includes(input.level)) {
      throw new Error("Ky nivel aksesi nuk mund të regjistrohet publikisht.");
    }

    const isCompany = ["COMPANY", "INSTALLER", "CERTIFIER", "MAINTENANCE"].includes(input.level);

    const passwordCheck = validatePassword(input.password);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(" "));
    }

    const email = input.email.toLowerCase().trim();
    const nid = input.personalNumber?.trim().toUpperCase() || null;
    const nipt = input.nipt?.trim().toUpperCase() || null;

    let companyCapabilities: OrgCapabilities | null = null;

    if (isCompany && input.level === "COMPANY" && nipt) {
      const niptLookup = await LicensedCompanyRegistrationService.lookupNiptStatus(nipt);
      if (niptLookup.status === "HAS_ACTIVE_ACCOUNT") {
        throw new Error(`Ekziston tashmë llogari aktive për këtë kompani (${niptLookup.orgName}).`);
      }
      if (niptLookup.status === "DIRECTORATE_REGISTERED") {
        companyCapabilities = {
          capInstall: niptLookup.capabilities.capInstall,
          capOm: niptLookup.capabilities.capOm,
          capMaintenance: input.capMaintenance === true,
        };
      } else if (niptLookup.status === "NOT_IN_DIRECTORATE" || niptLookup.status === "TOO_SHORT") {
        companyCapabilities = {
          capInstall: false,
          capOm: false,
          capMaintenance: true,
        };
      }
    }

    if (isCompany && !companyCapabilities) {
      companyCapabilities = capabilitiesFromRegistration({
        level: input.level,
        capInstall: input.capInstall,
        capMaintenance: input.capMaintenance,
        capOm: input.capOm,
      });
    }

    const config =
      input.level === "COMPANY"
        ? null
        : LEVEL_CONFIG[input.level as Exclude<RegistrationLevel, "COMPANY">];
    if (!isCompany && !config) {
      throw new Error("Niveli i aksesit nuk është i vlefshëm.");
    }

    const existingEmail = await db.authUser.findUnique({ where: { email } });
    if (existingEmail) {
      throw new Error("Ky email është i regjistruar tashmë.");
    }

    // Companies/businesses authenticate with NIPT; individuals with Numri Personal.
    if (isCompany) {
      if (!nipt) {
        throw new Error("NIPT është i detyrueshëm për kompanitë.");
      }
    } else if (!nid) {
      throw new Error("Numri Personal është i detyrueshëm.");
    }

    if (nid) {
      const existingNid = await db.authUser.findUnique({ where: { nid } });
      if (existingNid) {
        throw new Error("Ky Numër Personal është i regjistruar tashmë.");
      }
    }

    const roleCode = isCompany
      ? resolvePrimaryRoleCode(companyCapabilities!)
      : config!.roleCode;
    const role = await db.authRole.findUnique({ where: { code: roleCode } });
    if (!role) {
      throw new Error(`Roli ${roleCode} nuk ekziston. Ekzekutoni seed-in.`);
    }

    let claimOrgId: string | null = null;

    if (isCompany && input.level === "COMPANY" && (companyCapabilities!.capInstall || companyCapabilities!.capOm)) {
      const niptClaim = await LicensedCompanyRegistrationService.validateNiptClaim(nipt!);
      claimOrgId = niptClaim.organization.id;
    } else if (isCompany && companyCapabilities!.capInstall) {
      if (!input.installLicenseNumber?.trim()) {
        throw new Error("Numri i licencës së instalimit është i detyrueshëm.");
      }
      const installClaim = await InstallLicenseRegistrationService.validateClaim({
        licenseNumber: input.installLicenseNumber,
        nipt: nipt!,
      });
      claimOrgId = installClaim.organization.id;
    }

    if (isCompany && companyCapabilities!.capOm && !claimOrgId) {
      if (!input.omLicenseNumber?.trim()) {
        throw new Error("Numri i licencës OM është i detyrueshëm.");
      }
      const omClaim = await OmLicenseRegistrationService.validateClaim({
        licenseNumber: input.omLicenseNumber,
        nipt: nipt!,
      });
      if (claimOrgId && omClaim.organization.id !== claimOrgId) {
        throw new Error("Licencat e instalimit dhe OM duhet t'i përkasin të njëjtës kompani.");
      }
      claimOrgId = omClaim.organization.id;
    }

    const isOwner = input.level === "OWNER";
    const ownerBuildingRole = isOwner
      ? (input.ownerBuildingRole as OwnerBuildingRole | undefined)
      : undefined;

    if (isCompany || !config?.sharedOrg) {
      if (isCompany && !nipt) {
        throw new Error("NIPT është i detyrueshëm për kompanitë.");
      }
      if (!isCompany && config!.orgType !== OrgType.OWNER && !nipt) {
        throw new Error("NIPT është i detyrueshëm për këtë nivel.");
      }
      if (isOwner && ownerBuildingRole && ownerBuildingRole !== "ADMINISTRATOR" && !nipt) {
        throw new Error("NIPT është i detyrueshëm për këtë lloj subjekti.");
      }
      if (nipt) {
        const existingNipt = await db.organization.findFirst({ where: { nipt, deletedAt: null } });
        if (existingNipt && existingNipt.id !== claimOrgId) {
          throw new Error("Ky NIPT është i regjistruar tashmë.");
        }
      }
    }

    const passwordHash = await hashPassword(input.password);
    const organizationName = isOwner
      ? input.organizationName?.trim() || `${input.firstName} ${input.lastName}`.trim()
      : input.organizationName?.trim() || `${input.firstName} ${input.lastName}`.trim();
    const representativeName = isOwner ? `${input.firstName} ${input.lastName}`.trim() : null;

    return db.$transaction(async (tx) => {
      let organizationId: string;

      if (config?.sharedOrg) {
        const existingOrg = await tx.organization.findFirst({
          where: { type: config.orgType, deletedAt: null },
          orderBy: { createdAt: "asc" },
        });
        if (!existingOrg) {
          throw new Error("Organizata institucionale nuk ekziston. Kontaktoni administratorin.");
        }
        organizationId = existingOrg.id;
      } else if (claimOrgId) {
        const existingOrg = await tx.organization.findUniqueOrThrow({ where: { id: claimOrgId } });
        const preservedStatuses: OrgStatus[] = [OrgStatus.ACTIVE, OrgStatus.ACTIVE_AUTHORIZED];
        const nextStatus = preservedStatuses.includes(existingOrg.status)
          ? existingOrg.status
          : OrgStatus.PENDING_VALIDATION;

        await tx.organization.update({
          where: { id: claimOrgId },
          data: {
            type: resolvePrimaryOrgType(companyCapabilities!),
            capInstall: companyCapabilities!.capInstall || existingOrg.capInstall === true,
            capMaintenance: companyCapabilities!.capMaintenance || existingOrg.capMaintenance === true,
            capOm: companyCapabilities!.capOm || existingOrg.capOm === true,
            name: organizationName || existingOrg.name,
            nipt: nipt ?? existingOrg.nipt,
            municipalityId: input.municipalityId ?? existingOrg.municipalityId,
            email: email,
            phone: input.phone ?? existingOrg.phone,
            status: nextStatus,
            qkbValidated: companyCapabilities!.capMaintenance ? false : existingOrg.qkbValidated,
          },
        });
        organizationId = claimOrgId;
      } else {
        const organization = await tx.organization.create({
          data: {
            type: isCompany ? resolvePrimaryOrgType(companyCapabilities!) : config!.orgType,
            capInstall: companyCapabilities?.capInstall ?? false,
            capMaintenance: companyCapabilities?.capMaintenance ?? false,
            capOm: companyCapabilities?.capOm ?? false,
            name: organizationName,
            nipt,
            municipalityId: input.municipalityId ?? null,
            email: isOwner ? email : undefined,
            phone: isOwner ? input.phone ?? null : undefined,
            ownerBuildingRole: ownerBuildingRole ?? undefined,
            representativeName,
            status: isCompany ? OrgStatus.PENDING_VALIDATION : config!.status,
            qkbValidated: isCompany
              ? !companyCapabilities!.capMaintenance
              : config!.requiresQkb
                ? false
                : undefined,
          },
        });
        organizationId = organization.id;
      }

      if (isCompany) {
        const organization = await tx.organization.findUniqueOrThrow({ where: { id: organizationId } });
        const user = await tx.authUser.create({
          data: {
            email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            nid,
            idCardNumber: input.idCardNumber?.trim().toUpperCase() || null,
            fatherName: input.fatherName || null,
            motherName: input.motherName || null,
            birthDate: input.birthDate ? new Date(input.birthDate) : null,
            emailVerified: true,
          },
        });

        await MembershipService.grantCapabilityMemberships(tx, user.id, organization, {
          primaryRoleCode: roleCode,
        });

        if (companyCapabilities!.capMaintenance && nipt) {
          const existingQkb = await tx.qkbValidation.findFirst({
            where: { organizationId, nipt, status: "PENDING" },
          });
          if (!existingQkb) {
            await tx.qkbValidation.create({
              data: {
                organizationId,
                nipt,
                status: "PENDING",
                initiatedById: user.id,
                requestData: {
                  nipt,
                  organizationName,
                  submittedAt: new Date().toISOString(),
                },
              },
            });
          }
        }

        return { user, organizationId };
      }

      const user = await tx.authUser.create({
        data: {
          email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          nid,
          idCardNumber: input.idCardNumber?.trim().toUpperCase() || null,
          fatherName: input.fatherName || null,
          motherName: input.motherName || null,
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          emailVerified: true,
        },
      });

      await tx.orgMembership.create({
        data: {
          userId: user.id,
          organizationId,
          roleId: role.id,
          isPrimary: true,
        },
      });

      if (config?.requiresQkb && nipt) {
        await tx.qkbValidation.create({
          data: {
            organizationId,
            nipt,
            status: "PENDING",
            initiatedById: user.id,
            requestData: {
              nipt,
              organizationName,
              submittedAt: new Date().toISOString(),
            },
          },
        });
      }

      return { user, organizationId };
    });
  }

  static async createPasswordResetToken(email: string) {
    const user = await db.authUser.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null, isActive: true },
    });

    if (!user) {
      return null;
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    });

    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    if (process.env.NODE_ENV !== "production") {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      console.log("\n=== PASSWORD RESET TOKEN (dev only) ===");
      console.log(`Email: ${user.email}`);
      console.log(`Token: ${rawToken}`);
      console.log(`URL: ${baseUrl}/auth/reset-password?token=${rawToken}`);
      console.log(`Expires: ${expiresAt.toISOString()}`);
      console.log("========================================\n");
    }

    return { email: user.email, token: rawToken };
  }

  static async resetPassword(rawToken: string, newPassword: string) {
    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      throw new Error(passwordCheck.errors.join(" "));
    }

    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new Error("Token i pavlefshëm, i skaduar ose i përdorur.");
    }

    const passwordHash = await hashPassword(newPassword);

    await db.$transaction(async (tx) => {
      const updated = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      if (updated.count === 0) {
        throw new Error("Token i pavlefshëm, i skaduar ose i përdorur.");
      }

      await tx.authUser.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
    });
  }
}
