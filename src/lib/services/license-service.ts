import { AuditAction, OrgStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { hasPermission } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { OrganizationService } from "@/lib/services/organization-service";

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
      licenseNumber: string;
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

    OrganizationService.assertCanManageLicensedCompany(ctx, org.type);

    return db.$transaction(async (tx) => {
      const license = await tx.organizationLicense.create({
        data: {
          ...input,
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

      return license;
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

    OrganizationService.assertCanManageLicensedCompany(ctx, existing.organization.type);

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

    OrganizationService.assertCanManageLicensedCompany(ctx, existing.organization.type);

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
