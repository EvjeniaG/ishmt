import {
  ApplicationStatus,
  ApplicationType,
  ApplicationFieldReviewAssignmentStatus,
  FieldInspectorReportStatus,
  AuditAction,
  DelegationStatus,
  DelegationType,
  OrgStatus,
  OrgType,
  Prisma,
  ReturnTargetRole,
} from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import {
  canApproveApplications,
  canChiefHandleApplications,
  canDirectApplications,
  canReviewApplications,
  isFieldInspectorRole,
  isIshmtInternalRole,
} from "@/lib/permissions/ishmt-roles";
import {
  APPLICATION_STATUS_LABELS,
  assertTransition,
  resolveReturnStatus,
  REVIEW_LEVEL_BY_ACTION,
  type WorkflowAction,
} from "@/lib/workflows/application-workflow";
import {
  getReturnToRoles,
  isReturnedToRole,
  pickPrimaryReturnToRole,
  removeCompletedReturnRole,
  resolveStatusAfterReturnCorrection,
} from "@/lib/workflows/return-targets";
import { REGISTRATION_PHASE_ACTION_LABELS } from "@/lib/registration/action-labels";
import { resolveRegistrationPhase } from "@/lib/registration/phase-router";
import type { RoleCode } from "@/lib/constants/roles";
import { NotificationService } from "@/lib/services/notification-service";
import {
  ISHMT_NOTIFICATION_COPY,
  notifyChiefInspectors,
  notifyUser,
} from "@/lib/services/application-ishmt-notifications";
import {
  addParticipants,
  buildParticipationQueueWhere,
  fieldReviewProgress,
  hasIshmtApplicationParticipation,
  setActiveAssigneeParticipation,
  upsertParticipation,
  type ReviewQueueBucket,
} from "@/lib/services/application-participation";
import {
  applyFieldVerificationRequest,
  assertFieldVerificationCompleteForApproval,
  ensureApplicationFieldVerificationAssignments,
  notifyFieldVerificationAssignment,
} from "@/lib/services/application-field-verification";
import { ElevatorService } from "@/lib/services/elevator-service";
import { ElevatorLifecycleService } from "@/lib/services/elevator-lifecycle-service";
import { PostApprovalAssetService } from "@/lib/services/post-approval-asset-service";
import { getMissingRequiredApplicationDocuments, getMissingRequiredApplicationDocumentsForPhases, CERTIFIER_COMPLETION_DOC_PHASES } from "@/lib/documents/application-document-checklist";
import {
  annexBuildingTypeCode,
  annexUsagePurposeCode,
} from "@/lib/registration/anneks-codes";
import type { BuildingType, UsagePurpose } from "@prisma/client";

/**
 * Thrown when an application is missing or the caller is not allowed to see it.
 * Detail pages map this to a 404 (notFound) instead of crashing with a 500.
 */
export class ApplicationNotAccessibleError extends Error {
  constructor(
    message: string,
    public reason: "NOT_FOUND" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "ApplicationNotAccessibleError";
  }
}

const APPLICATION_TYPE_CODES: Record<ApplicationType, string> = {
  NEW_REGISTRATION: "REG",
  DEREGISTRATION: "DER",
  DATA_CORRECTION: "COR",
  DATA_UPDATE: "UPD",
  MODERNIZATION: "MOD",
};

const applicationInclude = {
  data: { include: { municipality: true, administrativeUnit: true } },
  ownerOrg: true,
  installerOrg: true,
  certifierOrg: true,
  assignedInspector: true,
  createdBy: true,
  returnedBy: true,
  delegations: { include: { organization: true } },
  workflowHistory: { orderBy: { createdAt: "desc" as const }, take: 20 },
  targetElevator: { include: { technicalData: true } },
} satisfies Prisma.ApplicationInclude;

export class ApplicationService {
  static canAccess(
    ctx: AuthContext,
    app: {
      ownerOrgId: string;
      installerOrgId: string | null;
      certifierOrgId: string | null;
      assignedInspectorId: string | null;
      delegations?: {
        organizationId: string;
        accessType: DelegationType;
        status: DelegationStatus;
      }[];
    },
  ) {
    if (hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL)) {
      if (
        isIshmtInternalRole(ctx.roleCode as RoleCode) &&
        ctx.roleCode !== ROLE_CODES.ADMIN
      ) {
        return false;
      }
      return true;
    }

