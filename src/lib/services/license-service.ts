import { AuditAction, OrgStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { hasPermission } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { OrganizationService } from "@/lib/services/organization-service";
import {
  issueDirectorateLicense,
  type DirectorateLicenseType,
} from "@/lib/licenses/directorate-license-issuance";

export class LicenseService {
  static assertCanManage(ctx: AuthContext) {
    if (ctx.roleCode !== ROLE_CODES.DIRECTORATE || !hasPermission(ctx, PERMISSIONS.LICENSES_MANAGE)) {
      throw new Error("Vetëm Drejtoria mund të menaxhojë licencat.");
    }
  }

  static async listByOrganization(organizationId: string) {
    return db.organizationLicense.findMany({
      where: { organizationId },
      orderBy: { expiryDate: "desc" },
    });
  }

  static async create(
    ctx: AuthContext,
    input: {
      organizationId: string;
      licenseNumber?: string;
      licenseType: string;
      issuedDate: Date;
      expiryDate: Date;
      scope?: string;
      issuedBy?: string;
    },
  ) {
    this.assertCanManage(ctx);

    const org = await OrganizationService.getById(input.organizationId);
    if (!org) throw new Error("Organizata nuk u gjet.");

    if (input.licenseType !== "INSTALLATION" && input.licenseType !== "CERTIFICATION") {
      throw new Error("Lloji i licencës nuk mbështetet.");
    }

    return db.$transaction(async (tx) => {
      if (!input.licenseNumber?.trim()) {
        return issueDirectorateLicense(ctx, tx, {
          organizationId: input.organizationId,
          licenseType: input.licenseType as DirectorateLicenseType,
          issuedDate: input.issuedDate,
          expiryDate: input.expiryDate,
          scope: input.scope,
        });
      }

      OrganizationService.assertCanManageLicenseType(ctx, input.licenseType);

      const license = await tx.organizationLicense.create({
        data: {
          organizationId: input.organizationId,
          licenseNumber: input.licenseNumber.trim(),
          licenseType: input.licenseType,
          issuedDate: input.issuedDate,
          expiryDate: input.expiryDate,
          scope: input.scope,
          issuedBy: input.issuedBy,
          status: OrgStatus.ACTIVE,
          createdById: ctx.userId,
        },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.CREATE,
          entityType: "organization_license",
          entityId: license.id,
          afterState: license,
        },
        tx,
      );

      const { LicensedCompanyRegistrationService } = await import(
        "@/lib/services/licensed-company-registration-service"
      );
      await LicensedCompanyRegistrationService.syncCapabilitiesFromLicenses(input.organizationId, undefined, tx);

      return license;
    });
  }

  static async suspendLicense(ctx: AuthContext, licenseId: string, reason?: string) {
    this.assertCanManage(ctx);

    const existing = await db.organizationLicense.findUnique({
      where: { id: licenseId },
      include: { organization: true },
    });

    if (!existing) throw new Error("Licenca nuk u gjet.");
    if (existing.status === OrgStatus.SUSPENDED) {
      throw new Error("Licenca është pezulluar tashmë.");
    }
    if (existing.status !== OrgStatus.ACTIVE) {
      throw new Error("Vetëm licencat aktive mund të pezullohen.");
    }

    OrganizationService.assertCanManageLicenseType(ctx, existing.licenseType);

    return db.$transaction(async (tx) => {
      const updated = await tx.organizationLicense.update({
        where: { id: licenseId },
        data: { status: OrgStatus.SUSPENDED },
      });

      const now = new Date();
      const remainingActive = await tx.organizationLicense.count({
        where: {
          organizationId: existing.organizationId,
          status: OrgStatus.ACTIVE,
          expiryDate: { gte: now },
        },
      });

      const activeOrgStatuses: OrgStatus[] = [OrgStatus.ACTIVE, OrgStatus.ACTIVE_AUTHORIZED];
      if (remainingActive === 0 && activeOrgStatuses.includes(existing.organization.status)) {
        await tx.organization.update({
          where: { id: existing.organizationId },
          data: { status: OrgStatus.SUSPENDED },
        });
      }

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "organization_license",
          entityId: licenseId,
          beforeState: existing,
          afterState: updated,
          metadata: { enforcement: "SUSPEND_LICENSE", reason: reason ?? null },
        },
        tx,
      );

      const { LicensedCompanyRegistrationService } = await import(
        "@/lib/services/licensed-company-registration-service"
      );
      await LicensedCompanyRegistrationService.syncCapabilitiesFromLicenses(
        existing.organizationId,
        undefined,
        tx,
      );

      return updated;
    });
  }

  static async reinstateLicense(ctx: AuthContext, licenseId: string, reason?: string) {
    this.assertCanManage(ctx);

    const existing = await db.organizationLicense.findUnique({
      where: { id: licenseId },
      include: { organization: true },
    });

    if (!existing) throw new Error("Licenca nuk u gjet.");
    if (existing.status !== OrgStatus.SUSPENDED) {
      throw new Error("Vetëm licencat e pezulluara mund të riaktivizohen.");
    }

    const now = new Date();
    if (existing.expiryDate < now) {
      throw new Error("Licenca ka skaduar - gjeneroni licencë të re.");
    }

    OrganizationService.assertCanManageLicenseType(ctx, existing.licenseType);

    return db.$transaction(async (tx) => {
      const updated = await tx.organizationLicense.update({
        where: { id: licenseId },
        data: { status: OrgStatus.ACTIVE },
      });

      const activeValidCount = await tx.organizationLicense.count({
        where: {
          organizationId: existing.organizationId,
          status: OrgStatus.ACTIVE,
          expiryDate: { gte: now },
        },
      });

      if (activeValidCount > 0 && existing.organization.status === OrgStatus.SUSPENDED) {
        await tx.organization.update({
          where: { id: existing.organizationId },
          data: { status: OrgStatus.ACTIVE },
        });
      }

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "organization_license",
          entityId: licenseId,
          beforeState: existing,
          afterState: updated,
          metadata: { enforcement: "REINSTATE_LICENSE", reason: reason ?? null },
        },
        tx,
      );

      const { LicensedCompanyRegistrationService } = await import(
        "@/lib/services/licensed-company-registration-service"
      );
      await LicensedCompanyRegistrationService.syncCapabilitiesFromLicenses(
        existing.organizationId,
        undefined,
        tx,
      );

      return updated;
    });
  }

  static async revokeLicense(ctx: AuthContext, licenseId: string, reason?: string) {
    this.assertCanManage(ctx);

    const existing = await db.organizationLicense.findUnique({
      where: { id: licenseId },
      include: { organization: true },
    });

    if (!existing) throw new Error("Licenca nuk u gjet.");
    if (existing.status === OrgStatus.REVOKED) {
      throw new Error("Licenca është revokuar tashmë.");
    }

    OrganizationService.assertCanManageLicenseType(ctx, existing.licenseType);

    return db.$transaction(async (tx) => {
      const updated = await tx.organizationLicense.update({
        where: { id: licenseId },
        data: { status: OrgStatus.REVOKED },
      });

      const now = new Date();
      const remainingActive = await tx.organizationLicense.count({
        where: {
          organizationId: existing.organizationId,
          status: OrgStatus.ACTIVE,
          expiryDate: { gte: now },
        },
      });

      const activeOrgStatuses: OrgStatus[] = [OrgStatus.ACTIVE, OrgStatus.ACTIVE_AUTHORIZED];
      if (remainingActive === 0 && activeOrgStatuses.includes(existing.organization.status)) {
        await tx.organization.update({
          where: { id: existing.organizationId },
          data: { status: OrgStatus.SUSPENDED },
        });
      }

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "organization_license",
          entityId: licenseId,
          beforeState: existing,
          afterState: updated,
          metadata: { enforcement: "REVOKE_LICENSE", reason: reason ?? null },
        },
        tx,
      );

      return updated;
    });
  }

  static async updateStatus(
    ctx: AuthContext,
    licenseId: string,
    status: OrgStatus,
  ) {
    this.assertCanManage(ctx);

    const existing = await db.organizationLicense.findUnique({
      where: { id: licenseId },
      include: { organization: true },
    });

    if (!existing) throw new Error("Licenca nuk u gjet.");

    OrganizationService.assertCanManageLicenseType(ctx, existing.licenseType);

    return db.$transaction(async (tx) => {
      const updated = await tx.organizationLicense.update({
        where: { id: licenseId },
        data: { status },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "organization_license",
          entityId: licenseId,
          beforeState: existing,
          afterState: updated,
        },
        tx,
      );

      return updated;
    });
  }
}
