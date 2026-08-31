import {
  FieldInspectionAssignmentStatus,
  InspectionResult,
  InspectionType,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { NotificationService } from "@/lib/services/notification-service";
import type { RoleCode } from "@/lib/constants/roles";
import { ROLE_CODES } from "@/lib/constants/roles";
import { roleLabelSq } from "@/lib/permissions/ishmt-roles";

export type ApplicationFieldVerificationStatus = {
  required: boolean;
  requestedBy: string | null;
  canApprove: boolean;
  requiredInspectorCount: number;
  completedCount: number;
  completedPassCount: number;
  assignments: {
    id: string;
    status: FieldInspectionAssignmentStatus;
    assigneeName: string;
    result: InspectionResult | null;
    conductedDate: Date | null;
    pendingAssignment?: boolean;
  }[];
};

function plannedInspectorIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export async function applyFieldVerificationRequest(
  tx: Prisma.TransactionClient,
  input: {
    applicationId: string;
    roleCode: RoleCode;
    requiresFieldVerification?: boolean;
  },
) {
  if (!input.requiresFieldVerification) return;

  const existing = await tx.application.findUnique({
    where: { id: input.applicationId },
    select: { fieldVerificationRequestedBy: true },
  });

  await tx.application.update({
    where: { id: input.applicationId },
    data: {
      requiresFieldVerification: true,
      fieldVerificationRequestedBy:
        existing?.fieldVerificationRequestedBy ?? input.roleCode,
    },
  });
}

/** Kush e kërkoi verifikimin — lexo nga gjurma e workflow kur fusha në DB është e vjetruar. */
export async function resolveFieldVerificationRequestedBy(
  applicationId: string,
  application: {
    fieldVerificationRequestedBy?: string | null;
    inspectorAssignmentLockedBy?: string | null;
  },
): Promise<string | null> {
  const chiefDelegation = await db.applicationWorkflowHistory.findFirst({
    where: {
      applicationId,
      action: "DELEGATE_TO_DIRECTOR",
    },
    orderBy: { createdAt: "asc" },
    select: { metadata: true },
  });

  const chiefMeta = chiefDelegation?.metadata as { requiresFieldVerification?: boolean } | null;
  if (chiefMeta?.requiresFieldVerification) {
    return ROLE_CODES.CHIEF_INSPECTOR;
  }

  if (application.inspectorAssignmentLockedBy === ROLE_CODES.CHIEF_INSPECTOR) {
    return ROLE_CODES.CHIEF_INSPECTOR;
  }

  return application.fieldVerificationRequestedBy ?? null;
}

export async function getApplicationFieldVerificationStatus(
  applicationId: string,
): Promise<ApplicationFieldVerificationStatus> {
  const application = await db.application.findFirst({
    where: { id: applicationId, deletedAt: null },
    select: {
      requiresFieldVerification: true,
      fieldVerificationRequestedBy: true,
      inspectorAssignmentLockedBy: true,
      plannedInspectorIds: true,
    },
  });

  if (!application?.requiresFieldVerification) {
    return {
      required: false,
      requestedBy: null,
      canApprove: true,
      requiredInspectorCount: 0,
      completedCount: 0,
      completedPassCount: 0,
      assignments: [],
    };
  }

  const requiredInspectorIds = plannedInspectorIds(application.plannedInspectorIds);

  const assignments = await db.fieldInspectionAssignment.findMany({
    where: {
      applicationId,
      status: { not: FieldInspectionAssignmentStatus.CANCELLED },
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const inspectorUsers =
    requiredInspectorIds.length > 0
      ? await db.authUser.findMany({
          where: { id: { in: requiredInspectorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

  const userById = new Map(inspectorUsers.map((user) => [user.id, user]));

  const displayAssignments =
    requiredInspectorIds.length > 0
      ? requiredInspectorIds.map((inspectorId) => {
          const forInspector = assignments.filter((a) => a.assigneeId === inspectorId);
          const active = forInspector.find(
            (a) =>
              a.status === FieldInspectionAssignmentStatus.SCHEDULED ||
              a.status === FieldInspectionAssignmentStatus.IN_PROGRESS,
          );
          const completed = forInspector.find(
            (a) => a.status === FieldInspectionAssignmentStatus.COMPLETED,
          );
          const chosen = active ?? completed;

          if (chosen) {
            return {
              id: chosen.id,
              status: chosen.status,
              assigneeName: `${chosen.assignee.firstName} ${chosen.assignee.lastName}`.trim(),
              result: chosen.verificationResult,
              conductedDate: chosen.conductedDate,
            };
          }

          const user = userById.get(inspectorId);
          return {
            id: `pending-${inspectorId}`,
            status: FieldInspectionAssignmentStatus.SCHEDULED,
            assigneeName: user
              ? `${user.firstName} ${user.lastName}`.trim()
              : "Inspektor",
            result: null,
            conductedDate: null,
            pendingAssignment: true,
          };
        })
      : assignments.map((a) => ({
          id: a.id,
          status: a.status,
          assigneeName: `${a.assignee.firstName} ${a.assignee.lastName}`.trim(),
          result: a.verificationResult,
          conductedDate: a.conductedDate,
        }));

  const completedCount =
    requiredInspectorIds.length > 0
      ? requiredInspectorIds.filter((inspectorId) =>
          assignments.some(
            (a) =>
              a.assigneeId === inspectorId &&
              a.status === FieldInspectionAssignmentStatus.COMPLETED,
          ),
        ).length
      : assignments.filter((a) => a.status === FieldInspectionAssignmentStatus.COMPLETED).length;

  const completedPassCount =
    requiredInspectorIds.length > 0
      ? requiredInspectorIds.filter((inspectorId) =>
          assignments.some(
            (a) =>
              a.assigneeId === inspectorId &&
              a.status === FieldInspectionAssignmentStatus.COMPLETED &&
              a.verificationResult === InspectionResult.PASS,
          ),
        ).length
      : assignments.filter(
          (a) =>
            a.status === FieldInspectionAssignmentStatus.COMPLETED &&
            a.verificationResult === InspectionResult.PASS,
        ).length;

  const canApprove =
    requiredInspectorIds.length > 0
      ? completedPassCount === requiredInspectorIds.length
      : assignments.length > 0 &&
        assignments.every(
          (a) =>
            a.status === FieldInspectionAssignmentStatus.COMPLETED &&
            a.verificationResult === InspectionResult.PASS,
        );

  return {
    required: true,
    requestedBy: await resolveFieldVerificationRequestedBy(applicationId, application),
    canApprove,
    requiredInspectorCount: requiredInspectorIds.length,
    completedCount,
    completedPassCount,
    assignments: displayAssignments,
  };
}

export async function assertFieldVerificationCompleteForApproval(applicationId: string) {
  const status = await getApplicationFieldVerificationStatus(applicationId);
  if (!status.required) return;

  if (status.requiredInspectorCount === 0) {
    throw new Error(
      "Aplikimi kërkon verifikim në terren, por nuk janë planifikuar ende inspektorët.",
    );
  }

  const pending = status.assignments.filter(
    (a) =>
      a.pendingAssignment ||
      a.status === FieldInspectionAssignmentStatus.SCHEDULED ||
      a.status === FieldInspectionAssignmentStatus.IN_PROGRESS,
  );
  if (pending.length > 0) {
    throw new Error(
      `Verifikimi në terren nuk është përfunduar nga të gjithë inspektorët (${status.completedCount}/${status.requiredInspectorCount}).`,
    );
  }

  if (!status.canApprove) {
    throw new Error(
      "Verifikimi në terren nuk ka rezultat konform nga të gjithë inspektorët. Përdorni kthimin e aplikimit për korrigjim.",
    );
  }
}

async function ensureApplicationFieldVerificationAssignmentForInspector(
  tx: Prisma.TransactionClient,
  input: {
    applicationId: string;
    assigneeId: string;
    assignedById: string;
    instructions?: string;
    applicationNumber: string;
    elevatorId: string | null;
    location: string;
  },
): Promise<{ assignment: Awaited<ReturnType<typeof tx.fieldInspectionAssignment.create>>; isNew: boolean }> {
  const existingActive = await tx.fieldInspectionAssignment.findFirst({
    where: {
      applicationId: input.applicationId,
      assigneeId: input.assigneeId,
      status: {
        in: [
          FieldInspectionAssignmentStatus.SCHEDULED,
          FieldInspectionAssignmentStatus.IN_PROGRESS,
          FieldInspectionAssignmentStatus.COMPLETED,
        ],
      },
    },
  });

  if (existingActive) {
    return { assignment: existingActive, isNew: false };
  }

  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 3);

  const assignment = await tx.fieldInspectionAssignment.create({
    data: {
      applicationId: input.applicationId,
      elevatorId: input.elevatorId,
      assigneeId: input.assigneeId,
      assignedById: input.assignedById,
      scheduledDate,
      instructions:
        input.instructions?.trim() ||
        `Verifikim në terren për Aplikimin për Registrim ${input.applicationNumber} - ${input.location}.`,
    },
  });

  return { assignment, isNew: true };
}

/** Një caktim verifikimi për çdo inspektor të planifikuar. */
export async function syncApplicationFieldVerificationAssignments(
  tx: Prisma.TransactionClient,
  input: {
    applicationId: string;
    assigneeIds: string[];
    assignedById: string;
    instructions?: string;
  },
) {
  const application = await tx.application.findFirst({
    where: { id: input.applicationId, deletedAt: null },
    select: {
      id: true,
      applicationNumber: true,
      requiresFieldVerification: true,
      elevatorId: true,
      data: { select: { buildingAddress: true, municipality: { select: { nameSq: true } } } },
    },
  });

  if (!application?.requiresFieldVerification) return { assignments: [], created: [] };

  const assigneeIds = [...new Set(input.assigneeIds.filter(Boolean))];
  if (assigneeIds.length === 0) return { assignments: [], created: [] };

  const location =
    application.data?.buildingAddress ??
    application.data?.municipality?.nameSq ??
    "vendndodhja e aplikimit";

  await tx.fieldInspectionAssignment.updateMany({
    where: {
      applicationId: input.applicationId,
      assigneeId: { notIn: assigneeIds },
      status: {
        in: [
          FieldInspectionAssignmentStatus.SCHEDULED,
          FieldInspectionAssignmentStatus.IN_PROGRESS,
        ],
      },
    },
    data: {
      status: FieldInspectionAssignmentStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: "Ri-caktim inspektorëve të verifikimit në terren",
    },
  });

  const results = [];
  for (const assigneeId of assigneeIds) {
    results.push(
      await ensureApplicationFieldVerificationAssignmentForInspector(tx, {
        applicationId: input.applicationId,
        assigneeId,
        assignedById: input.assignedById,
        instructions: input.instructions,
        applicationNumber: application.applicationNumber,
        elevatorId: application.elevatorId,
        location,
      }),
    );
  }

  return {
    assignments: results.map((result) => result.assignment),
    created: results.filter((result) => result.isNew).map((result) => result.assignment),
  };
}

/** @deprecated Përdor syncApplicationFieldVerificationAssignments */
export async function ensureApplicationFieldVerificationAssignments(
  tx: Prisma.TransactionClient,
  input: {
    applicationId: string;
    assigneeId: string;
    assignedById: string;
    instructions?: string;
  },
) {
  const result = await syncApplicationFieldVerificationAssignments(tx, {
    applicationId: input.applicationId,
    assigneeIds: [input.assigneeId],
    assignedById: input.assignedById,
    instructions: input.instructions,
  });
  return result.assignments[0] ?? null;
}

/** Krijon caktimet e terrenit sapo kërkohet verifikimi dhe dihen inspektorët. */
export async function syncFieldVerificationAssignmentIfReady(
  tx: Prisma.TransactionClient,
  input: {
    applicationId: string;
    assigneeIds?: string[];
    assignedById: string;
    instructions?: string;
  },
) {
  const application = await tx.application.findFirst({
    where: { id: input.applicationId, deletedAt: null },
    select: { requiresFieldVerification: true },
  });

  if (!application?.requiresFieldVerification || !input.assigneeIds?.length) {
    return { assignments: [], created: [] };
  }

  return syncApplicationFieldVerificationAssignments(tx, {
    applicationId: input.applicationId,
    assigneeIds: input.assigneeIds,
    assignedById: input.assignedById,
    instructions: input.instructions,
  });
}

export async function notifyFieldVerificationAssignment(
  assignmentId: string,
  assigneeId: string,
  applicationNumber: string,
  scheduledDate: Date,
) {
  await NotificationService.create({
    userId: assigneeId,
    title: "Verifikim në terren - Aplikim për Registrim",
    body: `Ju është caktuar verifikim në terren për ${applicationNumber} (afati: ${scheduledDate.toLocaleDateString("sq-AL")}).`,
    entityType: "field_inspection_assignment",
    entityId: assignmentId,
  });
}

export function fieldVerificationRequestedByLabel(roleCode: string | null) {
  if (!roleCode) return null;
  return roleLabelSq(roleCode as RoleCode);
}

export function isChiefLockedFieldVerification(application: {
  inspectorAssignmentLockedBy?: string | null;
  fieldVerificationRequestedBy?: string | null;
}): boolean {
  return (
    application.fieldVerificationRequestedBy === ROLE_CODES.CHIEF_INSPECTOR ||
    application.inspectorAssignmentLockedBy === ROLE_CODES.CHIEF_INSPECTOR
  );
}

export async function resolveChiefFieldVerificationAssignerId(
  tx: Prisma.TransactionClient,
  applicationId: string,
): Promise<string | null> {
  const history = await tx.applicationWorkflowHistory.findFirst({
    where: { applicationId, action: "DELEGATE_TO_DIRECTOR" },
    orderBy: { createdAt: "desc" },
    select: { actorId: true },
  });
  return history?.actorId ?? null;
}

export async function completeApplicationFieldVerification(
  tx: Prisma.TransactionClient,
  assignment: {
    id: string;
    applicationId: string | null;
    elevatorId: string | null;
    assigneeId: string;
    scheduledDate: Date;
  },
  input: {
    conductedDate: Date;
    result: InspectionResult;
    findings?: string | null;
    reportDocumentId?: string | null;
  },
) {
  if (assignment.elevatorId) {
    const inspection = await tx.inspection.create({
      data: {
        elevatorId: assignment.elevatorId,
        inspectorId: assignment.assigneeId,
        type: InspectionType.EXTRAORDINARY,
        status: input.result,
        scheduledDate: assignment.scheduledDate,
        conductedDate: input.conductedDate,
        result: input.result,
        findings: input.findings?.trim() || null,
        reportDocumentId: input.reportDocumentId ?? null,
      },
    });

    return tx.fieldInspectionAssignment.update({
      where: { id: assignment.id },
      data: {
        status: FieldInspectionAssignmentStatus.COMPLETED,
        inspectionId: inspection.id,
        verificationResult: input.result,
        verificationFindings: input.findings?.trim() || null,
        reportDocumentId: input.reportDocumentId ?? null,
        conductedDate: input.conductedDate,
      },
    });
  }

  return tx.fieldInspectionAssignment.update({
    where: { id: assignment.id },
    data: {
      status: FieldInspectionAssignmentStatus.COMPLETED,
      verificationResult: input.result,
      verificationFindings: input.findings?.trim() || null,
      reportDocumentId: input.reportDocumentId ?? null,
      conductedDate: input.conductedDate,
    },
  });
}
