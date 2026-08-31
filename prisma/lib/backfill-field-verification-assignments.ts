import type { PrismaClient, Prisma } from "@prisma/client";
import { FieldInspectionAssignmentStatus } from "@prisma/client";
import {
  syncApplicationFieldVerificationAssignments,
  resolveChiefFieldVerificationAssignerId,
} from "../../src/lib/services/application-field-verification";
import { ROLE_CODES } from "../../src/lib/constants/roles";

function plannedInspectorIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

async function resolveAssignedById(
  tx: Prisma.TransactionClient,
  applicationId: string,
  application: {
    fieldVerificationRequestedBy: string | null;
    inspectorAssignmentLockedBy: string | null;
  },
  fallbackId: string,
) {
  if (
    application.fieldVerificationRequestedBy === ROLE_CODES.CHIEF_INSPECTOR ||
    application.inspectorAssignmentLockedBy === ROLE_CODES.CHIEF_INSPECTOR
  ) {
    return (await resolveChiefFieldVerificationAssignerId(tx, applicationId)) ?? fallbackId;
  }

  const assignHistory = await tx.applicationWorkflowHistory.findFirst({
    where: { applicationId, action: "ASSIGN_FIELD_INSPECTORS" },
    orderBy: { createdAt: "desc" },
    select: { actorId: true },
  });
  if (assignHistory?.actorId) return assignHistory.actorId;

  const delegateHistory = await tx.applicationWorkflowHistory.findFirst({
    where: { applicationId, action: "DELEGATE_TO_DIRECTOR" },
    orderBy: { createdAt: "desc" },
    select: { actorId: true },
  });
  return delegateHistory?.actorId ?? fallbackId;
}

export async function backfillFieldVerificationAssignments(prisma: PrismaClient) {
  const applications = await prisma.application.findMany({
    where: {
      deletedAt: null,
      requiresFieldVerification: true,
    },
    select: {
      id: true,
      applicationNumber: true,
      plannedInspectorIds: true,
      fieldVerificationRequestedBy: true,
      inspectorAssignmentLockedBy: true,
    },
  });

  let created = 0;
  let skipped = 0;

  for (const application of applications) {
    const inspectorIds = plannedInspectorIds(application.plannedInspectorIds);
    if (inspectorIds.length === 0) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.fieldInspectionAssignment.findMany({
      where: {
        applicationId: application.id,
        assigneeId: { in: inspectorIds },
        status: {
          in: [
            FieldInspectionAssignmentStatus.SCHEDULED,
            FieldInspectionAssignmentStatus.IN_PROGRESS,
            FieldInspectionAssignmentStatus.COMPLETED,
          ],
        },
      },
      select: { assigneeId: true },
    });

    const existingAssignees = new Set(existing.map((row) => row.assigneeId));
    const missingAssignees = inspectorIds.filter((id) => !existingAssignees.has(id));

    if (missingAssignees.length === 0) {
      skipped += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const assignedById = await resolveAssignedById(
        tx,
        application.id,
        application,
        inspectorIds[0]!,
      );

      await syncApplicationFieldVerificationAssignments(tx, {
        applicationId: application.id,
        assigneeIds: inspectorIds,
        assignedById,
      });
    });

    created += 1;
    console.log(
      `  ✓ ${application.applicationNumber} → ${missingAssignees.length} inspektor(ë) u harmonizuan`,
    );
  }

  return { created, skipped, scanned: applications.length };
}
