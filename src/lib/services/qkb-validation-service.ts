import { AuditAction, OrgStatus, QkbValidationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { hasPermission } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { hasServiceCapability } from "@/lib/organizations/org-capabilities";
import { QkbLookupService } from "@/lib/services/qkb-lookup-service";

export class QkbValidationService {
  static async submitNipt(ctx: AuthContext, nipt: string) {
    if (!hasServiceCapability(ctx, "maintenance") || !hasPermission(ctx, PERMISSIONS.QKB_SUBMIT)) {
      throw new Error("Vetëm kompanitë e mirëmbajtjes mund të parashtrojnë NIPT.");
    }

    const normalizedNipt = nipt.trim().toUpperCase();

    const org = await db.organization.findUnique({ where: { id: ctx.activeOrgId } });
    if (!org || !org.capMaintenance) {
      throw new Error("Organizata e pavlefshme.");
    }

    if (org.qkbValidated) {
      throw new Error("Organizata është validuar tashmë.");
    }

    // Live (i simuluar) kontroll i statusit në QKB për NIPT-in e dhënë.
    const lookup = await QkbLookupService.lookup(normalizedNipt, org.name);

    return db.$transaction(async (tx) => {
      if (lookup.active) {
        // Subjekt AKTIV në QKB → validim automatik, kompania lejohet të zgjidhet.
        const validation = await tx.qkbValidation.create({
          data: {
            organizationId: org.id,
            nipt: normalizedNipt,
            status: QkbValidationStatus.VALID,
            initiatedById: ctx.userId,
            validatedAt: new Date(),
            requestData: { nipt: normalizedNipt, submittedAt: new Date().toISOString() },
            responseData: { ...lookup, decision: "AUTO_VALIDATED" },
          },
        });

        await tx.organization.update({
          where: { id: org.id },
          data: {
            nipt: normalizedNipt,
            qkbValidated: true,
            qkbValidatedAt: new Date(),
            status: OrgStatus.ACTIVE,
          },
        });

        await AuditService.log(
          {
            actorId: ctx.userId,
            action: AuditAction.STATUS_CHANGE,
            entityType: "qkb_validation",
            entityId: validation.id,
            afterState: { validation, lookup },
          },
          tx,
        );

        return validation;
      }

      // Subjekt JO AKTIV ose i pavlefshëm → nuk lejohet të zgjidhet; mbetet për shqyrtim.
      const validation = await tx.qkbValidation.create({
        data: {
          organizationId: org.id,
          nipt: normalizedNipt,
          status: QkbValidationStatus.INVALID,
          initiatedById: ctx.userId,
          validatedAt: new Date(),
          requestData: { nipt: normalizedNipt, submittedAt: new Date().toISOString() },
          responseData: { ...lookup, decision: "AUTO_REJECTED" },
        },
      });

      await tx.organization.update({
        where: { id: org.id },
        data: { nipt: normalizedNipt, qkbValidated: false, status: OrgStatus.SUSPENDED },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "qkb_validation",
          entityId: validation.id,
          afterState: { validation, lookup },
        },
        tx,
      );

      return validation;
    });
  }

  static async listPending() {
    return db.qkbValidation.findMany({
      where: { status: QkbValidationStatus.PENDING },
      include: {
        organization: { include: { municipality: true } },
        initiatedBy: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static async approve(
    ctx: AuthContext,
    validationId: string,
    input: { verifiedCompanyName?: string; notes?: string },
  ) {
    if (!hasPermission(ctx, PERMISSIONS.QKB_VALIDATE_MANUAL)) {
      throw new Error("Nuk keni leje për validimin manual QKB.");
    }

    const validation = await db.qkbValidation.findUnique({
      where: { id: validationId },
      include: { organization: true },
    });

    if (!validation || validation.status !== QkbValidationStatus.PENDING) {
      throw new Error("Kërkesa e validimit nuk u gjet ose është përpunuar.");
    }

    return db.$transaction(async (tx) => {
      const updatedValidation = await tx.qkbValidation.update({
        where: { id: validationId },
        data: {
          status: QkbValidationStatus.VALID,
          validatedAt: new Date(),
          responseData: {
            verifiedCompanyName: input.verifiedCompanyName,
            notes: input.notes,
            approvedBy: ctx.userId,
            approvedAt: new Date().toISOString(),
          },
        },
      });

      const updatedOrg = await tx.organization.update({
        where: { id: validation.organizationId },
        data: {
          qkbValidated: true,
          qkbValidatedAt: new Date(),
          status: OrgStatus.ACTIVE,
          name: input.verifiedCompanyName ?? validation.organization.name,
        },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "qkb_validation",
          entityId: validationId,
          beforeState: validation,
          afterState: { validation: updatedValidation, organization: updatedOrg },
        },
        tx,
      );

      return updatedValidation;
    });
  }

  static async reject(
    ctx: AuthContext,
    validationId: string,
    reason: string,
  ) {
    if (!hasPermission(ctx, PERMISSIONS.QKB_VALIDATE_MANUAL)) {
      throw new Error("Nuk keni leje për validimin manual QKB.");
    }

    const validation = await db.qkbValidation.findUnique({
      where: { id: validationId },
      include: { organization: true },
    });

    if (!validation || validation.status !== QkbValidationStatus.PENDING) {
      throw new Error("Kërkesa e validimit nuk u gjet ose është përpunuar.");
    }

    return db.$transaction(async (tx) => {
      const updatedValidation = await tx.qkbValidation.update({
        where: { id: validationId },
        data: {
          status: QkbValidationStatus.INVALID,
          validatedAt: new Date(),
          responseData: {
            reason,
            rejectedBy: ctx.userId,
            rejectedAt: new Date().toISOString(),
          },
        },
      });

      const updatedOrg = await tx.organization.update({
        where: { id: validation.organizationId },
        data: { status: OrgStatus.SUSPENDED },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "qkb_validation",
          entityId: validationId,
          beforeState: validation,
          afterState: { validation: updatedValidation, organization: updatedOrg, reason },
        },
        tx,
      );

      return updatedValidation;
    });
  }

  static async getForOrganization(organizationId: string) {
    return db.qkbValidation.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }
}
