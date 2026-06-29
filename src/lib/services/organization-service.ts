import { AuditAction, OrgStatus, OrgType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { hasPermission } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";

export type CreateLicensedCompanyInput = {
  type: typeof OrgType.INSTALLER | typeof OrgType.CERTIFIER;
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

export class OrganizationService {
  static assertCanManageLicensedCompany(ctx: AuthContext, type: OrgType) {
    if (ctx.roleCode !== ROLE_CODES.DIRECTORATE) {
      throw new Error("Vetëm Drejtoria mund të menaxhojë kompanitë e licencuara.");
    }

    if (type === OrgType.INSTALLER && !hasPermission(ctx, PERMISSIONS.ORG_MANAGE_INSTALLER)) {
      throw new Error("Nuk keni leje për të menaxhuar kompanitë e instalimit.");
    }

    if (type === OrgType.CERTIFIER && !hasPermission(ctx, PERMISSIONS.ORG_MANAGE_CERTIFIER)) {
      throw new Error("Nuk keni leje për të menaxhuar kompanitë OMI.");
    }
  }

  static async listLicensedCompanies(filters?: {
    type?: OrgType;
    status?: OrgStatus;
    municipalityId?: string;
    search?: string;
  }) {
    const where: Prisma.OrganizationWhereInput = {
      deletedAt: null,
      type: filters?.type ?? { in: [OrgType.INSTALLER, OrgType.CERTIFIER] },
    };

    if (filters?.status) where.status = filters.status;
    if (filters?.municipalityId) where.municipalityId = filters.municipalityId;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { nipt: { contains: filters.search, mode: "insensitive" } },
      ];
    }

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
    this.assertCanManageLicensedCompany(ctx, input.type);

    if (input.nipt) {
      const dup = await db.organization.findFirst({
        where: { nipt: input.nipt, deletedAt: null },
      });
      if (dup) throw new Error("Ky NIPT ekziston tashmë.");
    }

    return db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          type: input.type,
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

      return org;
    }).then(async (org) => {
      if (input.adminEmail && input.adminFirstName && input.adminLastName) {
        const { InvitationService } = await import("@/lib/services/invitation-service");
        const roleCode =
          input.type === OrgType.INSTALLER ? ROLE_CODES.INSTALLER : ROLE_CODES.CERTIFIER;

        await InvitationService.createInvitation({
          organizationId: org.id,
          email: input.adminEmail,
          firstName: input.adminFirstName,
          lastName: input.adminLastName,
          roleCode,
          invitedById: ctx.userId,
        });
      }

      return org;
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
    if (org.type !== OrgType.INSTALLER && org.type !== OrgType.CERTIFIER) {
      throw new Error("Vetëm kompanitë e instalimit dhe OMI mund të përditësohen nga Drejtoria.");
    }

    this.assertCanManageLicensedCompany(ctx, org.type);

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
    if (org.type !== OrgType.INSTALLER && org.type !== OrgType.CERTIFIER) {
      throw new Error("Vetëm kompanitë e instalimit dhe OMI mund të pezullohen.");
    }
    this.assertCanManageLicensedCompany(ctx, org.type);
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
    if (org.type !== OrgType.INSTALLER && org.type !== OrgType.CERTIFIER) {
      throw new Error("Vetëm kompanitë e instalimit dhe OMI mund të revokohen.");
    }
    this.assertCanManageLicensedCompany(ctx, org.type);
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
    if (org.type !== OrgType.INSTALLER && org.type !== OrgType.CERTIFIER) {
      throw new Error("Vetëm kompanitë e instalimit dhe OMI mund të riaktivizohen.");
    }
    this.assertCanManageLicensedCompany(ctx, org.type);

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
    if (org.type !== OrgType.INSTALLER && org.type !== OrgType.CERTIFIER) {
      throw new Error("Vetëm kompanitë e instalimit dhe OMI mund të refuzohen.");
    }
    this.assertCanManageLicensedCompany(ctx, org.type);

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
      legalForm?: string;
      address?: string;
      phone?: string;
      email?: string;
      municipalityId?: string;
      representativeName?: string;
      representativeNid?: string;
      representativePhone?: string;
      representativeEmail?: string;
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

    if (org.type === OrgType.OWNER && !data.municipalityId) {
      throw new Error("Bashkia është e detyrueshme për profilin e personit përgjegjës të ashensorit.");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id: ctx.activeOrgId },
        data: {
          name: data.name,
          nipt: data.nipt,
          legalForm: data.legalForm,
          address: data.address,
          phone: data.phone,
          email: data.email,
          municipalityId: data.municipalityId,
          representativeName: data.representativeName,
          representativeNid: data.representativeNid,
          representativePhone: data.representativePhone,
          representativeEmail: data.representativeEmail || null,
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

  static async listActiveSelectableCompanies(
    type: typeof OrgType.INSTALLER | typeof OrgType.CERTIFIER,
  ) {
    const now = new Date();

    return db.organization.findMany({
      where: {
        type,
        status: OrgStatus.ACTIVE,
        deletedAt: null,
        licenses: {
          some: {
            status: OrgStatus.ACTIVE,
            expiryDate: { gte: now },
          },
        },
      },
      select: { id: true, name: true, nipt: true },
      orderBy: { name: "asc" },
    });
  }
}
