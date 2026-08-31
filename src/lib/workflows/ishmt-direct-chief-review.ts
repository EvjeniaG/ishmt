import { ApplicationStatus, ApplicationType, ReturnTargetRole } from "@prisma/client";
import { ROLE_CODES } from "@/lib/constants/roles";
import type { TransitionRule } from "@/lib/workflows/application-workflow";

/** Lifecycle aplikime që kryeinspektori miraton/refuzon direkt pa zinxhir hierarkik. */
export const ISHMT_DIRECT_CHIEF_REVIEW_TYPES: ApplicationType[] = [
  ApplicationType.DEREGISTRATION,
  ApplicationType.DATA_CORRECTION,
  ApplicationType.DATA_UPDATE,
];

export function usesDirectChiefReview(type: ApplicationType): boolean {
  return ISHMT_DIRECT_CHIEF_REVIEW_TYPES.includes(type);
}

export function chiefDecisionStatuses(type: ApplicationType): ApplicationStatus[] {
  if (usesDirectChiefReview(type)) {
    return [ApplicationStatus.SUBMITTED, ApplicationStatus.PENDING_CHIEF_INSPECTOR];
  }
  return [ApplicationStatus.PENDING_CHIEF_INSPECTOR];
}

export function ishmtDirectChiefReviewTransitions(type: ApplicationType): TransitionRule[] {
  const chiefFinal: TransitionRule[] = [
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.APPROVED,
      action: "APPROVE",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.REJECTED,
      action: "REJECT",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.RETURNED,
      action: "RETURN",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
      returnTarget: ReturnTargetRole.OWNER,
    },
  ];

  return [
    {
      applicationType: type,
      from: ApplicationStatus.SUBMITTED,
      to: ApplicationStatus.APPROVED,
      action: "APPROVE",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.SUBMITTED,
      to: ApplicationStatus.REJECTED,
      action: "REJECT",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.SUBMITTED,
      to: ApplicationStatus.RETURNED,
      action: "RETURN",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
      returnTarget: ReturnTargetRole.OWNER,
    },
    ...chiefFinal,
  ];
}
