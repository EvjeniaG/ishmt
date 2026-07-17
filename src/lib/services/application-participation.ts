import type { Prisma } from "@prisma/client";
import { ApplicationStatus } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { db } from "@/lib/db";

const TERMINAL_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.APPROVED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.ELEVATOR_CREATED,
  ApplicationStatus.ASSETS_GENERATED,
  ApplicationStatus.CLOSED,
  ApplicationStatus.CANCELLED,
  ApplicationStatus.EXPIRED,
];

export type ReviewQueueBucket = "needs_action" | "waiting" | "completed";

export function isTerminalApplicationStatus(status: ApplicationStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export async function upsertParticipation(
  tx: Prisma.TransactionClient,
  input: {
    applicationId: string;
    userId: string;
    roleCode: string;
    canAct?: boolean;
  },
) {
  const existing = await tx.applicationParticipation.findUnique({
    where: {
      applicationId_userId: {
        applicationId: input.applicationId,
        userId: input.userId,
      },
    },
  });

  if (existing) {
    return tx.applicationParticipation.update({
      where: { id: existing.id },
      data: {
        roleCode: input.roleCode,
        canAct: input.canAct ?? existing.canAct,
        leftAt: null,
      },
    });
  }

  return tx.applicationParticipation.create({
    data: {
      applicationId: input.applicationId,
      userId: input.userId,
      roleCode: input.roleCode,
      canAct: input.canAct ?? false,
    },
  });
}

export async function setActiveAssigneeParticipation(
  tx: Prisma.TransactionClient,
  input: {
    applicationId: string;
    userId: string;
    roleCode: string;
  },
) {
  await tx.applicationParticipation.updateMany({
    where: { applicationId: input.applicationId, canAct: true },
    data: { canAct: false },
  });

  await upsertParticipation(tx, {
    applicationId: input.applicationId,
    userId: input.userId,
    roleCode: input.roleCode,
    canAct: true,
  });
}

export async function addParticipants(
  tx: Prisma.TransactionClient,
  applicationId: string,
  participants: { userId: string; roleCode: string; canAct?: boolean }[],
) {
  for (const p of participants) {
    await upsertParticipation(tx, {
      applicationId,
      userId: p.userId,
      roleCode: p.roleCode,
      canAct: p.canAct ?? false,
    });
  }
}

export function buildParticipationQueueWhere(
  userId: string,
  bucket: ReviewQueueBucket,
): Prisma.ApplicationWhereInput {
  if (bucket === "completed") {
    return {
      participations: { some: { userId } },
      status: { in: TERMINAL_STATUSES },
    };
  }

  if (bucket === "needs_action") {
    return {
      participations: { some: { userId, canAct: true } },
      status: { notIn: TERMINAL_STATUSES },
    };
  }

  return {
    participations: { some: { userId, canAct: false, leftAt: null } },
    status: { notIn: TERMINAL_STATUSES },
    NOT: {
      participations: { some: { userId, canAct: true } },
    },
  };
}

export function fieldReviewProgress(assignments: { status: string }[]) {
  const active = assignments.filter((a) => a.status !== "REPLACED");
  const completed = active.filter((a) => a.status === "COMPLETED").length;
  return { completed, total: active.length };
}

const CHIEF_ASSIGNEE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.PENDING_CHIEF_INSPECTOR,
];

export async function hasIshmtApplicationParticipation(
  userId: string,
  roleCode: RoleCode,
  application: {
    id: string;
    status: ApplicationStatus;
    currentAssigneeId: string | null;
  },
): Promise<boolean> {
  if (roleCode === ROLE_CODES.ADMIN) return true;

  const participation = await db.applicationParticipation.findFirst({
    where: { applicationId: application.id, userId },
    select: { id: true },
  });
  if (participation) return true;

  if (
    roleCode === ROLE_CODES.CHIEF_INSPECTOR &&
    application.currentAssigneeId === userId &&
    CHIEF_ASSIGNEE_STATUSES.includes(application.status)
  ) {
    return true;
  }

  const fieldAssignment = await db.applicationFieldReviewAssignment.findFirst({
    where: {
      applicationId: application.id,
      inspectorId: userId,
      status: { not: "REPLACED" },
    },
    select: { id: true },
  });
  if (fieldAssignment) return true;

  return false;
}

export function currentPhaseLabel(status: ApplicationStatus): string {
  switch (status) {
    case ApplicationStatus.SUBMITTED:
      return "Në pritje të Kryeinspektorit";
    case ApplicationStatus.PENDING_DIRECTOR:
      return "Në pritje të Drejtorit";
    case ApplicationStatus.PENDING_SECTOR_HEAD:
      return "Në pritje të Përgjegjësit";
    case ApplicationStatus.PENDING_FIELD_REVIEW:
      return "Në shqyrtim nga inspektorët";
    case ApplicationStatus.PENDING_SECTOR_HEAD_REPORT:
      return "Në pritje të raportit të Përgjegjësit";
    case ApplicationStatus.PENDING_DIRECTOR_REPORT:
      return "Në pritje të raportit të Drejtorit";
    case ApplicationStatus.PENDING_CHIEF_INSPECTOR:
      return "Në pritje të vendimit të Kryeinspektorit";
    case ApplicationStatus.RETURNED_TO_INSPECTORS:
      return "Kthyer te inspektorët";
    case ApplicationStatus.RETURNED_TO_SECTOR_HEAD:
      return "Kthyer te Përgjegjësi";
    case ApplicationStatus.RETURNED_TO_DIRECTOR:
      return "Kthyer te Drejtori";
    case ApplicationStatus.APPROVED:
      return "I miratuar";
    case ApplicationStatus.ELEVATOR_CREATED:
    case ApplicationStatus.ASSETS_GENERATED:
    case ApplicationStatus.CLOSED:
      return "I regjistruar";
    case ApplicationStatus.REJECTED:
      return "I refuzuar";
    default:
      return status;
  }
}

