import {
  AuditAction,
  FieldInspectionAssignmentStatus,
  InspectionResult,
  InspectionType,
} from "@prisma/client";
import { AuditService } from "@/lib/audit/audit-service";
import { db } from "@/lib/db";
import { NotificationService } from "@/lib/services/notification-service";
import { OperationalEventNotificationService } from "@/lib/services/operational-event-notification-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { INSPECTION_RESULT_LABELS } from "@/lib/ishmt/field-inspection-labels";
import {
  completeApplicationFieldVerification,
  isChiefLockedFieldVerification,
} from "@/lib/services/application-field-verification";
import {
  ISHMT_FIELD_INSPECTOR_ROLES,
  canAssignFieldInspections,
  isFieldInspectorRole,
} from "@/lib/permissions/ishmt-roles";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";

const assignmentInclude = {
  application: {
    select: {
      id: true,
      applicationNumber: true,
      type: true,
      status: true,
      inspectorAssignmentLockedBy: true,
      fieldVerificationRequestedBy: true,
      data: {
        select: {
          buildingAddress: true,
          municipality: { select: { nameSq: true } },
        },
      },
    },
  },
  elevator: {
    select: {
      id: true,
      registryNumber: true,
      buildingAddress: true,
      municipality: { select: { nameSq: true } },
    },
  },
  assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedBy: { select: { id: true, firstName: true, lastName: true } },
  inspection: {
    select: {
      id: true,
      result: true,
      conductedDate: true,
      findings: true,
      reportDocumentId: true,
      reportDocument: { select: { id: true, originalFilename: true } },
    },
  },
  reportDocument: { select: { id: true, originalFilename: true } },
} as const;

