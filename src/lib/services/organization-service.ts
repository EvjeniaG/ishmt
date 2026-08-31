import { AuditAction, OrgStatus, OrgType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import { ownerRequiresNipt } from "@/lib/registration/owner-entity-role";
import type { AuthContext } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { hasPermission } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import {
  activeCertifierOrgWhere,
  activeInstallerOrgWhere,
} from "@/lib/organizations/licensed-org-filters";
import {
  capabilitiesFromOrg,
  isLicensedServiceProvider,
  resolvePrimaryOrgType,
  resolvePrimaryRoleCode,
  type OrgCapabilities,
} from "@/lib/organizations/org-capabilities";

export type CreateLicensedCompanyInput = {
  capabilities: OrgCapabilities;
  name: string;
  nipt?: string;
  municipalityId?: string;
  address?: string;
  phone?: string;
  email?: string;
  adminEmail?: string;
  adminFirstName?: string;
  adminLastName?: string;
};

function directorateRegistryWhere(): Prisma.OrganizationWhereInput {
  const now = new Date();
  return {
    OR: [
      { capInstall: true },
      { capOm: true },
      {
        licenses: {
          some: {
            licenseType: { in: ["INSTALLATION", "CERTIFICATION"] },
            status: OrgStatus.ACTIVE,
            expiryDate: { gte: now },
          },
        },
      },
    ],
  };
}

function isMaintenanceOnlyPortalOrg(org: {
  type: OrgType;
  capInstall?: boolean | null;
  capOm?: boolean | null;
  capMaintenance?: boolean | null;
  licenses: { licenseType: string; status: OrgStatus; expiryDate: Date }[];
}) {
  const caps = capabilitiesFromOrg(org);
  if (caps.capInstall || caps.capOm) return false;
  const now = new Date();
  const hasDirectorateLicense = org.licenses.some(
    (license) =>
      (license.licenseType === "INSTALLATION" || license.licenseType === "CERTIFICATION") &&
      license.status === OrgStatus.ACTIVE &&
      license.expiryDate >= now,
  );
  return caps.capMaintenance && !hasDirectorateLicense;
}

export class OrganizationService {
  static assertCanManageCapabilities(ctx: AuthContext, capabilities: OrgCapabilities) {
    if (ctx.roleCode !== ROLE_CODES.DIRECTORATE) {
      throw new Error("Vetëm Drejtoria mund të menaxhojë kompanitë e licencuara.");
    }

    if (capabilities.capInstall && !hasPermission(ctx, PERMISSIONS.ORG_MANAGE_INSTALLER)) {
      throw new Error("Nuk keni leje për të regjistruar kompani instalimi.");
    }

    if (capabilities.capOm && !hasPermission(ctx, PERMISSIONS.ORG_MANAGE_CERTIFIER)) {
      throw new Error("Nuk keni leje për të regjistruar kompani OM.");
    }
  }

  static assertCanManageLicensedCompany(ctx: AuthContext, type: OrgType) {
    const capabilities = capabilitiesFromOrg({ type });
    this.assertCanManageCapabilities(ctx, capabilities);
  }

  static assertCanManageLicenseType(ctx: AuthContext, licenseType: string) {
    if (ctx.roleCode !== ROLE_CODES.DIRECTORATE) {
      throw new Error("Vetëm Drejtoria mund të menaxhojë licencat.");
    }

    if (licenseType === "INSTALLATION") {
      if (!hasPermission(ctx, PERMISSIONS.ORG_MANAGE_INSTALLER)) {
        throw new Error("Nuk keni leje për licenca instalimi.");
      }
      return;
    }

    if (licenseType === "CERTIFICATION") {
      if (!hasPermission(ctx, PERMISSIONS.ORG_MANAGE_CERTIFIER)) {
        throw new Error("Nuk keni leje për licenca OM.");
      }
      return;
    }

    throw new Error("Lloji i licencës nuk mbështetet.");
  }

  static async findPortalServiceOrgByNipt(nipt: string) {
    const normalizedNipt = nipt.trim().toUpperCase();
    if (!normalizedNipt) return null;

    return db.organization.findFirst({
      where: {
        nipt: normalizedNipt,
        deletedAt: null,
        type: { not: OrgType.OWNER },
      },
      include: { licenses: true },
    });
  }

  static async checkNiptForDirectorateCreate(niptRaw: string) {
    const nipt = niptRaw.trim().toUpperCase();
    if (nipt.length < 8) {
      return { status: "TOO_SHORT" as const };
    }

    const existing = await db.organization.findFirst({
      where: { nipt, deletedAt: null },
      include: { licenses: true },
    });

    if (!existing) {
      return { status: "AVAILABLE" as const };
    }

    if (isMaintenanceOnlyPortalOrg(existing)) {
      return {
        status: "PORTAL_MAINTENANCE" as const,
        organizationId: existing.id,
        orgName: existing.name,
      };
    }

    return {
      status: "ALREADY_REGISTERED" as const,
      organizationId: existing.id,
      orgName: existing.name,
    };
  }

  static async listLicensedCompanies(filters?: {
    type?: OrgType;
    status?: OrgStatus;
    municipalityId?: string;
    search?: string;
  }) {
    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      AND: [directorateRegistryWhere()],
    };

    if (filters?.search) {
      where.AND = [
        directorateRegistryWhere(),
        {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { nipt: { contains: filters.search, mode: "insensitive" } },
          ],
        },
      ];
    } else if (filters?.type === OrgType.INSTALLER) {
      where.AND = [directorateRegistryWhere(), { OR: [{ type: OrgType.INSTALLER }, { capInstall: true }] }];
    } else if (filters?.type === OrgType.CERTIFIER) {
      where.AND = [directorateRegistryWhere(), { OR: [{ type: OrgType.CERTIFIER }, { capOm: true }] }];
    }

    if (filters?.status) where.status = filters.status;
    if (filters?.municipalityId) where.municipalityId = filters.municipalityId;

    return db.organization.findMany({
      where,
      include: {
        municipality: { include: { region: true } },
        licenses: { where: { status: OrgStatus.ACTIVE }, orderBy: { expiryDate: "asc" } },
        _count: { select: { memberships: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  static async getById(id: string) {
    return db.organization.findFirst({
      where: { id, deletedAt: null },
      include: {
        municipality: { include: { region: true } },
        licenses: { orderBy: { expiryDate: "desc" } },
        memberships: {
          where: { deactivatedAt: null },
          include: { user: true, role: true },
        },
      },
    });
  }

  static async createLicensedCompany(ctx: AuthContext, input: CreateLicensedCompanyInput) {
    if (!input.capabilities.capInstall && !input.capabilities.capOm) {
      throw new Error(
        "Regjistrimi nga Drejtoría vlen vetëm për instalim ose OM. Kompani mirëmbajtjeje regjistrohen në portal.",
      );
    }

    this.assertCanManageCapabilities(ctx, input.capabilities);

    if (input.nipt) {
      const normalizedNipt = input.nipt.trim().toUpperCase();
      const existing = await db.organization.findFirst({
        where: { nipt: normalizedNipt, deletedAt: null },
        include: { licenses: true },
      });
      if (existing) {
        if (isMaintenanceOnlyPortalOrg(existing)) {
          throw new Error(
            "Ky NIPT është kompani mirëmbajtjeje në portal. Shtoni licenca instalimi ose OM nga faqja e licencave.",
          );
        }
        throw new Error("Ky NIPT ekziston tashmë në regjistrin e Drejtorisë.");
      }
    }

    const primaryType = resolvePrimaryOrgType(input.capabilities);

    return db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          type: primaryType,
          capInstall: input.capabilities.capInstall,
          capMaintenance: input.capabilities.capMaintenance,
          capOm: input.capabilities.capOm,
          name: input.name,
          nipt: input.nipt,
          municipalityId: input.municipalityId,
          address: input.address,
          phone: input.phone,
          email: input.email,
          status: OrgStatus.ACTIVE_AUTHORIZED,
          createdById: ctx.userId,
        },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.CREATE,
          entityType: "organization",
          entityId: org.id,
          afterState: org,
        },
        tx,
      );

      const { issueDirectorateLicense } = await import("@/lib/licenses/directorate-license-issuance");
      const issuedLicenses: { licenseType: string; licenseNumber: string }[] = [];

      if (input.capabilities.capInstall) {
        const license = await issueDirectorateLicense(ctx, tx, {
          organizationId: org.id,
          licenseType: "INSTALLATION",
        });
        issuedLicenses.push({
          licenseType: license.licenseType,
          licenseNumber: license.licenseNumber,
        });
      }

      if (input.capabilities.capOm) {
        const license = await issueDirectorateLicense(ctx, tx, {
          organizationId: org.id,
          licenseType: "CERTIFICATION",
        });
        issuedLicenses.push({
          licenseType: license.licenseType,
          licenseNumber: license.licenseNumber,
        });
      }

      return { org, issuedLicenses };
    }).then(async ({ org, issuedLicenses }) => {
      if (input.adminEmail && input.adminFirstName && input.adminLastName) {
        const { InvitationService } = await import("@/lib/services/invitation-service");
        const roleCode = resolvePrimaryRoleCode(input.capabilities);

        await InvitationService.createInvitation({
          organizationId: org.id,
          email: input.adminEmail,
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          roleCode,
          invitedById: ctx.userId,
        });
      }

      return { ...org, issuedLicenses };
    });
  }

  static async updateLicensedCompany(
    ctx: AuthContext,
    id: string,
    data: {
      name?: string;
      nipt?: string;
      municipalityId?: string;
      address?: string;
      phone?: string;
      email?: string;
      status?: OrgStatus;
    },
  ) {
    const org = await this.getById(id);
    if (!org) throw new Error("Organizata nuk u gjet.");
    if (!isLicensedServiceProvider(org)) {
      throw new Error("Vetëm kompanitë e shërbimit mund të përditësohen nga Drejtoria.");
    }

    this.assertCanManageCapabilities(ctx, capabilitiesFromOrg(org));

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.organization.update({
        where: { id },
        data,
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "organization",
          entityId: id,
          beforeState: org,
          afterState: result,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  static async suspendCompany(ctx: AuthContext, id: string, reason?: string) {
    const org = await this.getById(id);
    if (!org) throw new Error("Organizata nuk u gjet.");
    if (!isLicensedServiceProvider(org)) {
      throw new Error("Vetëm kompanitë e shërbimit mund të pezullohen.");
    }
    this.assertCanManageCapabilities(ctx, capabilitiesFromOrg(org));
    if (org.status === OrgStatus.SUSPENDED) {
      throw new Error("Kompania është pezulluar tashmë.");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: { status: OrgStatus.SUSPENDED },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "organization",
          entityId: id,
          beforeState: { status: org.status },
          afterState: { status: updated.status },
          metadata: { enforcement: "SUSPEND", reason: reason ?? null },
        },
        tx,
      );

      return updated;
    });
  }

  static async revokeCompany(ctx: AuthContext, id: string, reason?: string) {
    const org = await this.getById(id);
    if (!org) throw new Error("Organizata nuk u gjet.");
    if (!isLicensedServiceProvider(org)) {
      throw new Error("Vetëm kompanitë e shërbimit mund të revokohen.");
    }
    this.assertCanManageCapabilities(ctx, capabilitiesFromOrg(org));
    if (org.status === OrgStatus.REVOKED) {
      throw new Error("Kompania është revokuar tashmë.");
    }

    return db.$transaction(async (tx) => {
      await tx.organizationLicense.updateMany({
        where: { organizationId: id, status: OrgStatus.ACTIVE },
        data: { status: OrgStatus.REVOKED },
      });

      const updated = await tx.organization.update({
        where: { id },
        data: { status: OrgStatus.REVOKED },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "organization",
          entityId: id,
          beforeState: { status: org.status },
          afterState: { status: updated.status },
          metadata: { enforcement: "REVOKE", reason: reason ?? null },
        },
        tx,
      );

      return updated;
    });
  }

  static async reinstateCompany(ctx: AuthContext, id: string, reason?: string) {
    const org = await this.getById(id);
    if (!org) throw new Error("Organizata nuk u gjet.");
    if (!isLicensedServiceProvider(org)) {
      throw new Error("Vetëm kompanitë e shërbimit mund të riaktivizohen.");
    }
    this.assertCanManageCapabilities(ctx, capabilitiesFromOrg(org));

    const reinstatable: OrgStatus[] = [
      OrgStatus.SUSPENDED,
      OrgStatus.REVOKED,
      OrgStatus.EXPIRED,
      OrgStatus.INACTIVE,
    ];
    if (!reinstatable.includes(org.status)) {
      throw new Error("Kompania nuk është pezulluar ose revokuar.");
    }

    const now = new Date();
    const hasValidLicense = org.licenses.some(
      (license) => license.status === OrgStatus.ACTIVE && license.expiryDate >= now,
    );
    const nextStatus = hasValidLicense ? OrgStatus.ACTIVE : OrgStatus.ACTIVE_AUTHORIZED;

    return db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: { status: nextStatus },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "organization",
          entityId: id,
          beforeState: { status: org.status },
          afterState: { status: updated.status },
          metadata: { enforcement: "REINSTATE", reason: reason ?? null },
        },
        tx,
      );

      return updated;
    });
  }

  static async rejectCompany(ctx: AuthContext, id: string, reason?: string) {
    const org = await this.getById(id);
    if (!org) throw new Error("Organizata nuk u gjet.");
    if (!isLicensedServiceProvider(org)) {
      throw new Error("Vetëm kompanitë e shërbimit mund të refuzohen.");
    }
    this.assertCanManageCapabilities(ctx, capabilitiesFromOrg(org));

    return db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: { status: OrgStatus.REJECTED },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "organization",
          entityId: id,
          beforeState: { status: org.status },
          afterState: { status: updated.status },
          metadata: { enforcement: "REJECT", reason: reason ?? null },
        },
        tx,
      );

      return updated;
    });
  }

  static async updateOwnOrganization(
    ctx: AuthContext,
    data: {
      name?: string;
      nipt?: string;
      ownerBuildingRole?: string;
    },
  ) {
    const org = await this.getById(ctx.activeOrgId);
    if (!org) throw new Error("Organizata nuk u gjet.");

    const canEdit =
      (org.type === OrgType.OWNER || org.type === OrgType.MAINTENANCE) &&
      hasPermission(ctx, PERMISSIONS.ORG_EDIT_OWN);

    if (!canEdit && ctx.roleCode !== ROLE_CODES.ADMIN) {
      throw new Error("Nuk keni leje për të përditësuar këtë organizatë.");
    }

    const role = data.ownerBuildingRole ?? org.ownerBuildingRole ?? undefined;
    const isAdministrator = role === "ADMINISTRATOR";
    const fullName = `${ctx.firstName} ${ctx.lastName}`.trim();
    const resolvedName = isAdministrator ? fullName : data.name?.trim() || org.name;
    const resolvedNipt = ownerRequiresNipt(role)
      ? data.nipt?.trim().toUpperCase() || org.nipt
      : null;

    return db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: ctx.activeOrgId },
        data: {
          name: resolvedName,
          nipt: resolvedNipt,
          ownerBuildingRole: data.ownerBuildingRole as Prisma.OrganizationUpdateInput["ownerBuildingRole"],
        },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "organization",
          entityId: org.id,
          beforeState: {
            name: org.name,
            nipt: org.nipt,
            municipalityId: org.municipalityId,
          },
          afterState: {
            name: updated.name,
            nipt: updated.nipt,
            municipalityId: updated.municipalityId,
          },
        },
        tx,
      );

      return updated;
    });
  }

  static async updateCompanyOrganization(ctx: AuthContext, data: { name: string }) {
    const org = await this.getById(ctx.activeOrgId);
    if (!org) throw new Error("Organizata nuk u gjet.");

    const isCompanyOrg =
      org.type === OrgType.INSTALLER ||
      org.type === OrgType.CERTIFIER ||
      org.type === OrgType.MAINTENANCE;

    if (!isCompanyOrg) {
      throw new Error("Ky profil organizate nuk mbështetet.");
    }

    if (!hasPermission(ctx, PERMISSIONS.ORG_EDIT_OWN) && ctx.roleCode !== ROLE_CODES.ADMIN) {
      throw new Error("Nuk keni leje për të përditësuar këtë organizatë.");
    }

    const trimmedName = data.name.trim();
    if (trimmedName.length < 2) {
      throw new Error("Emri i organizatës është i detyrueshëm");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: ctx.activeOrgId },
        data: { name: trimmedName },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "organization",
          entityId: org.id,
          beforeState: { name: org.name },
          afterState: { name: updated.name },
        },
        tx,
      );

      return updated;
    });
  }

  static async listActiveSelectableCompanies(type: typeof OrgType.INSTALLER | typeof OrgType.CERTIFIER) {
    const typeFilter =
      type === OrgType.INSTALLER ? activeInstallerOrgWhere() : activeCertifierOrgWhere();

    const orgs = await db.organization.findMany({
      where: typeFilter,
      select: {
        id: true,
        name: true,
        nipt: true,
        memberships: {
          where: { deactivatedAt: null },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    return orgs.map(({ memberships, ...org }) => ({
      ...org,
      hasPortalAccount: memberships.length > 0,
    }));
  }
}