    if (!hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_OWN)) {
      return false;
    }

    switch (ctx.roleCode) {
      case ROLE_CODES.OWNER:
        if (app.ownerOrgId === ctx.activeOrgId) return true;
        return (
          app.delegations?.some(
            (d) =>
              d.organizationId === ctx.activeOrgId &&
              d.accessType === DelegationType.OWNERSHIP_RECIPIENT &&
              d.status !== DelegationStatus.REVOKED,
          ) ?? false
        );
      case ROLE_CODES.INSTALLER:
        return app.installerOrgId === ctx.activeOrgId;
      case ROLE_CODES.CERTIFIER:
        return app.certifierOrgId === ctx.activeOrgId;
      default:
        return false;
    }
  }

  static async canViewApplication(
    ctx: AuthContext,
    app: {
      id: string;
      ownerOrgId: string;
      installerOrgId: string | null;
      certifierOrgId: string | null;
      assignedInspectorId: string | null;
      status: ApplicationStatus;
      currentAssigneeId: string | null;
      delegations?: {
        organizationId: string;
        accessType: DelegationType;
        status: DelegationStatus;
      }[];
    },
  ) {
    if (this.canAccess(ctx, app)) return true;
    if (!hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL)) return false;
    if (!isIshmtInternalRole(ctx.roleCode as RoleCode)) return true;
    return hasIshmtApplicationParticipation(ctx.userId, ctx.roleCode as RoleCode, app);
  }

  static async nextApplicationNumber(type: ApplicationType, tx?: Prisma.TransactionClient) {
    const client = tx ?? db;
    const year = new Date().getFullYear();
    const typeCode = APPLICATION_TYPE_CODES[type];

    const seq = await client.applicationSequence.upsert({
      where: { year_typeCode: { year, typeCode } },
      update: { lastSequence: { increment: 1 } },
      create: { year, typeCode, lastSequence: 1 },
    });

    const sequence = String(seq.lastSequence).padStart(6, "0");
    return `APP-${year}-${typeCode}-${sequence}`;
  }

  static getNextRequiredAction(
    app: {
      id?: string;
      type: ApplicationType;
      status: ApplicationStatus;
      returnToRole?: ReturnTargetRole | null;
      returnToRoles?: unknown;
      installerOrgId?: string | null;
      certifierOrgId?: string | null;
      delegations?: {
        accessType: DelegationType;
        organizationId: string;
        status: DelegationStatus;
        expiresAt?: Date | null;
      }[];
    },
    roleCode?: RoleCode,
    activeOrgId?: string,
  ) {
    if (app.type === ApplicationType.NEW_REGISTRATION && roleCode && app.id) {
      const phase = resolveRegistrationPhase(
        {
          id: app.id,
          type: app.type,
          status: app.status,
          returnToRole: app.returnToRole,
          returnToRoles: app.returnToRoles,
          installerOrgId: app.installerOrgId,
          certifierOrgId: app.certifierOrgId,
          delegations: app.delegations,
        },
        roleCode,
      );
      return REGISTRATION_PHASE_ACTION_LABELS[phase];
    }

    if (app.type === ApplicationType.MODERNIZATION) {
      if (app.status === ApplicationStatus.DRAFT) {
        return app.installerOrgId ? "Në pritje të instaluesit" : "Caktoni kompaninë instaluese";
      }
    }

    const ownershipDelegation = app.delegations?.find(
      (d) => d.accessType === DelegationType.OWNERSHIP_RECIPIENT,
    );
    if (ownershipDelegation) {
      const isRecipient =
        Boolean(activeOrgId) && ownershipDelegation.organizationId === activeOrgId;
      if (isRecipient && ownershipDelegation.status === DelegationStatus.INVITED) {
        return "Pranoni ose refuzoni transferimin";
      }
      if (ownershipDelegation.status === DelegationStatus.INVITED) {
        return "Në pritje të pranimit nga marrësi";
      }
      if (ownershipDelegation.status === DelegationStatus.ACCEPTED) {
        return "Parashtroni te ISHMT";
      }
      if (ownershipDelegation.status === DelegationStatus.REJECTED) {
        return "Marrësi refuzoi - zgjidhni marrës tjetër";
      }
      return "Dërgoni ftesën te marrësi";
    }

    if (
      app.type === ApplicationType.DATA_CORRECTION &&
      (app.status === ApplicationStatus.DRAFT || app.status === ApplicationStatus.RETURNED)
    ) {
      return "Specifikoni fushat për korrigjim";
    }

    if (
      app.type === ApplicationType.DATA_UPDATE &&
      (app.status === ApplicationStatus.DRAFT || app.status === ApplicationStatus.RETURNED)
    ) {
      return "Zgjidhni llojin dhe plotësoni ndryshimet";
    }

    if (
      app.type === ApplicationType.DEREGISTRATION &&
      (app.status === ApplicationStatus.DRAFT || app.status === ApplicationStatus.RETURNED)
    ) {
      return "Parashtroni te ISHMT";
    }

    if (app.status === ApplicationStatus.DRAFT) return "Plotësoni të dhënat bazë";
    if (app.status === ApplicationStatus.BASIC_DATA_COMPLETED) return "Caktoni kompaninë instaluese";
    if (app.status === ApplicationStatus.INSTALLER_INVITED) return "Në pritje të pranimit nga instaluesi";
    if (app.status === ApplicationStatus.PENDING_INSTALLER) return "Në pritje të instaluesit";
    if (app.status === ApplicationStatus.INSTALLER_ACCEPTED) return "Instaluesi plotëson të dhënat teknike";
    if (app.status === ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS) return "Të dhënat teknike në përpunim";
    if (app.status === ApplicationStatus.TECHNICAL_DATA_COMPLETED || app.status === ApplicationStatus.INSTALLER_COMPLETED) return "Caktoni kompaninë certifikuese";
    if (app.status === ApplicationStatus.CERTIFIER_INVITED) return "Në pritje të pranimit nga certifikuesi";
    if (app.status === ApplicationStatus.PENDING_CERTIFIER) return "Në pritje të certifikuesit";
    if (app.status === ApplicationStatus.CERTIFIER_ACCEPTED) return "Certifikuesi plotëson dokumentacionin";
    if (app.status === ApplicationStatus.CERTIFICATION_COMPLETED) return "Rishikoni dhe parashtroni te ISHMT";
    if (app.status === ApplicationStatus.PENDING_OWNER_SUBMISSION) return "Dërgo Aplikimin për Registrim";
    if (app.returnToRole === ReturnTargetRole.OWNER) return "Korrigjoni dhe riparashtroni";
    if (app.status === ApplicationStatus.SUBMITTED) return "Në pritje të shqyrtimit nga inspektori";
    if (app.status === ApplicationStatus.UNDER_REVIEW) return "Në shqyrtim nga inspektori ISHMT";
    if (app.status === ApplicationStatus.PENDING_CHIEF_INSPECTOR) return "Në pritje të miratimit nga kryeinspektori ISHMT";
    if (app.status === ApplicationStatus.APPROVED) return "E miratuar";
    if (app.status === ApplicationStatus.REJECTED) return "E refuzuar";
    return APPLICATION_STATUS_LABELS[app.status] ?? app.status;
  }

  static async createDraft(ctx: AuthContext, type: ApplicationType = ApplicationType.NEW_REGISTRATION) {
    return this.createDraftByType(ctx, type);
  }

  static async createDraftByType(
    ctx: AuthContext,
    type: ApplicationType,
    options?: { elevatorId?: string },
  ) {
    if (ctx.roleCode !== ROLE_CODES.OWNER) {
      throw new Error("Vetëm personat përgjegjës të ashensorit mund të krijojnë aplikime.");
    }

    if (type !== ApplicationType.NEW_REGISTRATION && !options?.elevatorId) {
      throw new Error("Duhet të zgjidhni ashensorin për këtë lloj aplikimi.");
    }

    if (options?.elevatorId) {
      const elevator = await db.elevator.findFirst({
        where: { id: options.elevatorId, ownerOrgId: ctx.activeOrgId, deletedAt: null },
      });
      if (!elevator) throw new Error("Ashensori nuk u gjet.");
    }

    return db.$transaction(async (tx) => {
      const applicationNumber = await this.nextApplicationNumber(type, tx);

      const application = await tx.application.create({
        data: {
          applicationNumber,
          type,
          status: ApplicationStatus.DRAFT,
          ownerOrgId: ctx.activeOrgId,
          createdById: ctx.userId,
          elevatorId: options?.elevatorId,
        },
      });

      await tx.applicationData.create({
        data: { applicationId: application.id },
      });

      await this.recordTransition(tx, {
        applicationId: application.id,
        fromStatus: null,
        toStatus: ApplicationStatus.DRAFT,
        action: "CREATE",
        actorId: ctx.userId,
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.CREATE,
          entityType: "application",
          entityId: application.id,
          afterState: { applicationNumber, status: ApplicationStatus.DRAFT },
        },
        tx,
      );

      return application;
    });
  }

  static async getById(ctx: AuthContext, id: string) {
    const application = await db.application.findFirst({
      where: { id, deletedAt: null },
      include: applicationInclude,
    });

    if (!application) {
      throw new ApplicationNotAccessibleError("Aplikimi nuk u gjet.", "NOT_FOUND");
    }

    if (!(await this.canViewApplication(ctx, application))) {
      throw new ApplicationNotAccessibleError(
        "Nuk keni leje për të parë këtë aplikim.",
        "FORBIDDEN",
      );
    }

    await AuditService.logSensitiveView(ctx.userId, "application", id, {
      applicationNumber: application.applicationNumber,
      status: application.status,
    });

    return application;
  }

  static async listForContext(
    ctx: AuthContext,
    filters?: {
      status?: ApplicationStatus;
      type?: ApplicationType;
      municipalityId?: string;
      returnedOnly?: boolean;
      rejectedOnly?: boolean;
      approvedOnly?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
      queueBucket?: ReviewQueueBucket;
    },
  ) {
    const where: Prisma.ApplicationWhereInput = {
      deletedAt: null,
    };

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.rejectedOnly) where.status = ApplicationStatus.REJECTED;
    if (filters?.approvedOnly) where.status = ApplicationStatus.APPROVED;
    if (filters?.returnedOnly) {
      where.OR = [
        { status: ApplicationStatus.RETURNED },
        { returnToRole: ReturnTargetRole.OWNER },
      ];
    }
    if (filters?.municipalityId) {
      where.data = { municipalityId: filters.municipalityId };
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
        ...(filters.dateTo ? { lte: filters.dateTo } : {}),
      };
    }

    const ishmtStaff =
      hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL) &&
      isIshmtInternalRole(ctx.roleCode as RoleCode);

    if (ishmtStaff) {
      if (ctx.roleCode === ROLE_CODES.ADMIN) {
        // Administratori sheh të gjitha aplikimet.
      } else if (filters?.queueBucket) {
        Object.assign(where, buildParticipationQueueWhere(ctx.userId, filters.queueBucket));

        if (isFieldInspectorRole(ctx.roleCode) && filters.queueBucket === "needs_action") {
          where.participations = {
            some: { userId: ctx.userId },
          };
          where.status = ApplicationStatus.PENDING_FIELD_REVIEW;
          where.fieldReviewAssignments = {
            some: {
              inspectorId: ctx.userId,
              status: ApplicationFieldReviewAssignmentStatus.PENDING,
            },
          };
        }
      } else {
        where.participations = { some: { userId: ctx.userId } };
      }
    } else if (hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL)) {
      // Staf me view_all jashtë ISHMT (nëse ekziston).
    } else if (ctx.roleCode === ROLE_CODES.OWNER) {
      where.OR = [
        { ownerOrgId: ctx.activeOrgId },
        {
          delegations: {
            some: {
              organizationId: ctx.activeOrgId,
              accessType: DelegationType.OWNERSHIP_RECIPIENT,
            },
          },
        },
      ];
      // Cancelled applications are hidden from "Aplikimet e mia" unless explicitly filtered.
      if (where.status === undefined && filters?.status !== ApplicationStatus.CANCELLED) {
        where.status = { not: ApplicationStatus.CANCELLED };
      }
    } else if (ctx.roleCode === ROLE_CODES.INSTALLER) {
      where.installerOrgId = ctx.activeOrgId;
      where.status = { notIn: [ApplicationStatus.DRAFT, ApplicationStatus.CANCELLED] };
    } else if (ctx.roleCode === ROLE_CODES.CERTIFIER) {
      where.certifierOrgId = ctx.activeOrgId;
      where.status = { notIn: [ApplicationStatus.DRAFT, ApplicationStatus.PENDING_INSTALLER, ApplicationStatus.CANCELLED] };
    } else {
      return [];
    }

    return db.application.findMany({
      where,
      include: {
        data: { include: { municipality: true } },
        ownerOrg: true,
        installerOrg: true,
        certifierOrg: true,
        delegations: true,
        targetElevator: true,
        currentAssignee: { select: { id: true, firstName: true, lastName: true } },
        fieldReviewAssignments: {
          where: { status: { not: ApplicationFieldReviewAssignmentStatus.REPLACED } },
          select: { id: true, status: true, inspectorId: true },
        },
        participations: {
          where: { userId: ctx.userId },
          select: { canAct: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  static getFieldReviewProgressSummary(
    assignments: { status: ApplicationFieldReviewAssignmentStatus }[],
  ) {
    return fieldReviewProgress(assignments);
  }

  static async updateLocationData(
    ctx: AuthContext,
    applicationId: string,
    data: {
      buildingAddress: string;
      municipalityId: string;
      administrativeUnitId?: string;
      buildingName?: string;
      gpsLatitude?: number;
      gpsLongitude?: number;
    },
  ) {
    await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.DRAFT,
      ApplicationStatus.PENDING_OWNER_SUBMISSION,
      ApplicationStatus.RETURNED,
    ]);

    if (ctx.roleCode !== ROLE_CODES.OWNER) {
      throw new Error("Vetëm personi përgjegjës i ashensorit mund të përditësojë vendndodhjen.");
    }

    await db.applicationData.update({
      where: { applicationId },
      data: {
        buildingAddress: data.buildingAddress,
        municipalityId: data.municipalityId,
        administrativeUnitId: data.administrativeUnitId,
        buildingName: data.buildingName,
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
      },
    });

    return this.getById(ctx, applicationId);
  }

  static async updateBasicData(
    ctx: AuthContext,
    applicationId: string,
    data: {
      buildingAddress: string;
      municipalityId: string;
      administrativeUnitId?: string;
      buildingName?: string;
      entrance?: string;
      floorLocation?: string;
      buildingType: string;
      usagePurpose: string;
      responsibleEntityName: string;
      responsibleEntityIdentifier: string;
      responsibleEntityEmail: string;
      responsibleEntityPhone: string;
      notes?: string;
      gpsLatitude?: number;
      gpsLongitude?: number;
    },
  ) {
    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.DRAFT,
      ApplicationStatus.PENDING_OWNER_SUBMISSION,
      ApplicationStatus.RETURNED,
    ]);

    if (ctx.roleCode !== ROLE_CODES.OWNER) {
      throw new Error("Vetëm personi përgjegjës i ashensorit mund të përditësojë të dhënat bazë.");
    }

    if (application.status === ApplicationStatus.RETURNED && !isReturnedToRole(application, ReturnTargetRole.OWNER)) {
      throw new Error("Korrigjimi duhet të bëhet nga roli i caktuar nga ISHMT.");
    }

    await db.applicationData.update({
      where: { applicationId },
      data: {
        buildingAddress: data.buildingAddress,
        municipalityId: data.municipalityId,
        administrativeUnitId: data.administrativeUnitId || null,
        buildingName: data.buildingName,
        entrance: data.entrance,
        floorLocation: data.floorLocation,
        buildingType: data.buildingType as Prisma.ApplicationDataUpdateInput["buildingType"],
        usagePurpose: data.usagePurpose as Prisma.ApplicationDataUpdateInput["usagePurpose"],
        responsibleEntityName: data.responsibleEntityName,
        responsibleEntityIdentifier: data.responsibleEntityIdentifier,
        responsibleEntityEmail: data.responsibleEntityEmail,
        responsibleEntityPhone: data.responsibleEntityPhone,
        notes: data.notes,
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
      },
    });

    if (application.status === ApplicationStatus.DRAFT && application.type === ApplicationType.NEW_REGISTRATION) {
      const toStatus = assertTransition(
        application.type,
        application.status,
        "SAVE_BASIC_DATA",
        ctx.roleCode,
      );
      await this.transition(ctx, application, "SAVE_BASIC_DATA", toStatus);
    }

    return this.getById(ctx, applicationId);
  }

  static async assignInstaller(ctx: AuthContext, applicationId: string, installerOrgId: string) {
    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.DRAFT,
      ApplicationStatus.BASIC_DATA_COMPLETED,
    ]);

    await this.assertActiveLicensedCompany(installerOrgId, OrgType.INSTALLER);

    const toStatus = assertTransition(
      application.type,
      application.status,
      "ASSIGN_INSTALLER",
      ctx.roleCode,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: toStatus,
          installerOrg: { connect: { id: installerOrgId } },
        },
      });

      await tx.applicationDelegation.upsert({
        where: {
          applicationId_organizationId_accessType: {
            applicationId,
            organizationId: installerOrgId,
            accessType: DelegationType.INSTALLER,
          },
        },
        update: { status: DelegationStatus.PENDING, invitedAt: new Date(), expiresAt },
        create: {
          applicationId,
          organizationId: installerOrgId,
          accessType: DelegationType.INSTALLER,
          status: DelegationStatus.PENDING,
          invitedById: ctx.userId,
          expiresAt,
        },
      });

      await this.recordTransition(tx, {
        applicationId,
        fromStatus: application.status,
        toStatus,
        action: "ASSIGN_INSTALLER",
        actorId: ctx.userId,
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.WORKFLOW_TRANSITION,
          entityType: "application",
          entityId: applicationId,
          afterState: { status: toStatus, installerOrgId },
        },
        tx,
      );

      return updated;
    });

    await NotificationService.notifyOrgMembers(installerOrgId, {
      title: "Ftesë për instalim",
      body: `Jeni ftuar për aplikimin ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return result;
  }

  static async assignCertifier(ctx: AuthContext, applicationId: string, certifierOrgId: string) {
    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.TECHNICAL_DATA_COMPLETED,
      ApplicationStatus.INSTALLER_COMPLETED,
    ]);

    await this.assertActiveLicensedCompany(certifierOrgId, OrgType.CERTIFIER);

    const toStatus = assertTransition(
      application.type,
      application.status,
      "ASSIGN_CERTIFIER",
      ctx.roleCode,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: toStatus,
          certifierOrg: { connect: { id: certifierOrgId } },
        },
      });

      await tx.applicationDelegation.upsert({
        where: {
          applicationId_organizationId_accessType: {
            applicationId,
            organizationId: certifierOrgId,
            accessType: DelegationType.CERTIFIER,
          },
        },
        update: { status: DelegationStatus.PENDING, invitedAt: new Date(), expiresAt },
        create: {
          applicationId,
          organizationId: certifierOrgId,
          accessType: DelegationType.CERTIFIER,
          status: DelegationStatus.PENDING,
          invitedById: ctx.userId,
          expiresAt,
        },
      });

      await this.recordTransition(tx, {
        applicationId,
        fromStatus: application.status,
        toStatus,
        action: "ASSIGN_CERTIFIER",
        actorId: ctx.userId,
      });

      return updated;
    });

    await NotificationService.notifyOrgMembers(certifierOrgId, {
      title: "Ftesë për certifikim",
      body: `Jeni ftuar për certifikimin e aplikimit ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return result;
  }

  static async acceptDelegation(ctx: AuthContext, applicationId: string) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { delegations: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    const delegationType =
      ctx.roleCode === ROLE_CODES.INSTALLER
        ? DelegationType.INSTALLER
        : ctx.roleCode === ROLE_CODES.CERTIFIER
          ? DelegationType.CERTIFIER
          : null;

    if (!delegationType) throw new Error("Roli juaj nuk mund të pranojë delegimin.");

    const delegation = application.delegations.find(
      (d) => d.organizationId === ctx.activeOrgId && d.accessType === delegationType,
    );
    if (!delegation) throw new Error("Delegimi nuk u gjet.");

    return db.applicationDelegation.update({
      where: { id: delegation.id },
      data: { status: DelegationStatus.ACCEPTED, acceptedAt: new Date() },
    });
  }

  static async updateTechnicalData(
    ctx: AuthContext,
    applicationId: string,
    data: {
      elevatorType: string;
      manufacturer: string;
      model?: string;
      serialNumber: string;
      manufacturingYear?: number;
      capacityKg?: number;
      capacityPersons?: number;
      speedMs?: number;
      floorsServed: number;
      stops?: number;
      driveType?: string;
    },
  ) {
    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.PENDING_INSTALLER,
      ApplicationStatus.INSTALLER_INVITED,
      ApplicationStatus.INSTALLER_ACCEPTED,
      ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
      ApplicationStatus.RETURNED,
    ]);

    if (application.installerOrgId !== ctx.activeOrgId) {
      throw new Error("Ky aplikim nuk është caktuar për organizatën tuaj.");
    }

    await db.applicationData.update({
      where: { applicationId },
      data: {
        elevatorType: data.elevatorType as Prisma.ApplicationDataUpdateInput["elevatorType"],
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        manufacturingYear: data.manufacturingYear,
        capacityKg: data.capacityKg,
        capacityPersons: data.capacityPersons,
        speedMs: data.speedMs,
        floorsServed: data.floorsServed,
        stops: data.stops,
        driveType: data.driveType,
      },
    });

    return this.getById(ctx, applicationId);
  }

  static async completeInstallerStep(
    ctx: AuthContext,
    applicationId: string,
    technicalData: Parameters<typeof ApplicationService.updateTechnicalData>[2],
    certifierOrgId?: string,
  ) {
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { delegations: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    const installerDelegation = application.delegations.find(
      (d) => d.accessType === DelegationType.INSTALLER && d.organizationId === ctx.activeOrgId,
    );
    if (installerDelegation && installerDelegation.status !== DelegationStatus.ACCEPTED) {
      await this.acceptDelegation(ctx, applicationId);
    }

    await this.updateTechnicalData(ctx, applicationId, technicalData);

    const refreshed = await db.application.findUnique({ where: { id: applicationId } });
    if (!refreshed) throw new Error("Aplikimi nuk u gjet.");

    if (
      refreshed.status === ApplicationStatus.RETURNED &&
      isReturnedToRole(refreshed, ReturnTargetRole.INSTALLER)
    ) {
      return this.applyReturnCorrection(
        ctx,
        refreshed,
        ReturnTargetRole.INSTALLER,
        "INSTALLER_CORRECTION_COMPLETED",
      );
    }

    const toStatus = assertTransition(
      refreshed.type,
      refreshed.status,
      "COMPLETE_INSTALLER",
      ctx.roleCode,
    );

    const result = await this.transition(ctx, refreshed, "COMPLETE_INSTALLER", toStatus);

    if (certifierOrgId && refreshed.type !== ApplicationType.NEW_REGISTRATION) {
      await this.assignCertifier(ctx, applicationId, certifierOrgId);
    }

    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title: "Të dhënat teknike u plotësuan",
      body: `Instaluesi përfundoi të dhënat teknike për ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return result;
  }

  static async updateCertificationData(
    ctx: AuthContext,
    applicationId: string,
    data: {
      installationCertificateNumber: string;
      installationCertificateDate: Date;
      certifierNotes?: string;
      omiNumber?: string;
      examinationType?: string;
      examinationDate?: Date;
      conformityResult?: "CONFORM" | "NON_CONFORM" | "CONDITIONAL";
      certificateReference?: string;
      certifierTechnicalNotes?: string;
    },
  ) {
    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.PENDING_CERTIFIER,
      ApplicationStatus.CERTIFIER_INVITED,
      ApplicationStatus.CERTIFIER_ACCEPTED,
      ApplicationStatus.CERTIFICATION_IN_PROGRESS,
      ApplicationStatus.RETURNED,
    ]);

    if (application.certifierOrgId !== ctx.activeOrgId) {
      throw new Error("Ky aplikim nuk është caktuar për organizatën tuaj.");
    }

    await db.applicationData.update({
      where: { applicationId },
      data: {
        installationCertificateNumber: data.installationCertificateNumber,
        installationCertificateDate: data.installationCertificateDate,
        certifierNotes: data.certifierNotes,
        omiNumber: data.omiNumber,
        examinationType: data.examinationType,
        examinationDate: data.examinationDate,
        conformityResult: data.conformityResult,
        certificateReference: data.certificateReference,
        certifierTechnicalNotes: data.certifierTechnicalNotes,
      },
    });

    return this.getById(ctx, applicationId);
  }

  static async completeCertifierStep(
    ctx: AuthContext,
    applicationId: string,
    certificationData: Parameters<typeof ApplicationService.updateCertificationData>[2],
  ) {
    await this.updateCertificationData(ctx, applicationId, certificationData);

    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: { data: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    if (application.type === ApplicationType.NEW_REGISTRATION || application.type === ApplicationType.MODERNIZATION) {
      const links = await db.documentLink.findMany({
        where: { entityType: "application", entityId: application.id },
        select: { purpose: true },
      });
      const uploadedPurposes = links.map((link) => link.purpose ?? "").filter(Boolean);
      const missing = getMissingRequiredApplicationDocumentsForPhases({
        type: application.type,
        data: application.data,
        uploadedPurposes,
        phases: CERTIFIER_COMPLETION_DOC_PHASES,
      });
      if (missing.length > 0) {
        throw new Error(`Dokumentacioni i paplotë: ${missing.map((doc) => `Mungon ${doc.label}`).join("; ")}`);
      }
    }

    if (
      application.status === ApplicationStatus.RETURNED &&
      isReturnedToRole(application, ReturnTargetRole.CERTIFIER)
    ) {
      return this.applyReturnCorrection(
        ctx,
        application,
        ReturnTargetRole.CERTIFIER,
        "CERTIFIER_CORRECTION_COMPLETED",
      );
    }

    const toStatus = assertTransition(
      application.type,
      application.status,
      "COMPLETE_CERTIFIER",
      ctx.roleCode,
    );

    return this.transition(ctx, application, "COMPLETE_CERTIFIER", toStatus);
  }

  private static async assertRequiredDocumentsUploaded(application: {
    id: string;
    type: ApplicationType;
    data: Prisma.ApplicationDataGetPayload<Record<string, never>> | null;
  }) {
    const links = await db.documentLink.findMany({
      where: { entityType: "application", entityId: application.id },
      select: { purpose: true },
    });
    const uploadedPurposes = links.map((link) => link.purpose ?? "").filter(Boolean);
    const missing = getMissingRequiredApplicationDocuments({
      type: application.type,
      data: application.data,
      uploadedPurposes,
    });
    if (missing.length > 0) {
      throw new Error(`Dokumentacioni i paplotë: ${missing.map((doc) => `Mungon ${doc.label}`).join("; ")}`);
    }
  }

  static async submitToIshmt(ctx: AuthContext, applicationId: string) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { data: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    if (application.type === ApplicationType.NEW_REGISTRATION) {
      return this.submitRegistrationToIshmt(ctx, applicationId);
    }

    if (application.type === ApplicationType.MODERNIZATION) {
      return this.submitModernizationToIshmt(ctx, applicationId);
    }

    return this.submitLifecycleToIshmt(ctx, application);
  }

  /** Modernizim: pas instaluesit + certifikuesit → ISHMT */
  static async submitModernizationToIshmt(ctx: AuthContext, applicationId: string) {
    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.PENDING_OWNER_SUBMISSION,
      ApplicationStatus.RETURNED,
    ]);

    const data = await db.applicationData.findUnique({ where: { applicationId } });
    await ElevatorLifecycleService.validateBeforeSubmit({
      id: application.id,
      type: application.type,
      elevatorId: application.elevatorId,
      data,
      installerOrgId: application.installerOrgId,
      certifierOrgId: application.certifierOrgId,
    });

    await this.assertRequiredDocumentsUploaded({
      id: application.id,
      type: application.type,
      data,
    });

    const toStatus = assertTransition(application.type, application.status, "SUBMIT", ctx.roleCode);

    const result = await this.transition(ctx, application, "SUBMIT", toStatus, {
      submittedAt: new Date(),
      returnReason: null,
      returnToRole: null,
      returnToRoles: Prisma.JsonNull,
      requiredCorrection: null,
    });

    const ishmtOrg = await db.organization.findFirst({ where: { type: OrgType.ISHMT, deletedAt: null } });
    if (ishmtOrg) {
      await NotificationService.notifyIshmtOperationsStaff(ishmtOrg.id, {
        title: "Aplikim modernizimi",
        body: `${application.applicationNumber} u parashtrua për shqyrtim.`,
        entityType: "application",
        entityId: applicationId,
      });
    }

    return result;
  }

  static async submitRegistrationToIshmt(ctx: AuthContext, applicationId: string) {
    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.PENDING_OWNER_SUBMISSION,
      ApplicationStatus.CERTIFICATION_COMPLETED,
    ]);

    const data = await db.applicationData.findUnique({ where: { applicationId } });
    const missing = this.validateSubmissionReadiness(application, data);
    if (missing.length > 0) {
      throw new Error(`Aplikimi nuk është i plotë: ${missing.join("; ")}`);
    }

    await this.assertRequiredDocumentsUploaded({
      id: application.id,
      type: application.type,
      data,
    });

    if (data?.serialNumber) {
      const duplicate = await db.elevator.findFirst({
        where: {
          deletedAt: null,
          status: { not: "DEREGISTERED" },
          technicalData: { serialNumber: data.serialNumber },
        },
      });
      if (duplicate) {
        throw new Error("Numri serial ekziston tashmë në regjistër aktiv.");
      }
    }

    const toStatus = assertTransition(application.type, application.status, "SUBMIT", ctx.roleCode);

    const result = await this.transition(ctx, application, "SUBMIT", toStatus, {
      submittedAt: new Date(),
      returnReason: null,
      returnToRole: null,
      returnToRoles: Prisma.JsonNull,
      requiredCorrection: null,
    });

    const chiefMembership = await db.orgMembership.findFirst({
      where: {
        organization: { type: OrgType.ISHMT, deletedAt: null },
        deactivatedAt: null,
        role: { code: ROLE_CODES.CHIEF_INSPECTOR },
      },
      select: { userId: true, organizationId: true },
      orderBy: { joinedAt: "asc" },
    });

    if (chiefMembership) {
      await db.application.update({
        where: { id: applicationId },
        data: { currentAssigneeId: chiefMembership.userId },
      });

      const allChiefs = await db.orgMembership.findMany({
        where: {
          organizationId: chiefMembership.organizationId,
          deactivatedAt: null,
          role: { code: ROLE_CODES.CHIEF_INSPECTOR },
        },
        select: { userId: true },
      });

      await db.$transaction(async (tx) => {
        for (const chief of allChiefs) {
          await upsertParticipation(tx, {
            applicationId,
            userId: chief.userId,
            roleCode: ROLE_CODES.CHIEF_INSPECTOR,
            canAct: chief.userId === chiefMembership.userId,
          });
        }
      });
    }

    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title: "Aplikimi u dërgua për Registrim",
      body: `Aplikimi ${application.applicationNumber} u dërgua te ISHMT.`,
      entityType: "application",
      entityId: applicationId,
    });

    await notifyChiefInspectors({
      title: ISHMT_NOTIFICATION_COPY.submittedToChief.title,
      body: ISHMT_NOTIFICATION_COPY.submittedToChief.body(application.applicationNumber),
      entityType: "application",
      entityId: applicationId,
    });

    return result;
  }

  /** Aplikim për rregjistrim lifecycle: çregjistrim, korrigjim, përditësim (DRAFT → SUBMITTED) */
  static async submitLifecycleToIshmt(
    ctx: AuthContext,
    application: Prisma.ApplicationGetPayload<{ include: { data: true } }>,
  ) {
    if (ctx.roleCode !== ROLE_CODES.OWNER) {
      throw new Error("Vetëm personi përgjegjës i ashensorit mund të dërgojë këtë aplikim për rregjistrim.");
    }
    if (application.status !== ApplicationStatus.DRAFT && application.status !== ApplicationStatus.RETURNED) {
      throw new Error(`Aplikimi për rregjistrim nuk lejohet në statusin '${application.status}'.`);
    }
    if (!application.elevatorId) {
      throw new Error("Duhet të zgjidhni ashensorin.");
    }

    const data = application.data;
    await ElevatorLifecycleService.validateBeforeSubmit({
      id: application.id,
      type: application.type,
      elevatorId: application.elevatorId,
      data,
    });

    await this.assertRequiredDocumentsUploaded(application);

    const { OwnershipTransferService } = await import("@/lib/services/ownership-transfer-service");
    await OwnershipTransferService.assertReadyForIshmt(application.id);

    const toStatus = assertTransition(application.type, application.status, "SUBMIT", ctx.roleCode);

    const result = await this.transition(ctx, application, "SUBMIT", toStatus, {
      submittedAt: new Date(),
      returnReason: null,
      returnToRole: null,
      returnToRoles: Prisma.JsonNull,
      requiredCorrection: null,
    });

    const ishmtOrg = await db.organization.findFirst({ where: { type: OrgType.ISHMT, deletedAt: null } });
    if (ishmtOrg) {
      await NotificationService.notifyIshmtOperationsStaff(ishmtOrg.id, {
        title: `Aplikim i ri: ${application.type}`,
        body: `${application.applicationNumber} u parashtrua për shqyrtim.`,
        entityType: "application",
        entityId: application.id,
      });
    }

    return result;
  }

  static validateSubmissionReadiness(
    application: { installerOrgId: string | null; certifierOrgId: string | null; type: ApplicationType },
    data: {
      buildingAddress?: string | null;
      municipalityId?: string | null;
      buildingType?: string | null;
      usagePurpose?: string | null;
      responsibleEntityName?: string | null;
      serialNumber?: string | null;
      manufacturer?: string | null;
      floorsServed?: number | null;
      installationCertificateNumber?: string | null;
      installationCertificateDate?: Date | null;
      omiNumber?: string | null;
      examinationDate?: Date | null;
      applicationDate?: Date | null;
      legacyDistrictCode?: string | null;
      registrationExtendedData?: unknown;
    } | null,
  ) {
    const missing: string[] = [];
    if (!data?.buildingAddress) missing.push("adresa");
    if (!data?.municipalityId) missing.push("bashkia");
    if (!data?.buildingType) missing.push("tipi i godinës");
    if (!data?.usagePurpose) missing.push("qëllimi i përdorimit");
    if (!data?.responsibleEntityName) missing.push("personi përgjegjës");
    if (!application.installerOrgId) missing.push("instaluesi");
    if (!data?.serialNumber) missing.push("numri serial");
    if (!data?.manufacturer) missing.push("prodhuesi");
    if (!data?.floorsServed) missing.push("katet");
    if (!application.certifierOrgId) missing.push("certifikuesi");
    if (!data?.omiNumber) missing.push("numri OMI");
    if (!data?.examinationDate) missing.push("data e ekzaminimit");
    if (!data?.installationCertificateNumber) missing.push("referenca e certifikatës");
    if (!data?.installationCertificateDate) missing.push("data e certifikatës");

    const ext = (data?.registrationExtendedData as Record<string, unknown> | null) ?? {};
    if (!data?.applicationDate) missing.push("data e aplikimit (Aneksi 1)");
    if (!ext.elevatorConditionType) missing.push("lloji i ashensorit (i ri/ekzistues)");
    if (!ext.applicationSubtype) missing.push("nënlloji i aplikimit");
    if (!ext.responsibleEntityType) missing.push("lloji i personit përgjegjës");
    if (
      !annexBuildingTypeCode(ext.registrationBuildingType, data?.buildingType as BuildingType | null | undefined)
    ) {
      missing.push("tipi i ndërtesës (Aneksi 1)");
    }
    if (
      !annexUsagePurposeCode(ext.usagePurposeCode, data?.usagePurpose as UsagePurpose | null | undefined)
    ) {
      missing.push("qëllimi i përdorimit (Aneksi 1)");
    }

    return missing;
  }

  static async listFieldInspectors(orgId: string) {
    const memberships = await db.orgMembership.findMany({
      where: {
        organizationId: orgId,
        deactivatedAt: null,
        role: { code: ROLE_CODES.FIELD_INSPECTOR },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { user: { lastName: "asc" } },
    });
    return memberships.map((m) => ({
      id: m.user.id,
      label: `${m.user.firstName} ${m.user.lastName}`.trim(),
    }));
  }

  static async getFieldReviewAssignments(applicationId: string) {
    return db.applicationFieldReviewAssignment.findMany({
      where: {
        applicationId,
        status: { not: ApplicationFieldReviewAssignmentStatus.REPLACED },
      },
      include: {
        inspector: { select: { id: true, firstName: true, lastName: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  static readonly ISHMT_TRAIL_ACTIONS = [
    "DELEGATE_TO_DIRECTOR",
    "DELEGATE_TO_SECTOR_HEAD",
    "ASSIGN_FIELD_INSPECTORS",
    "SUBMIT_FIELD_REPORT",
    "ALL_FIELD_REPORTS_COMPLETE",
    "FORWARD_TO_DIRECTOR",
    "FORWARD_TO_CHIEF",
    "APPROVE",
    "REJECT",
    "RETURN",
  ] as const;

  static async getIshmtWorkflowTrail(applicationId: string) {
    const [history, fieldAssignments, application] = await Promise.all([
      db.applicationWorkflowHistory.findMany({
        where: {
          applicationId,
          action: { in: [...ApplicationService.ISHMT_TRAIL_ACTIONS] },
        },
        include: {
          actor: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.getFieldReviewAssignments(applicationId),
      db.application.findFirst({
        where: { id: applicationId },
        select: { plannedInspectorIds: true, inspectorAssignmentLockedBy: true },
      }),
    ]);

    const inspectorIds = new Set<string>();
    for (const entry of history) {
      const meta = entry.metadata as { inspectorIds?: string[] } | null;
      meta?.inspectorIds?.forEach((id) => inspectorIds.add(id));
    }
    if (Array.isArray(application?.plannedInspectorIds)) {
      (application.plannedInspectorIds as string[]).forEach((id) => inspectorIds.add(id));
    }
    for (const row of fieldAssignments) {
      inspectorIds.add(row.inspectorId);
    }

    const inspectorUsers =
      inspectorIds.size > 0
        ? await db.authUser.findMany({
            where: { id: { in: [...inspectorIds] } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];

    const inspectorNames = Object.fromEntries(
      inspectorUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]),
    );

    return {
      history,
      fieldAssignments,
      inspectorNames,
      lockedBy: application?.inspectorAssignmentLockedBy ?? null,
      plannedInspectorIds: Array.isArray(application?.plannedInspectorIds)
        ? (application.plannedInspectorIds as string[])
        : [],
    };
  }

  private static assertRequiredReport(reportText: string | undefined, label = "Raporti") {
    if (!reportText?.trim()) {
      throw new Error(`${label} është i detyrueshëm.`);
    }
  }

  private static reviewMetadata(action: WorkflowAction, extra?: Record<string, unknown>) {
    const reviewLevel = REVIEW_LEVEL_BY_ACTION[action];
    return {
      ...(reviewLevel ? { reviewLevel } : {}),
      ...extra,
    };
  }

  private static async assertFieldInspectorMemberships(orgId: string, inspectorIds: string[]) {
    const inspectors = await db.orgMembership.findMany({
      where: {
        userId: { in: inspectorIds },
        organizationId: orgId,
        deactivatedAt: null,
        role: { code: ROLE_CODES.FIELD_INSPECTOR },
      },
      select: { userId: true },
    });
    if (inspectors.length !== inspectorIds.length) {
      throw new Error("Të gjithë inspektorët e zgjedhur duhet të kenë rol Inspektor në ISHMT.");
    }
  }

  static async delegateToDirector(
    ctx: AuthContext,
    applicationId: string,
    input: {
      noteText?: string;
      requiredInspectorCount?: number;
      inspectorIds?: string[];
      directorUserId?: string;
      requiresFieldVerification?: boolean;
    },
  ) {
    if (!canChiefHandleApplications(ctx.roleCode)) {
      throw new Error("Vetëm kryeinspektori mund të delegojë aplikimin te drejtori i drejtorisë.");
    }

    const application = await this.getMutableApplication(ctx, applicationId, [ApplicationStatus.SUBMITTED]);
    const toStatus = assertTransition(
      application.type,
      application.status,
      "DELEGATE_TO_DIRECTOR",
      ctx.roleCode,
    );

    let directorUserId = input.directorUserId;
    if (!directorUserId) {
      const director = await db.orgMembership.findFirst({
        where: {
          organizationId: ctx.activeOrgId,
          deactivatedAt: null,
          role: { code: ROLE_CODES.ISHMT_DIRECTOR },
        },
        select: { userId: true },
      });
      if (!director) throw new Error("Nuk u gjet drejtori i drejtorisë në organizatë.");
      directorUserId = director.userId;
    }

    const inspectorIds = input.inspectorIds?.length ? [...new Set(input.inspectorIds)] : undefined;
    const requiredCount =
      inspectorIds?.length ?? input.requiredInspectorCount ?? null;

    if (inspectorIds?.length) {
      await this.assertFieldInspectorMemberships(ctx.activeOrgId, inspectorIds);
    }

    return db.$transaction(async (tx) => {
      const locked = await tx.application.updateMany({
        where: { id: applicationId, status: application.status },
        data: {
          status: toStatus,
          requiredFieldInspectorCount: requiredCount,
          plannedInspectorIds: inspectorIds ?? Prisma.JsonNull,
          inspectorAssignmentLockedBy: inspectorIds?.length ? ROLE_CODES.CHIEF_INSPECTOR : null,
          currentAssigneeId: directorUserId,
          reviewedAt: new Date(),
        },
      });
      if (locked.count === 0) throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");

      await this.recordTransition(tx, {
        applicationId,
        fromStatus: application.status,
        toStatus,
        action: "DELEGATE_TO_DIRECTOR",
        actorId: ctx.userId,
        comment: input.noteText?.trim() || undefined,
        metadata: this.reviewMetadata("DELEGATE_TO_DIRECTOR", {
          requiredInspectorCount: requiredCount,
          assigneeId: directorUserId,
          inspectorIds,
          requiresFieldVerification: input.requiresFieldVerification ?? false,
        }),
      });

      await applyFieldVerificationRequest(tx, {
        applicationId,
        roleCode: ctx.roleCode as RoleCode,
        requiresFieldVerification: input.requiresFieldVerification,
      });

      await upsertParticipation(tx, {
        applicationId,
        userId: ctx.userId,
        roleCode: ROLE_CODES.CHIEF_INSPECTOR,
        canAct: false,
      });
      await setActiveAssigneeParticipation(tx, {
        applicationId,
        userId: directorUserId!,
        roleCode: ROLE_CODES.ISHMT_DIRECTOR,
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.WORKFLOW_TRANSITION,
          entityType: "application",
          entityId: applicationId,
          afterState: { status: toStatus, requiredInspectorCount: requiredCount },
        },
        tx,
      );

      return { ok: true };
    }).then(async (result) => {
      await notifyUser(directorUserId!, {
        title: ISHMT_NOTIFICATION_COPY.chiefToDirector.title,
        body: ISHMT_NOTIFICATION_COPY.chiefToDirector.body(application.applicationNumber),
        entityType: "application",
        entityId: applicationId,
      });
      return result;
    });
  }

  static async delegateToSectorHead(
    ctx: AuthContext,
    applicationId: string,
    input: { noteText?: string; inspectorIds?: string[]; sectorHeadUserId?: string; requiresFieldVerification?: boolean },
  ) {
    if (!canDirectApplications(ctx.roleCode)) {
      throw new Error("Vetëm drejtori i drejtorisë mund të delegojë te përgjegjësi i sektorit.");
    }

    const application = await this.getMutableApplication(ctx, applicationId, [ApplicationStatus.PENDING_DIRECTOR]);
    const toStatus = assertTransition(
      application.type,
      application.status,
      "DELEGATE_TO_SECTOR_HEAD",
      ctx.roleCode,
    );

    let sectorHeadUserId = input.sectorHeadUserId;
    if (!sectorHeadUserId) {
      const head = await db.orgMembership.findFirst({
        where: {
          organizationId: ctx.activeOrgId,
          deactivatedAt: null,
          role: { code: ROLE_CODES.SECTOR_HEAD },
        },
        select: { userId: true },
      });
      if (!head) throw new Error("Nuk u gjet përgjegjësi sektori në organizatë.");
      sectorHeadUserId = head.userId;
    }

    const canSetInspectors = !application.inspectorAssignmentLockedBy;
    const inspectorIds =
      canSetInspectors && input.inspectorIds?.length
        ? [...new Set(input.inspectorIds)]
        : undefined;

    if (inspectorIds?.length) {
      await this.assertFieldInspectorMemberships(ctx.activeOrgId, inspectorIds);
    }

    return db.$transaction(async (tx) => {
      const locked = await tx.application.updateMany({
        where: { id: applicationId, status: application.status },
        data: {
          status: toStatus,
          currentAssigneeId: sectorHeadUserId,
          reviewedAt: new Date(),
          ...(inspectorIds?.length
            ? {
                plannedInspectorIds: inspectorIds,
                requiredFieldInspectorCount: inspectorIds.length,
                inspectorAssignmentLockedBy: ROLE_CODES.ISHMT_DIRECTOR,
              }
            : {}),
        },
      });
      if (locked.count === 0) throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");

      await this.recordTransition(tx, {
        applicationId,
        fromStatus: application.status,
        toStatus,
        action: "DELEGATE_TO_SECTOR_HEAD",
        actorId: ctx.userId,
        comment: input.noteText?.trim() || undefined,
        metadata: this.reviewMetadata("DELEGATE_TO_SECTOR_HEAD", {
          assigneeId: sectorHeadUserId,
          inspectorIds,
          requiresFieldVerification: input.requiresFieldVerification ?? false,
        }),
      });

      await applyFieldVerificationRequest(tx, {
        applicationId,
        roleCode: ctx.roleCode as RoleCode,
        requiresFieldVerification: input.requiresFieldVerification,
      });

      await upsertParticipation(tx, {
        applicationId,
        userId: ctx.userId,
        roleCode: ROLE_CODES.ISHMT_DIRECTOR,
        canAct: false,
      });
      await setActiveAssigneeParticipation(tx, {
        applicationId,
        userId: sectorHeadUserId!,
        roleCode: ROLE_CODES.SECTOR_HEAD,
      });

      return { ok: true };
    }).then(async (result) => {
      await notifyUser(sectorHeadUserId!, {
        title: ISHMT_NOTIFICATION_COPY.directorToSectorHead.title,
        body: ISHMT_NOTIFICATION_COPY.directorToSectorHead.body(application.applicationNumber),
        entityType: "application",
        entityId: applicationId,
      });
      return result;
    });
  }

  static async assignFieldInspectors(
    ctx: AuthContext,
    applicationId: string,
    input: { inspectorIds?: string[]; noteText?: string; requiresFieldVerification?: boolean },
  ) {
    if (!canReviewApplications(ctx.roleCode)) {
      throw new Error("Vetëm përgjegjësi i sektorit mund të caktojë inspektorët.");
    }

    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.PENDING_SECTOR_HEAD,
      ApplicationStatus.RETURNED_TO_INSPECTORS,
    ]);

    const planned = Array.isArray(application.plannedInspectorIds)
      ? (application.plannedInspectorIds as string[])
      : undefined;

    let inspectorIds = input.inspectorIds?.length ? [...new Set(input.inspectorIds)] : planned;

    if (!inspectorIds?.length) {
      throw new Error("Duhet të caktoni të paktën një inspektor për shqyrtim.");
    }

    if (application.inspectorAssignmentLockedBy && planned?.length) {
      inspectorIds = planned;
    }

    const toStatus = assertTransition(
      application.type,
      application.status,
      "ASSIGN_FIELD_INSPECTORS",
      ctx.roleCode,
    );

    await this.assertFieldInspectorMemberships(ctx.activeOrgId, inspectorIds);

    return db.$transaction(async (tx) => {
      const locked = await tx.application.updateMany({
        where: { id: applicationId, status: application.status },
        data: {
          status: toStatus,
          requiredFieldInspectorCount: inspectorIds.length,
          plannedInspectorIds: inspectorIds,
          reviewedAt: new Date(),
          currentAssigneeId: null,
        },
      });
      if (locked.count === 0) throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");

      const existing = await tx.applicationFieldReviewAssignment.findMany({
        where: { applicationId, status: { not: ApplicationFieldReviewAssignmentStatus.REPLACED } },
      });

      for (const row of existing) {
        if (!inspectorIds.includes(row.inspectorId)) {
          await tx.applicationFieldReviewAssignment.update({
            where: { id: row.id },
            data: {
              status: ApplicationFieldReviewAssignmentStatus.REPLACED,
              replacedAt: new Date(),
              replacedById: ctx.userId,
            },
          });
        }
      }

      for (const inspectorId of inspectorIds) {
        const current = existing.find((r) => r.inspectorId === inspectorId);
        if (current && current.status !== ApplicationFieldReviewAssignmentStatus.REPLACED) {
          await upsertParticipation(tx, {
            applicationId,
            userId: inspectorId,
            roleCode: ROLE_CODES.FIELD_INSPECTOR,
            canAct: current.status === ApplicationFieldReviewAssignmentStatus.PENDING,
          });
          continue;
        }
        await tx.applicationFieldReviewAssignment.create({
          data: {
            applicationId,
            inspectorId,
            assignedById: ctx.userId,
            assignedByRole: ctx.roleCode,
            status: ApplicationFieldReviewAssignmentStatus.PENDING,
          },
        });
      }

      await this.recordTransition(tx, {
        applicationId,
        fromStatus: application.status,
        toStatus,
        action: "ASSIGN_FIELD_INSPECTORS",
        actorId: ctx.userId,
        comment: input.noteText?.trim() || undefined,
        metadata: this.reviewMetadata("ASSIGN_FIELD_INSPECTORS", {
          inspectorIds,
          requiresFieldVerification: input.requiresFieldVerification ?? false,
        }),
      });

      await applyFieldVerificationRequest(tx, {
        applicationId,
        roleCode: ctx.roleCode as RoleCode,
        requiresFieldVerification: input.requiresFieldVerification,
      });

      await upsertParticipation(tx, {
        applicationId,
        userId: ctx.userId,
        roleCode: ROLE_CODES.SECTOR_HEAD,
        canAct: false,
      });

      await addParticipants(
        tx,
        applicationId,
        inspectorIds.map((id) => ({
          userId: id,
          roleCode: ROLE_CODES.FIELD_INSPECTOR,
          canAct: true,
        })),
      );

      const fieldVerificationAssignment = await ensureApplicationFieldVerificationAssignments(tx, {
        applicationId,
        assigneeId: inspectorIds[0]!,
        assignedById: ctx.userId,
        instructions: input.noteText,
      });

      return { inspectorIds, fieldVerificationAssignment, applicationNumber: application.applicationNumber };
    }).then(async ({ inspectorIds: ids, fieldVerificationAssignment, applicationNumber }) => {
      for (const inspectorId of ids) {
        await notifyUser(inspectorId, {
          title: ISHMT_NOTIFICATION_COPY.sectorHeadToInspectors.title,
          body: ISHMT_NOTIFICATION_COPY.sectorHeadToInspectors.body(applicationNumber),
          entityType: "application",
          entityId: applicationId,
        });
      }
      if (fieldVerificationAssignment) {
        await notifyFieldVerificationAssignment(
          fieldVerificationAssignment.id,
          fieldVerificationAssignment.assigneeId,
          applicationNumber,
          fieldVerificationAssignment.scheduledDate,
        );
      }
      return { ok: true };
    });
  }

  static async submitFieldReport(
    ctx: AuthContext,
    assignmentId: string,
    reportText: string,
    options?: { submit?: boolean },
  ) {
    if (!isFieldInspectorRole(ctx.roleCode)) {
      throw new Error("Vetëm inspektorët mund të dorëzojnë raportin e shqyrtimit.");
    }
    const submit = options?.submit ?? true;
    if (submit) {
      this.assertRequiredReport(reportText, "Raporti i inspektorit");
    }

    const assignment = await db.applicationFieldReviewAssignment.findFirst({
      where: { id: assignmentId, inspectorId: ctx.userId },
      include: {
        application: { select: { id: true, type: true, status: true, applicationNumber: true } },
      },
    });
    if (!assignment) throw new Error("Caktimi nuk u gjet.");
    if (assignment.status === ApplicationFieldReviewAssignmentStatus.REPLACED) {
      throw new Error("Ky caktim nuk është më aktiv.");
    }
    if (assignment.application.status !== ApplicationStatus.PENDING_FIELD_REVIEW) {
      throw new Error(`Raporti nuk lejohet në statusin '${assignment.application.status}'.`);
    }
    if (assignment.status === ApplicationFieldReviewAssignmentStatus.COMPLETED && submit) {
      throw new Error("Raporti është dorëzuar tashmë.");
    }

    assertTransition(
      assignment.application.type,
      assignment.application.status,
      "SUBMIT_FIELD_REPORT",
      ctx.roleCode,
    );

    return db.$transaction(async (tx) => {
      await tx.applicationFieldReviewAssignment.update({
        where: { id: assignmentId },
        data: {
          reportText: reportText.trim(),
          reportStatus: submit ? FieldInspectorReportStatus.SUBMITTED : FieldInspectorReportStatus.DRAFT,
          ...(submit
            ? {
                status: ApplicationFieldReviewAssignmentStatus.COMPLETED,
                completedAt: new Date(),
              }
            : {}),
        },
      });

      if (submit) {
        await tx.applicationParticipation.updateMany({
          where: { applicationId: assignment.applicationId, userId: ctx.userId },
          data: { canAct: false },
        });

        await this.recordTransition(tx, {
          applicationId: assignment.applicationId,
          fromStatus: assignment.application.status,
          toStatus: assignment.application.status,
          action: "SUBMIT_FIELD_REPORT",
          actorId: ctx.userId,
          comment: reportText.trim(),
          metadata: this.reviewMetadata("SUBMIT_FIELD_REPORT", { assignmentId }),
        });

        if (await this.allFieldReportsComplete(assignment.applicationId, tx)) {
          await this.advanceToSectorHeadReportPhase(tx, assignment.application, ctx.userId);
        }
      }

      return { ok: true };
    });
  }

  private static async advanceToSectorHeadReportPhase(
    tx: Prisma.TransactionClient,
    application: { id: string; type: ApplicationType; status: ApplicationStatus; applicationNumber: string },
    actorId: string,
  ) {
    const sectorHead = await tx.orgMembership.findFirst({
      where: {
        role: { code: ROLE_CODES.SECTOR_HEAD },
        deactivatedAt: null,
        organization: { type: OrgType.ISHMT },
      },
      select: { userId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!sectorHead) return;

    const toStatus = ApplicationStatus.PENDING_SECTOR_HEAD_REPORT;
    await tx.application.update({
      where: { id: application.id },
      data: {
        status: toStatus,
        currentAssigneeId: sectorHead.userId,
        reviewedAt: new Date(),
      },
    });

    await this.recordTransition(tx, {
      applicationId: application.id,
      fromStatus: application.status,
      toStatus,
      action: "ALL_FIELD_REPORTS_COMPLETE",
      actorId,
      metadata: this.reviewMetadata("FORWARD_TO_DIRECTOR"),
    });

    await setActiveAssigneeParticipation(tx, {
      applicationId: application.id,
      userId: sectorHead.userId,
      roleCode: ROLE_CODES.SECTOR_HEAD,
    });

    await notifyUser(sectorHead.userId, {
      title: ISHMT_NOTIFICATION_COPY.inspectorsToSectorHead.title,
      body: ISHMT_NOTIFICATION_COPY.inspectorsToSectorHead.body(application.applicationNumber),
      entityType: "application",
      entityId: application.id,
    });
  }

  static async allFieldReportsComplete(
    applicationId: string,
    tx: Prisma.TransactionClient = db,
  ) {
    const pending = await tx.applicationFieldReviewAssignment.count({
      where: {
        applicationId,
        status: ApplicationFieldReviewAssignmentStatus.PENDING,
      },
    });
    const total = await tx.applicationFieldReviewAssignment.count({
      where: {
        applicationId,
        status: { not: ApplicationFieldReviewAssignmentStatus.REPLACED },
      },
    });
    return total > 0 && pending === 0;
  }

  static async forwardToDirectorFromSectorHead(
    ctx: AuthContext,
    applicationId: string,
    reportText: string,
  ) {
    if (!canReviewApplications(ctx.roleCode)) {
      throw new Error("Vetëm përgjegjësi i sektorit mund të dërgojë dosjen te drejtorit.");
    }
    this.assertRequiredReport(reportText, "Raporti i përgjegjësit të sektorit");

    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.PENDING_SECTOR_HEAD_REPORT,
      ApplicationStatus.RETURNED_TO_SECTOR_HEAD,
    ]);

    const toStatus = assertTransition(
      application.type,
      application.status,
      "FORWARD_TO_DIRECTOR",
      ctx.roleCode,
    );

    const director = await db.orgMembership.findFirst({
      where: {
        organizationId: ctx.activeOrgId,
        deactivatedAt: null,
        role: { code: ROLE_CODES.ISHMT_DIRECTOR },
      },
      select: { userId: true },
    });
    const directorUserId = director?.userId;

    return db.$transaction(async (tx) => {
      const locked = await tx.application.updateMany({
        where: { id: applicationId, status: application.status },
        data: {
          status: toStatus,
          currentAssigneeId: directorUserId ?? null,
          reviewedAt: new Date(),
        },
      });
      if (locked.count === 0) throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");

      await this.recordTransition(tx, {
        applicationId,
        fromStatus: application.status,
        toStatus,
        action: "FORWARD_TO_DIRECTOR",
        actorId: ctx.userId,
        comment: reportText.trim(),
        metadata: this.reviewMetadata("FORWARD_TO_DIRECTOR"),
      });

      await upsertParticipation(tx, {
        applicationId,
        userId: ctx.userId,
        roleCode: ROLE_CODES.SECTOR_HEAD,
        canAct: false,
      });
      if (directorUserId) {
        await setActiveAssigneeParticipation(tx, {
          applicationId,
          userId: directorUserId,
          roleCode: ROLE_CODES.ISHMT_DIRECTOR,
        });
      }

      return { directorUserId };
    }).then(async ({ directorUserId: dirId }) => {
      if (dirId) {
        await notifyUser(dirId, {
          title: ISHMT_NOTIFICATION_COPY.sectorHeadToDirector.title,
          body: ISHMT_NOTIFICATION_COPY.sectorHeadToDirector.body(application.applicationNumber),
          entityType: "application",
          entityId: applicationId,
        });
      }
      return { ok: true };
    });
  }

  static async forwardToChiefFromDirector(
    ctx: AuthContext,
    applicationId: string,
    reportText: string,
  ) {
    if (!canDirectApplications(ctx.roleCode)) {
      throw new Error("Vetëm drejtori i drejtorisë mund të dërgojë dosjen te kryeinspektori.");
    }
    this.assertRequiredReport(reportText, "Raporti i drejtorit");

    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.PENDING_DIRECTOR_REPORT,
      ApplicationStatus.RETURNED_TO_DIRECTOR,
    ]);
    const toStatus = assertTransition(
      application.type,
      application.status,
      "FORWARD_TO_CHIEF",
      ctx.roleCode,
    );

    const chief = await db.orgMembership.findFirst({
      where: {
        organizationId: ctx.activeOrgId,
        deactivatedAt: null,
        role: { code: ROLE_CODES.CHIEF_INSPECTOR },
      },
      select: { userId: true },
      orderBy: { joinedAt: "asc" },
    });

    return db.$transaction(async (tx) => {
      const locked = await tx.application.updateMany({
        where: { id: applicationId, status: application.status },
        data: {
          status: toStatus,
          currentAssigneeId: chief?.userId ?? null,
          reviewedAt: new Date(),
        },
      });
      if (locked.count === 0) throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");

      await this.recordTransition(tx, {
        applicationId,
        fromStatus: application.status,
        toStatus,
        action: "FORWARD_TO_CHIEF",
        actorId: ctx.userId,
        comment: reportText.trim(),
        metadata: this.reviewMetadata("FORWARD_TO_CHIEF"),
      });

      await upsertParticipation(tx, {
        applicationId,
        userId: ctx.userId,
        roleCode: ROLE_CODES.ISHMT_DIRECTOR,
        canAct: false,
      });
      if (chief?.userId) {
        await setActiveAssigneeParticipation(tx, {
          applicationId,
          userId: chief.userId,
          roleCode: ROLE_CODES.CHIEF_INSPECTOR,
        });
      }

      return { chiefUserId: chief?.userId };
    }).then(async ({ chiefUserId }) => {
      if (chiefUserId) {
        await notifyUser(chiefUserId, {
          title: ISHMT_NOTIFICATION_COPY.directorToChief.title,
          body: ISHMT_NOTIFICATION_COPY.directorToChief.body(application.applicationNumber),
          entityType: "application",
          entityId: applicationId,
        });
      }
      return { ok: true };
    });
  }

  /** @deprecated Zëvendësuar nga delegateToDirector */
  static async pickupForReview(_ctx: AuthContext, _applicationId: string) {
    throw new Error("Marrja në shqyrtim nga specialisti nuk mbështetet më. Përdorni zinxhirin hierarkik.");
  }

  static async getApplicationFieldVerificationStatus(applicationId: string) {
    const { getApplicationFieldVerificationStatus } = await import(
      "@/lib/services/application-field-verification"
    );
    return getApplicationFieldVerificationStatus(applicationId);
  }

  static async getInspectorReviewMetadata(applicationId: string) {
    const entry = await db.applicationWorkflowHistory.findFirst({
      where: {
        applicationId,
        action: { in: ["FORWARD_TO_CHIEF", "FORWARD_TO_DIRECTOR"] },
      },
      orderBy: { createdAt: "desc" },
    });
    const meta = entry?.metadata as {
      requiresPhysicalInspection?: boolean;
      recommendation?: "APPROVE" | "REJECT";
    } | null;
    const recommendation =
      meta?.recommendation ??
      (entry?.action === "RECOMMEND_REJECTION" ? ("REJECT" as const) : ("APPROVE" as const));
    return {
      requiresPhysicalInspection: meta?.requiresPhysicalInspection ?? false,
      recommendation,
      comment: entry?.comment ?? null,
    };
  }

  /** @deprecated Use getInspectorReviewMetadata */
  static async getForwardReviewMetadata(applicationId: string) {
    const meta = await this.getInspectorReviewMetadata(applicationId);
    return { requiresPhysicalInspection: meta.requiresPhysicalInspection };
  }

  /** @deprecated Zëvendësuar nga forwardToChiefFromDirector / forwardToDirectorFromSectorHead */
  static async forwardToAdmin(
    _ctx: AuthContext,
    _applicationId: string,
    _options?: { requiresPhysicalInspection?: boolean; comment?: string },
  ) {
    throw new Error("Dërgimi te administratori nuk mbështetet më. Përdorni zinxhirin hierarkik.");
  }

  /** @deprecated */
  static async recommendRejection(
    _ctx: AuthContext,
    _applicationId: string,
    _input: { reason: string; requiresPhysicalInspection?: boolean },
  ) {
    throw new Error("Rekomandimi i refuzimit nga specialisti nuk mbështetet më.");
  }

  static async approve(ctx: AuthContext, applicationId: string, options?: { requiresPhysicalInspection?: boolean }) {
    if (!canApproveApplications(ctx.roleCode)) {
      throw new Error("Vetëm kryeinspektori mund të miratojë aplikimin.");
    }

    await this.getMutableApplication(ctx, applicationId, [ApplicationStatus.PENDING_CHIEF_INSPECTOR]);

    await assertFieldVerificationCompleteForApproval(applicationId);

    const forwardMeta = await this.getInspectorReviewMetadata(applicationId);
    const physicalFlag = options?.requiresPhysicalInspection ?? forwardMeta.requiresPhysicalInspection;
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: {
        data: { include: { municipality: true } },
        ownerOrg: true,
        installerOrg: true,
        certifierOrg: true,
        targetElevator: {
          include: {
            technicalData: true,
            qrCodes: true,
            certificates: true,
          },
        },
      },
    });

    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (!(await this.canViewApplication(ctx, application))) throw new Error("Nuk keni leje.");

    const toStatus = assertTransition(
      application.type,
      application.status,
      "APPROVE",
      ctx.roleCode,
    );

    if (application.type === ApplicationType.NEW_REGISTRATION) {
      const result = await db.$transaction(async (tx) => {
        // Optimistic lock: only transition if the status is still what we validated,
        // so concurrent approve/reject/return actions cannot both succeed.
        const locked = await tx.application.updateMany({
          where: { id: applicationId, status: application.status },
          data: { status: toStatus, approvedAt: new Date(), reviewedAt: new Date() },
        });
        if (locked.count === 0) {
          throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");
        }

        await this.recordTransition(tx, {
          applicationId,
          fromStatus: application.status,
          toStatus,
          action: "APPROVE",
          actorId: ctx.userId,
          metadata: physicalFlag
            ? { requiresPhysicalInspection: true }
            : undefined,
        });

        const created = await ElevatorService.createFromApprovedApplication(application, ctx.userId, tx);

        if (physicalFlag) {
          await tx.elevator.update({
            where: { id: created.elevator.id },
            data: { requiresAttention: true },
          });
        }

        await AuditService.log(
          {
            actorId: ctx.userId,
            action: AuditAction.WORKFLOW_TRANSITION,
            entityType: "application",
            entityId: applicationId,
            afterState: {
              status: toStatus,
              elevatorId: created.elevator.id,
              registryNumber: created.elevator.registryNumber,
              certificateNumber: created.certificate.certificateNumber,
              qrCode: created.qr.code,
            },
          },
          tx,
        );

        return created;
      });

      const assetResult = await PostApprovalAssetService.tryGenerate({
        elevatorId: result.elevator.id,
        certificateId: result.certificate.id,
        qrCodeId: result.qr.id,
        applicationId,
        actorId: ctx.userId,
      });

      await NotificationService.notifyOrgMembers(application.ownerOrgId, {
        title: "Regjistrimi u miratua",
        body: `Ashensori ${result.elevator.registryNumber} u regjistrua me sukses.`,
        entityType: "elevator",
        entityId: result.elevator.id,
      });

      return {
        ...result,
        registryNumber: result.elevator.registryNumber,
        assets: assetResult.success ? assetResult.assets : null,
        assetGeneration: assetResult,
      };
    }

    const lifecycleResult = await db.$transaction(async (tx) => {
      const locked = await tx.application.updateMany({
        where: { id: applicationId, status: application.status },
        data: { status: toStatus, approvedAt: new Date(), reviewedAt: new Date() },
      });
      if (locked.count === 0) {
        throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");
      }

      await this.recordTransition(tx, {
        applicationId,
        fromStatus: application.status,
        toStatus,
        action: "APPROVE",
        actorId: ctx.userId,
      });

      let sideEffect: Record<string, unknown> = {};

      switch (application.type) {
        case ApplicationType.DEREGISTRATION:
          sideEffect = await ElevatorLifecycleService.executeDeregistration(application, ctx.userId, tx);
          break;
        case ApplicationType.DATA_CORRECTION:
          sideEffect = await ElevatorLifecycleService.executeDataCorrection(application, ctx.userId, tx);
          break;
        case ApplicationType.DATA_UPDATE:
          sideEffect = await ElevatorLifecycleService.executeDataUpdate(application, ctx.userId, tx);
          break;
        case ApplicationType.MODERNIZATION:
          sideEffect = await ElevatorLifecycleService.executeModernization(application, ctx.userId, tx);
          break;
        default:
          throw new Error(`Miratimi për '${application.type}' nuk mbështetet ende.`);
      }

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.WORKFLOW_TRANSITION,
          entityType: "application",
          entityId: applicationId,
          afterState: { status: toStatus, ...sideEffect },
        },
        tx,
      );

      return sideEffect;
    });

    await ElevatorLifecycleService.notifyLifecycleComplete(
      application,
      "Aplikimi u miratua",
      `${application.applicationNumber} u përpunua me sukses nga ISHMT.`,
    );

    const newCertNumber =
      typeof lifecycleResult === "object" &&
      lifecycleResult !== null &&
      "newCertificateNumber" in lifecycleResult
        ? (lifecycleResult as { newCertificateNumber?: string }).newCertificateNumber
        : null;

    if (
      newCertNumber &&
      (application.type === ApplicationType.DATA_CORRECTION ||
        application.type === ApplicationType.DATA_UPDATE ||
        application.type === ApplicationType.MODERNIZATION)
    ) {
      const cert = await db.certificate.findFirst({
        where: { certificateNumber: newCertNumber, elevatorId: application.elevatorId! },
      });
      if (cert) {
        await PostApprovalAssetService.generateReplacementCertificatePdf({
          applicationId,
          certificateId: cert.id,
          elevatorId: application.elevatorId!,
          actorId: ctx.userId,
        });
      }
    }

    return { lifecycleResult, registryNumber: null };
  }

  static async reject(ctx: AuthContext, applicationId: string, reason: string) {
    if (!canApproveApplications(ctx.roleCode)) {
      throw new Error("Vetëm kryeinspektori mund të refuzojë aplikimin.");
    }

    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.PENDING_CHIEF_INSPECTOR,
    ]);
    const toStatus = assertTransition(
      application.type,
      application.status,
      "REJECT",
      ctx.roleCode,
    );

    return this.transition(ctx, application, "REJECT", toStatus, {
      rejectedAt: new Date(),
      rejectionReason: reason,
      reviewedAt: new Date(),
    }, reason);
  }

  static async applyReturnCorrection(
    ctx: AuthContext,
    application: {
      id: string;
      status: ApplicationStatus;
      returnToRole?: ReturnTargetRole | null;
      returnToRoles?: unknown;
      ownerOrgId: string;
      applicationNumber: string;
      installerOrgId?: string | null;
      certifierOrgId?: string | null;
    },
    completedRole: ReturnTargetRole,
    historyAction: string,
  ) {
    if (application.status !== ApplicationStatus.RETURNED) {
      throw new Error("Korrigjimi vlen vetëm për aplikime të kthyera.");
    }
    if (!isReturnedToRole(application, completedRole)) {
      throw new Error("Ky rol nuk është në listën e korrigimit nga ISHMT.");
    }

    const pending = getReturnToRoles(application);
    const remaining = removeCompletedReturnRole(pending, completedRole);
    const toStatus = resolveStatusAfterReturnCorrection(remaining);
    const returnToRole = remaining.length > 0 ? pickPrimaryReturnToRole(remaining) : null;

    const result = await db.$transaction(async (tx) => {
      const locked = await tx.application.updateMany({
        where: { id: application.id, status: ApplicationStatus.RETURNED },
        data: {
          status: toStatus,
          returnToRole,
          returnToRoles: remaining.length > 0 ? remaining : Prisma.JsonNull,
        },
      });
      if (locked.count === 0) {
        throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");
      }
      const updated = await tx.application.findUniqueOrThrow({ where: { id: application.id } });

      await this.recordTransition(tx, {
        applicationId: application.id,
        fromStatus: ApplicationStatus.RETURNED,
        toStatus,
        action: historyAction,
        actorId: ctx.userId,
        metadata: { completedRole, remainingRoles: remaining },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.WORKFLOW_TRANSITION,
          entityType: "application",
          entityId: application.id,
          afterState: { action: historyAction, completedRole, status: toStatus, remainingRoles: remaining },
        },
        tx,
      );

      return updated;
    });

    if (toStatus === ApplicationStatus.PENDING_OWNER_SUBMISSION) {
      await NotificationService.notifyOrgMembers(application.ownerOrgId, {
        title: "Korrigimet u plotësuan",
        body: `${application.applicationNumber} është gati për riparashtrim te ISHMT.`,
        entityType: "application",
        entityId: application.id,
      });
    } else if (remaining.length > 0) {
      const notifyTargets = [
        { orgId: application.ownerOrgId, role: ReturnTargetRole.OWNER },
        application.installerOrgId
          ? { orgId: application.installerOrgId, role: ReturnTargetRole.INSTALLER }
          : null,
        application.certifierOrgId
          ? { orgId: application.certifierOrgId, role: ReturnTargetRole.CERTIFIER }
          : null,
      ].filter(
        (t): t is { orgId: string; role: ReturnTargetRole } =>
          t !== null && remaining.includes(t.role),
      );

      for (const target of notifyTargets) {
        await NotificationService.notifyOrgMembers(target.orgId, {
          title: "Korrigim i aplikimit në pritje",
          body: `${application.applicationNumber} - duhet të plotësoni korrigimin e kërkuar.`,
          entityType: "application",
          entityId: application.id,
        });
      }
    }

    return ApplicationService.getById(ctx, application.id);
  }

  static async returnForCorrection(
    ctx: AuthContext,
    applicationId: string,
    input: {
      reason: string;
      returnToRoles: ReturnTargetRole[];
      requiredCorrection: string;
    },
  ) {
    if (input.returnToRoles.length === 0) {
      throw new Error("Zgjidhni të paktën një palë për kthim.");
    }

    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { ownerOrg: true, installerOrg: true, certifierOrg: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (!(await this.canViewApplication(ctx, application))) throw new Error("Nuk keni leje.");
    if (application.status !== ApplicationStatus.PENDING_CHIEF_INSPECTOR) {
      throw new Error(`Veprimi nuk lejohet në statusin '${application.status}'.`);
    }

    const returnToRole = pickPrimaryReturnToRole(input.returnToRoles);
    const nextStatus = resolveReturnStatus(returnToRole);

    assertTransition(application.type, application.status, "RETURN", ctx.roleCode, {
      returnTarget: returnToRole,
    });

    const result = await db.$transaction(async (tx) => {
      const locked = await tx.application.updateMany({
        where: { id: application.id, status: application.status },
        data: {
          status: nextStatus,
          returnReason: input.reason,
          returnToRole,
          returnToRoles: input.returnToRoles,
          requiredCorrection: input.requiredCorrection,
          returnedAt: new Date(),
          returnedById: ctx.userId,
          reviewedAt: new Date(),
        },
      });
      if (locked.count === 0) {
        throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");
      }
      const updated = await tx.application.findUniqueOrThrow({ where: { id: application.id } });

      await this.recordTransition(
        tx,
        {
          applicationId: application.id,
          fromStatus: application.status,
          toStatus: nextStatus,
          action: "RETURN",
          actorId: ctx.userId,
          comment: input.reason,
          metadata: {
            returnToRole,
            returnToRoles: input.returnToRoles,
            reason: input.reason,
            requiredCorrection: input.requiredCorrection,
          },
        },
      );

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.WORKFLOW_TRANSITION,
          entityType: "application",
          entityId: application.id,
          beforeState: { status: application.status },
          afterState: {
            status: nextStatus,
            action: "RETURN",
            returnToRole,
            returnToRoles: input.returnToRoles,
            reason: input.reason,
            requiredCorrection: input.requiredCorrection,
          },
          metadata: {
            returnTarget: returnToRole,
            returnToRoles: input.returnToRoles,
            requiredCorrection: input.requiredCorrection,
          },
        },
        tx,
      );

      return updated;
    });

    // Notify after commit so a rolled-back transaction never leaves a stray notification.
    const notifyTargets = [
      { orgId: application.ownerOrgId, role: ReturnTargetRole.OWNER },
      application.installerOrgId
        ? { orgId: application.installerOrgId, role: ReturnTargetRole.INSTALLER }
        : null,
      application.certifierOrgId
        ? { orgId: application.certifierOrgId, role: ReturnTargetRole.CERTIFIER }
        : null,
    ].filter(
      (t): t is { orgId: string; role: ReturnTargetRole } =>
        t !== null && input.returnToRoles.includes(t.role),
    );

    for (const target of notifyTargets) {
      await NotificationService.notifyOrgMembers(target.orgId, {
        title: "Aplikimi u kthye për korrigjim",
        body: input.reason,
        entityType: "application",
        entityId: application.id,
      });
    }

    return result;
  }

  static async cancel(ctx: AuthContext, applicationId: string) {
    const application = await this.getMutableApplication(ctx, applicationId, [
      ApplicationStatus.DRAFT,
      ApplicationStatus.BASIC_DATA_COMPLETED,
    ]);
    const toStatus = assertTransition(application.type, application.status, "CANCEL", ctx.roleCode);
    return this.transition(ctx, application, "CANCEL", toStatus);
  }

  private static async getMutableApplication(
    ctx: AuthContext,
    applicationId: string,
    allowedStatuses: ApplicationStatus[],
  ) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
    });

    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (!(await this.canViewApplication(ctx, application))) throw new Error("Nuk keni leje.");
    if (!allowedStatuses.includes(application.status)) {
      throw new Error(`Veprimi nuk lejohet në statusin '${application.status}'.`);
    }

    return application;
  }

  private static async assertActiveLicensedCompany(organizationId: string, type: OrgType) {
    const now = new Date();
    const org = await db.organization.findFirst({
      where: {
        id: organizationId,
        type,
        status: { in: [OrgStatus.ACTIVE_AUTHORIZED, OrgStatus.ACTIVE] },
        deletedAt: null,
        licenses: {
          some: {
            status: OrgStatus.ACTIVE,
            expiryDate: { gte: now },
          },
        },
      },
    });

    if (!org) {
      throw new Error("Kompania e zgjedhur nuk është e autorizuar nga Drejtoria ose licenca ka skaduar.");
    }
  }

  private static async transition(
    ctx: AuthContext,
    application: { id: string; status: ApplicationStatus },
    action: WorkflowAction,
    toStatus: ApplicationStatus,
    extraData?: Prisma.ApplicationUncheckedUpdateManyInput,
    comment?: string,
  ) {
    return db.$transaction(async (tx) => {
      // Optimistic lock: transition only if status is unchanged since validation.
      const locked = await tx.application.updateMany({
        where: { id: application.id, status: application.status },
        data: {
          status: toStatus,
          ...extraData,
        },
      });
      if (locked.count === 0) {
        throw new Error("Aplikimi u përpunua tashmë nga një veprim tjetër.");
      }
      const updated = await tx.application.findUniqueOrThrow({ where: { id: application.id } });

      await this.recordTransition(tx, {
        applicationId: application.id,
        fromStatus: application.status,
        toStatus,
        action,
        actorId: ctx.userId,
        comment,
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.WORKFLOW_TRANSITION,
          entityType: "application",
          entityId: application.id,
          beforeState: { status: application.status },
          afterState: { status: toStatus, action },
        },
        tx,
      );

      return updated;
    });
  }

  private static async recordTransition(
    tx: Prisma.TransactionClient,
    input: {
      applicationId: string;
      fromStatus: ApplicationStatus | null;
      toStatus: ApplicationStatus;
      action: string;
      actorId: string;
      comment?: string;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    return tx.applicationWorkflowHistory.create({
      data: {
        applicationId: input.applicationId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        action: input.action,
        actorId: input.actorId,
        comment: input.comment,
        metadata: input.metadata,
      },
    });
  }
}
