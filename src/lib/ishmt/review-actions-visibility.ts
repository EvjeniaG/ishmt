import { ApplicationStatus } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import {
  canApproveApplications,
  canChiefHandleApplications,
  canDirectApplications,
  canReviewApplications,
  isFieldInspectorRole,
} from "@/lib/permissions/ishmt-roles";

export const CHIEF_REASSIGN_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.PENDING_DIRECTOR,
  ApplicationStatus.PENDING_SECTOR_HEAD,
  ApplicationStatus.PENDING_FIELD_REVIEW,
  ApplicationStatus.RETURNED_TO_INSPECTORS,
];

/** Kryeinspektori mund të ndryshojë inspektorët vetëm kur ka ende nevojë për veprim. */
export function chiefShowsInspectorReassignPanel(input: {
  status: ApplicationStatus;
  roleCode: string;
  inspectorAssignmentLockedBy?: string | null;
  plannedInspectorIds?: string[] | null;
}): boolean {
  const role = input.roleCode as RoleCode;
  if (!canChiefHandleApplications(role)) return false;
  if (!CHIEF_REASSIGN_STATUSES.includes(input.status)) return false;

  const chiefLockedInspectors =
    input.inspectorAssignmentLockedBy === ROLE_CODES.CHIEF_INSPECTOR &&
    (input.plannedInspectorIds?.length ?? 0) > 0;

  // Pas delegimit te drejtori me inspektorë të caktuar, hapi tjetër është te drejtori.
  if (input.status === ApplicationStatus.PENDING_DIRECTOR && chiefLockedInspectors) {
    return false;
  }

  return true;
}

/** Përputhet me IshmtReviewActions - a ka panel veprimesh në sidebar. */
export function ishmtReviewHasActionPanel(input: {
  status: ApplicationStatus;
  roleCode: string;
  myFieldReviewAssignmentId?: string | null;
  inspectorAssignmentLockedBy?: string | null;
  plannedInspectorIds?: string[] | null;
}): boolean {
  const role = input.roleCode as RoleCode;
  const { status } = input;

  if (canApproveApplications(role) && status === ApplicationStatus.PENDING_CHIEF_INSPECTOR) {
    return true;
  }

  if (canChiefHandleApplications(role) && status === ApplicationStatus.SUBMITTED) {
    return true;
  }

  if (
    chiefShowsInspectorReassignPanel({
      status,
      roleCode: input.roleCode,
      inspectorAssignmentLockedBy: input.inspectorAssignmentLockedBy,
      plannedInspectorIds: input.plannedInspectorIds,
    })
  ) {
    return true;
  }

  if (canDirectApplications(role)) {
    if (status === ApplicationStatus.PENDING_DIRECTOR) return true;
    if (status === ApplicationStatus.PENDING_DIRECTOR_REPORT) return true;
  }

  if (canReviewApplications(role)) {
    if (
      status === ApplicationStatus.PENDING_SECTOR_HEAD ||
      status === ApplicationStatus.RETURNED_TO_INSPECTORS
    ) {
      return true;
    }
    if (status === ApplicationStatus.PENDING_FIELD_REVIEW) return true;
    if (
      status === ApplicationStatus.PENDING_SECTOR_HEAD_REPORT ||
      status === ApplicationStatus.RETURNED_TO_SECTOR_HEAD
    ) {
      return true;
    }
  }

  if (
    isFieldInspectorRole(role) &&
    status === ApplicationStatus.PENDING_FIELD_REVIEW &&
    input.myFieldReviewAssignmentId
  ) {
    return true;
  }

  return false;
}