export type FieldInspectorOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export class IshmtFieldInspectionService {
  private static async enrichChiefLockedAssignedBy<
    T extends {
      application: {
        id: string;
        inspectorAssignmentLockedBy: string | null;
        fieldVerificationRequestedBy: string | null;
      } | null;
      assignedBy: { id: string; firstName: string; lastName: string };
    },
  >(assignments: T[]): Promise<T[]> {
    const chiefLockedAppIds = assignments
      .filter((a) => a.application && isChiefLockedFieldVerification(a.application))
      .map((a) => a.application!.id);

    if (chiefLockedAppIds.length === 0) return assignments;

    const histories = await db.applicationWorkflowHistory.findMany({
      where: {
        applicationId: { in: chiefLockedAppIds },
        action: "DELEGATE_TO_DIRECTOR",
      },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { id: true, firstName: true, lastName: true } } },
    });

    const actorByApp = new Map<string, (typeof histories)[number]["actor"]>();
    for (const history of histories) {
      if (!actorByApp.has(history.applicationId)) {
        actorByApp.set(history.applicationId, history.actor);
      }
    }

    return assignments.map((assignment) => {
      if (!assignment.application || !isChiefLockedFieldVerification(assignment.application)) {
        return assignment;
      }
      const actor = actorByApp.get(assignment.application.id);
      if (!actor) return assignment;
      return { ...assignment, assignedBy: actor };
    });
  }

  private static assertAssigner(ctx: AuthContext) {
    if (!canAssignFieldInspections(ctx.roleCode) || !hasPermission(ctx, PERMISSIONS.INSPECTIONS_FIELD_ASSIGN)) {
      throw new Error("Nuk keni leje të caktoni inspektim në terren.");
    }
  }

  private static assertFieldInspector(ctx: AuthContext) {
    if (!isFieldInspectorRole(ctx.roleCode) || !hasPermission(ctx, PERMISSIONS.INSPECTIONS_FIELD_CONDUCT)) {
      throw new Error("Nuk keni leje për inspektim në terren.");
    }
  }

  static async listFieldInspectors(ctx: AuthContext): Promise<FieldInspectorOption[]> {
    this.assertAssigner(ctx);

    const roles = await db.authRole.findMany({
      where: { code: { in: [...ISHMT_FIELD_INSPECTOR_ROLES] } },
      select: { id: true },
    });

    const memberships = await db.orgMembership.findMany({
      where: {
        organizationId: ctx.activeOrgId,
        deactivatedAt: null,
        roleId: { in: roles.map((r) => r.id) },
        user: { isActive: true },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { user: { lastName: "asc" } },
    });

    return memberships.map((m) => m.user);
  }

  static async assign(
    ctx: AuthContext,
    input: {
      elevatorId?: string;
      applicationId?: string;
      assigneeId: string;
      scheduledDate: Date;
      instructions?: string;
    },
  ) {
    this.assertAssigner(ctx);

    if (!input.elevatorId && !input.applicationId) {
      throw new Error("Duhet të specifikoni ashensorin ose aplikimin.");
    }

    let label = "";
    if (input.elevatorId) {
      const elevator = await db.elevator.findFirst({
        where: { id: input.elevatorId, deletedAt: null },
        select: { id: true, registryNumber: true },
      });
      if (!elevator) throw new Error("Ashensori nuk u gjet.");
      label = elevator.registryNumber;
    } else if (input.applicationId) {
      const application = await db.application.findFirst({
        where: { id: input.applicationId, deletedAt: null },
        select: { applicationNumber: true },
      });
      if (!application) throw new Error("Aplikimi nuk u gjet.");
      label = application.applicationNumber;
    }

    const roles = await db.authRole.findMany({
      where: { code: { in: [...ISHMT_FIELD_INSPECTOR_ROLES] } },
      select: { id: true },
    });
    const roleIds = roles.map((r) => r.id);

    const assigneeMembership = await db.orgMembership.findFirst({
      where: {
        userId: input.assigneeId,
        organizationId: ctx.activeOrgId,
        deactivatedAt: null,
        roleId: { in: roleIds },
      },
    });
    if (!assigneeMembership) {
      throw new Error("Inspektori i zgjedhur nuk është anëtar i vlefshëm i IQMT.");
    }

    const assignment = await db.fieldInspectionAssignment.create({
      data: {
        elevatorId: input.elevatorId ?? null,
        applicationId: input.applicationId ?? null,
        assigneeId: input.assigneeId,
        assignedById: ctx.userId,
        scheduledDate: input.scheduledDate,
        instructions: input.instructions?.trim() || null,
      },
      include: assignmentInclude,
    });

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.CREATE,
      entityType: "field_inspection_assignment",
      entityId: assignment.id,
      afterState: {
        elevatorId: input.elevatorId,
        applicationId: input.applicationId,
        assigneeId: input.assigneeId,
        scheduledDate: input.scheduledDate.toISOString(),
      },
    });

    await NotificationService.create({
      userId: input.assigneeId,
      title: "Caktim inspektimi në terren",
      body: `Ju është caktuar inspektim për ${label} më ${input.scheduledDate.toLocaleDateString("sq-AL")}.`,
      entityType: "field_inspection_assignment",
      entityId: assignment.id,
    });

    return assignment;
  }

  static async listForAssigner(
    ctx: AuthContext,
    filters?: { status?: FieldInspectionAssignmentStatus; applicationId?: string },
  ) {
    if (
      !canAssignFieldInspections(ctx.roleCode) &&
      !hasPermission(ctx, PERMISSIONS.INSPECTIONS_FIELD_VIEW_ALL)
    ) {
      throw new Error("Nuk keni leje të shihni caktimet e inspektimit.");
    }

    return this.enrichChiefLockedAssignedBy(
      await db.fieldInspectionAssignment.findMany({
        where: {
          ...(filters?.status ? { status: filters.status } : {}),
          ...(filters?.applicationId ? { applicationId: filters.applicationId } : {}),
          OR: [
            { elevator: { deletedAt: null } },
            { application: { deletedAt: null } },
          ],
        },
        include: assignmentInclude,
        orderBy: [{ scheduledDate: "desc" }, { createdAt: "desc" }],
        take: 200,
      }),
    );
  }

  static async listMine(ctx: AuthContext, status?: FieldInspectionAssignmentStatus) {
    this.assertFieldInspector(ctx);

    return db.fieldInspectionAssignment.findMany({
      where: {
        assigneeId: ctx.userId,
        ...(status ? { status } : {}),
        OR: [
          { elevator: { deletedAt: null } },
          { application: { deletedAt: null } },
        ],
      },
      include: assignmentInclude,
      orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  static async start(ctx: AuthContext, assignmentId: string) {
    this.assertFieldInspector(ctx);

    const assignment = await db.fieldInspectionAssignment.findFirst({
      where: { id: assignmentId, assigneeId: ctx.userId },
    });
    if (!assignment) throw new Error("Caktimi nuk u gjet.");
    if (assignment.status !== FieldInspectionAssignmentStatus.SCHEDULED) {
      throw new Error("Ky caktim nuk mund të fillohet.");
    }

    return db.fieldInspectionAssignment.update({
      where: { id: assignmentId },
      data: { status: FieldInspectionAssignmentStatus.IN_PROGRESS },
      include: assignmentInclude,
    });
  }

  static async complete(
    ctx: AuthContext,
    assignmentId: string,
    input: {
      conductedDate: Date;
      result: "PASS" | "FAIL" | "CONDITIONAL";
      findings?: string;
      reportDocumentId?: string;
    },
  ) {
    this.assertFieldInspector(ctx);

    const assignment = await db.fieldInspectionAssignment.findFirst({
      where: {
        id: assignmentId,
        assigneeId: ctx.userId,
        status: {
          in: [FieldInspectionAssignmentStatus.SCHEDULED, FieldInspectionAssignmentStatus.IN_PROGRESS],
        },
      },
      include: {
        elevator: { select: { id: true, registryNumber: true } },
        application: { select: { id: true, applicationNumber: true } },
      },
    });
    if (!assignment) throw new Error("Caktimi nuk u gjet ose është përfunduar.");

    if (input.reportDocumentId) {
      const document = await db.document.findFirst({
        where: { id: input.reportDocumentId, uploadedById: ctx.userId, deletedAt: null },
      });
      if (!document) throw new Error("Raporti i inspektimit nuk u gjet. Ngarkojeni përsëri.");
    } else {
      throw new Error("Ngarkoni raportin e inspektimit.");
    }

    const resultMap: Record<string, InspectionResult> = {
      PASS: InspectionResult.PASS,
      FAIL: InspectionResult.FAIL,
      CONDITIONAL: InspectionResult.CONDITIONAL,
    };
    const mappedResult = resultMap[input.result];

    const updated = await db.$transaction(async (tx) => {
      const updatedAssignment = await completeApplicationFieldVerification(
        tx,
        {
          id: assignment.id,
          applicationId: assignment.applicationId,
          elevatorId: assignment.elevatorId,
          assigneeId: assignment.assigneeId,
          scheduledDate: assignment.scheduledDate,
        },
        {
          conductedDate: input.conductedDate,
          result: mappedResult,
          findings: input.findings,
          reportDocumentId: input.reportDocumentId ?? null,
        },
      );

      if (assignment.elevatorId) {
        await AuditService.log(
          {
            actorId: ctx.userId,
            action: AuditAction.CREATE,
            entityType: "inspection",
            entityId: updatedAssignment.inspectionId ?? assignment.id,
            afterState: {
              assignmentId,
              elevatorId: assignment.elevatorId,
              result: input.result,
            },
          },
          tx,
        );
      }

      return tx.fieldInspectionAssignment.findUniqueOrThrow({
        where: { id: assignmentId },
        include: assignmentInclude,
      });
    });

    const subjectLabel =
      assignment.elevator?.registryNumber ??
      assignment.application?.applicationNumber ??
      "subjekti";
    const resultLabel = INSPECTION_RESULT_LABELS[input.result] ?? input.result;

    if (assignment.elevatorId) {
      await OperationalEventNotificationService.broadcastForElevator({
        elevatorId: assignment.elevatorId,
        title: "Inspektim terreni u përfundua",
        body: `Ashensori ${subjectLabel}: ${resultLabel}.`,
        entityType: "field_inspection_assignment",
        entityId: assignmentId,
      });
    } else if (assignment.applicationId) {
      await NotificationService.create({
        userId: assignment.assigneeId,
        title: "Verifikim në terren u përfundua",
        body: `${subjectLabel}: ${resultLabel}.`,
        entityType: "application",
        entityId: assignment.applicationId,
      });
    }

    return updated;
  }

  static async cancel(ctx: AuthContext, assignmentId: string, reason: string) {
    if (
      !canAssignFieldInspections(ctx.roleCode) ||
      !hasPermission(ctx, PERMISSIONS.INSPECTIONS_FIELD_CANCEL)
    ) {
      throw new Error("Nuk keni leje të anuloni caktimin.");
    }

    const assignment = await db.fieldInspectionAssignment.findFirst({
      where: {
        id: assignmentId,
        status: {
          in: [FieldInspectionAssignmentStatus.SCHEDULED, FieldInspectionAssignmentStatus.IN_PROGRESS],
        },
      },
      include: {
        application: {
          select: {
            inspectorAssignmentLockedBy: true,
            fieldVerificationRequestedBy: true,
          },
        },
      },
    });
    if (!assignment) throw new Error("Caktimi nuk u gjet ose është përfunduar.");

    if (
      assignment.application &&
      isChiefLockedFieldVerification(assignment.application) &&
      ctx.roleCode !== ROLE_CODES.CHIEF_INSPECTOR &&
      ctx.roleCode !== ROLE_CODES.ADMIN
    ) {
      throw new Error(
        "Ky caktim u vendos nga kryeinspektori. Vetëm kryeinspektori mund ta anulojë.",
      );
    }

    const updated = await db.fieldInspectionAssignment.update({
      where: { id: assignmentId },
      data: {
        status: FieldInspectionAssignmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason.trim(),
      },
      include: assignmentInclude,
    });

    await NotificationService.create({
      userId: assignment.assigneeId,
      title: "Inspektimi në terren u anulua",
      body: reason.trim(),
      entityType: "field_inspection_assignment",
      entityId: assignmentId,
    });

    return updated;
  }

  static async lookupElevatorByRegistry(registryNumber: string) {
    return db.elevator.findFirst({
      where: { registryNumber: registryNumber.trim(), deletedAt: null },
      select: {
        id: true,
        registryNumber: true,
        buildingAddress: true,
        municipality: { select: { nameSq: true } },
      },
    });
  }
}
