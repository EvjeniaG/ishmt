import {
  FieldInspectionAssignmentStatus,
  InspectionResult,
  InspectionType,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { NotificationService } from "@/lib/services/notification-service";
import type { RoleCode } from "@/lib/constants/roles";
import { roleLabelSq } from "@/lib/permissions/ishmt-roles";

export type ApplicationFieldVerificationStatus = {
  required: boolean;
  requestedBy: string | null;
  canApprove: boolean;
  assignments: {
    id: string;
    status: FieldInspectionAssignmentStatus;
    assigneeName: string;
    result: InspectionResult | null;
    conductedDate: Date | null;
  }[];
};

export async function applyFieldVerificationRequest(
  tx: Prisma.TransactionClient,
  input: {
    applicationId: string;
    roleCode: RoleCode;
    requiresFieldVerification?: boolean;
  },
) {
  if (!input.requiresFieldVerification) return;

  await tx.application.update({
    where: { id: input.applicationId },
    data: {
      requiresFieldVerification: true,
      fieldVerificationRequestedBy: input.roleCode,
    },
  });
}

export async function getApplicationFieldVerificationStatus(
  applicationId: string,
): Promise<ApplicationFieldVerificationStatus> {
  const application = await db.application.findFirst({
    where: { id: applicationId, deletedAt: null },
    select: { requiresFieldVerification: true, fieldVerificationRequestedBy: true },
  });

  if (!application?.requiresFieldVerification) {
    return {
      required: false,
      requestedBy: null,
      canApprove: true,
      assignments: [],
    };
  }

  const assignments = await db.fieldInspectionAssignment.findMany({
    where: {
      applicationId,
      status: { not: FieldInspectionAssignmentStatus.CANCELLED },
    },
    include: {
      assignee: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const hasPass = assignments.some(
    (a) =>
      a.status === FieldInspectionAssignmentStatus.COMPLETED &&
      a.verificationResult === InspectionResult.PASS,
  );

  return {
    required: true,
    requestedBy: application.fieldVerificationRequestedBy,
    canApprove: hasPass,
    assignments: assignments.map((a) => ({
      id: a.id,
      status: a.status,
      assigneeName: `${a.assignee.firstName} ${a.assignee.lastName}`.trim(),
      result: a.verificationResult,
      conductedDate: a.conductedDate,
    })),
  };
}

export async function assertFieldVerificationCompleteForApproval(applicationId: string) {
  const status = await getApplicationFieldVerificationStatus(applicationId);
  if (!status.required) return;

  if (status.assignments.length === 0) {
    throw new Error(
      "Aplikimi kërkon verifikim në terren, por nuk është caktuar ende inspektori i terrenit.",
    );
  }

  const pending = status.assignments.filter(
    (a) => a.status !== FieldInspectionAssignmentStatus.COMPLETED,
  );
  if (pending.length > 0) {
    throw new Error(
      "Verifikimi në terren nuk është përfunduar ende. Inspektori duhet të dorëzojë raportin e verifikimit.",
    );
  }

  const passed = status.assignments.some((a) => a.result === InspectionResult.PASS);
  if (!passed) {
    throw new Error(
      "Verifikimi në terren nuk ka rezultat pozitiv (PASS). Miratimi nuk lejohet.",
    );
  }
}

export async function ensureApplicationFieldVerificationAssignments(
  tx: Prisma.TransactionClient,
  input: {
    applicationId: string;
    assigneeId: string;
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

  if (!application?.requiresFieldVerification) return null;

  const existing = await tx.fieldInspectionAssignment.findFirst({
    where: {
      applicationId: input.applicationId,
      status: {
        in: [
          FieldInspectionAssignmentStatus.SCHEDULED,
          FieldInspectionAssignmentStatus.IN_PROGRESS,
        ],
      },
    },
  });
  if (existing) return existing;

  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + 3);

  const location =
    application.data?.buildingAddress ??
    application.data?.municipality?.nameSq ??
    "vendndodhja e aplikimit";

  const assignment = await tx.fieldInspectionAssignment.create({
    data: {
      applicationId: input.applicationId,
      elevatorId: application.elevatorId,
      assigneeId: input.assigneeId,
      assignedById: input.assignedById,
      scheduledDate,
      instructions:
        input.instructions?.trim() ||
        `Verifikim në terren për Aplikimin për Registrim ${application.applicationNumber} — ${location}.`,
    },
  });

  return assignment;
}

export async function notifyFieldVerificationAssignment(
  assignmentId: string,
  assigneeId: string,
  applicationNumber: string,
  scheduledDate: Date,
) {
  await NotificationService.create({
    userId: assigneeId,
    title: "Verifikim në terren — Aplikim për Registrim",
    body: `Ju është caktuar verifikim në terren për ${applicationNumber} (afati: ${scheduledDate.toLocaleDateString("sq-AL")}).`,
    entityType: "field_inspection_assignment",
    entityId: assignmentId,
  });
}

export function fieldVerificationRequestedByLabel(roleCode: string | null) {
  if (!roleCode) return null;
  return roleLabelSq(roleCode as RoleCode);
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
