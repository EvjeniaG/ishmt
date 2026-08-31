import { ApplicationStatus, ApplicationType, ReturnTargetRole } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { roleMatchesTransition } from "@/lib/permissions/ishmt-roles";
import {
  ISHMT_DIRECT_CHIEF_REVIEW_TYPES,
  ishmtDirectChiefReviewTransitions,
} from "@/lib/workflows/ishmt-direct-chief-review";

export type WorkflowAction =
  | "SAVE_BASIC_DATA"
  | "ASSIGN_INSTALLER"
  | "ACCEPT_DELEGATION"
  | "REJECT_DELEGATION"
  | "REVOKE_INSTALLER_DELEGATION"
  | "REVOKE_CERTIFIER_DELEGATION"
  | "START_TECHNICAL_DATA"
  | "COMPLETE_INSTALLER"
  | "ASSIGN_CERTIFIER"
  | "ACCEPT_CERTIFIER"
  | "START_CERTIFICATION"
  | "COMPLETE_CERTIFIER"
  | "SUBMIT"
  | "DELEGATE_TO_DIRECTOR"
  | "DELEGATE_TO_SECTOR_HEAD"
  | "ASSIGN_FIELD_INSPECTORS"
  | "SUBMIT_FIELD_REPORT"
  | "ALL_FIELD_REPORTS_COMPLETE"
  | "FORWARD_TO_DIRECTOR"
  | "FORWARD_TO_CHIEF"
  | "RETURN_TO_INSPECTORS"
  | "RETURN_TO_SECTOR_HEAD"
  | "RETURN_TO_DIRECTOR"
  | "APPROVE"
  | "REJECT"
  | "RETURN"
  | "CANCEL"
  | "OWNER_RETURN"
  | "ELEVATOR_CREATED"
  | "ASSETS_GENERATED"
  | "CLOSE";

export type ReviewLevel = "CHIEF" | "DIRECTOR" | "SECTOR_HEAD" | "FIELD_INSPECTOR";

export type TransitionRule = {
  applicationType: ApplicationType;
  from: ApplicationStatus;
  to: ApplicationStatus;
  action: WorkflowAction;
  roles: RoleCode[];
  /** When action is RETURN, inspector must specify target */
  returnTarget?: ReturnTargetRole;
};

export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: "UNSUPPORTED_TRANSITION" | "UNSUPPORTED_TYPE" | "NOT_IMPLEMENTED",
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

const ISHMT_HIERARCHICAL_REVIEW_TYPES: ApplicationType[] = [
  ApplicationType.NEW_REGISTRATION,
  ApplicationType.MODERNIZATION,
];

/** Zinxhir hierarkik: Kryeinspektor → Drejtor → Përgjegjës → Inspektor(ët) → lart me raporte */
function ishmtHierarchicalReviewTransitions(type: ApplicationType): TransitionRule[] {
  return [
    {
      applicationType: type,
      from: ApplicationStatus.SUBMITTED,
      to: ApplicationStatus.PENDING_DIRECTOR,
      action: "DELEGATE_TO_DIRECTOR",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_DIRECTOR,
      to: ApplicationStatus.PENDING_SECTOR_HEAD,
      action: "DELEGATE_TO_SECTOR_HEAD",
      roles: [ROLE_CODES.ISHMT_DIRECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_SECTOR_HEAD,
      to: ApplicationStatus.PENDING_FIELD_REVIEW,
      action: "ASSIGN_FIELD_INSPECTORS",
      roles: [ROLE_CODES.SECTOR_HEAD],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_FIELD_REVIEW,
      to: ApplicationStatus.PENDING_FIELD_REVIEW,
      action: "SUBMIT_FIELD_REPORT",
      roles: [ROLE_CODES.FIELD_INSPECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_FIELD_REVIEW,
      to: ApplicationStatus.PENDING_SECTOR_HEAD_REPORT,
      action: "ALL_FIELD_REPORTS_COMPLETE",
      roles: [ROLE_CODES.SECTOR_HEAD],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_SECTOR_HEAD_REPORT,
      to: ApplicationStatus.PENDING_DIRECTOR_REPORT,
      action: "FORWARD_TO_DIRECTOR",
      roles: [ROLE_CODES.SECTOR_HEAD],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_FIELD_REVIEW,
      to: ApplicationStatus.PENDING_DIRECTOR_REPORT,
      action: "FORWARD_TO_DIRECTOR",
      roles: [ROLE_CODES.SECTOR_HEAD],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_DIRECTOR_REPORT,
      to: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      action: "FORWARD_TO_CHIEF",
      roles: [ROLE_CODES.ISHMT_DIRECTOR],
    },
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
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.RETURNED_TO_INSPECTORS,
      action: "RETURN_TO_INSPECTORS",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.RETURNED_TO_SECTOR_HEAD,
      action: "RETURN_TO_SECTOR_HEAD",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.RETURNED_TO_DIRECTOR,
      action: "RETURN_TO_DIRECTOR",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
    },
    {
      applicationType: type,
      from: ApplicationStatus.RETURNED_TO_INSPECTORS,
      to: ApplicationStatus.PENDING_FIELD_REVIEW,
      action: "ASSIGN_FIELD_INSPECTORS",
      roles: [ROLE_CODES.SECTOR_HEAD],
    },
    {
      applicationType: type,
      from: ApplicationStatus.RETURNED_TO_SECTOR_HEAD,
      to: ApplicationStatus.PENDING_SECTOR_HEAD_REPORT,
      action: "FORWARD_TO_DIRECTOR",
      roles: [ROLE_CODES.SECTOR_HEAD],
    },
    {
      applicationType: type,
      from: ApplicationStatus.RETURNED_TO_DIRECTOR,
      to: ApplicationStatus.PENDING_DIRECTOR_REPORT,
      action: "FORWARD_TO_CHIEF",
      roles: [ROLE_CODES.ISHMT_DIRECTOR],
    },
  ];
}

function ishmtRegistrationChiefReturnTransitions(): TransitionRule[] {
  return [
    {
      applicationType: ApplicationType.NEW_REGISTRATION,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.RETURNED,
      action: "RETURN",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
      returnTarget: ReturnTargetRole.INSTALLER,
    },
    {
      applicationType: ApplicationType.NEW_REGISTRATION,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.RETURNED,
      action: "RETURN",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
      returnTarget: ReturnTargetRole.CERTIFIER,
    },
  ];
}

function ishmtModernizationChiefReturnTransitions(): TransitionRule[] {
  return [
    {
      applicationType: ApplicationType.MODERNIZATION,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.RETURNED,
      action: "RETURN",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
      returnTarget: ReturnTargetRole.INSTALLER,
    },
    {
      applicationType: ApplicationType.MODERNIZATION,
      from: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
      to: ApplicationStatus.RETURNED,
      action: "RETURN",
      roles: [ROLE_CODES.CHIEF_INSPECTOR],
      returnTarget: ReturnTargetRole.CERTIFIER,
    },
  ];
}

const REGISTRATION_TRANSITIONS: TransitionRule[] = [
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.DRAFT, to: ApplicationStatus.BASIC_DATA_COMPLETED, action: "SAVE_BASIC_DATA", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.RETURNED, to: ApplicationStatus.BASIC_DATA_COMPLETED, action: "SAVE_BASIC_DATA", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.BASIC_DATA_COMPLETED, to: ApplicationStatus.INSTALLER_INVITED, action: "ASSIGN_INSTALLER", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.DRAFT, to: ApplicationStatus.CANCELLED, action: "CANCEL", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.BASIC_DATA_COMPLETED, to: ApplicationStatus.CANCELLED, action: "CANCEL", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.INSTALLER_INVITED, to: ApplicationStatus.INSTALLER_ACCEPTED, action: "ACCEPT_DELEGATION", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.PENDING_INSTALLER, to: ApplicationStatus.INSTALLER_ACCEPTED, action: "ACCEPT_DELEGATION", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.INSTALLER_INVITED, to: ApplicationStatus.BASIC_DATA_COMPLETED, action: "REJECT_DELEGATION", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.PENDING_INSTALLER, to: ApplicationStatus.BASIC_DATA_COMPLETED, action: "REVOKE_INSTALLER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.INSTALLER_INVITED, to: ApplicationStatus.BASIC_DATA_COMPLETED, action: "REVOKE_INSTALLER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.INSTALLER_ACCEPTED, to: ApplicationStatus.BASIC_DATA_COMPLETED, action: "REVOKE_INSTALLER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS, to: ApplicationStatus.BASIC_DATA_COMPLETED, action: "REVOKE_INSTALLER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.RETURNED, to: ApplicationStatus.BASIC_DATA_COMPLETED, action: "REVOKE_INSTALLER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.INSTALLER_ACCEPTED, to: ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS, action: "START_TECHNICAL_DATA", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "COMPLETE_INSTALLER", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.INSTALLER_ACCEPTED, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "COMPLETE_INSTALLER", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.PENDING_INSTALLER, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "COMPLETE_INSTALLER", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.INSTALLER_COMPLETED, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "COMPLETE_INSTALLER", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.TECHNICAL_DATA_COMPLETED, to: ApplicationStatus.CERTIFIER_INVITED, action: "ASSIGN_CERTIFIER", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.INSTALLER_COMPLETED, to: ApplicationStatus.CERTIFIER_INVITED, action: "ASSIGN_CERTIFIER", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.CERTIFIER_INVITED, to: ApplicationStatus.CERTIFIER_ACCEPTED, action: "ACCEPT_CERTIFIER", roles: [ROLE_CODES.CERTIFIER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.PENDING_CERTIFIER, to: ApplicationStatus.CERTIFIER_ACCEPTED, action: "ACCEPT_CERTIFIER", roles: [ROLE_CODES.CERTIFIER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.CERTIFIER_INVITED, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "REJECT_DELEGATION", roles: [ROLE_CODES.CERTIFIER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.PENDING_CERTIFIER, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "REVOKE_CERTIFIER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.CERTIFIER_INVITED, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "REVOKE_CERTIFIER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.CERTIFIER_ACCEPTED, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "REVOKE_CERTIFIER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.CERTIFICATION_IN_PROGRESS, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "REVOKE_CERTIFIER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.RETURNED, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "REVOKE_CERTIFIER_DELEGATION", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.CERTIFIER_ACCEPTED, to: ApplicationStatus.CERTIFICATION_IN_PROGRESS, action: "START_CERTIFICATION", roles: [ROLE_CODES.CERTIFIER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.CERTIFICATION_IN_PROGRESS, to: ApplicationStatus.CERTIFICATION_COMPLETED, action: "COMPLETE_CERTIFIER", roles: [ROLE_CODES.CERTIFIER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.CERTIFIER_ACCEPTED, to: ApplicationStatus.CERTIFICATION_COMPLETED, action: "COMPLETE_CERTIFIER", roles: [ROLE_CODES.CERTIFIER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.PENDING_CERTIFIER, to: ApplicationStatus.CERTIFICATION_COMPLETED, action: "COMPLETE_CERTIFIER", roles: [ROLE_CODES.CERTIFIER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.CERTIFICATION_COMPLETED, to: ApplicationStatus.SUBMITTED, action: "SUBMIT", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.PENDING_OWNER_SUBMISSION, to: ApplicationStatus.SUBMITTED, action: "SUBMIT", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.RETURNED, to: ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS, action: "START_TECHNICAL_DATA", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.RETURNED, to: ApplicationStatus.TECHNICAL_DATA_COMPLETED, action: "COMPLETE_INSTALLER", roles: [ROLE_CODES.INSTALLER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.RETURNED, to: ApplicationStatus.CERTIFICATION_IN_PROGRESS, action: "START_CERTIFICATION", roles: [ROLE_CODES.CERTIFIER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.RETURNED, to: ApplicationStatus.CERTIFICATION_COMPLETED, action: "COMPLETE_CERTIFIER", roles: [ROLE_CODES.CERTIFIER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.RETURNED, to: ApplicationStatus.SUBMITTED, action: "SUBMIT", roles: [ROLE_CODES.OWNER] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.APPROVED, to: ApplicationStatus.ELEVATOR_CREATED, action: "ELEVATOR_CREATED", roles: [ROLE_CODES.INSPECTOR] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.ELEVATOR_CREATED, to: ApplicationStatus.ASSETS_GENERATED, action: "ASSETS_GENERATED", roles: [ROLE_CODES.INSPECTOR] },
  { applicationType: ApplicationType.NEW_REGISTRATION, from: ApplicationStatus.ASSETS_GENERATED, to: ApplicationStatus.CLOSED, action: "CLOSE", roles: [ROLE_CODES.INSPECTOR] },
];

function ownerSubmitTransitions(type: ApplicationType): TransitionRule[] {
  return [
    {
      applicationType: type,
      from: ApplicationStatus.DRAFT,
      to: ApplicationStatus.SUBMITTED,
      action: "SUBMIT",
      roles: [ROLE_CODES.OWNER],
    },
    {
      applicationType: type,
      from: ApplicationStatus.DRAFT,
      to: ApplicationStatus.CANCELLED,
      action: "CANCEL",
      roles: [ROLE_CODES.OWNER],
    },
  ];
}

const MODERNIZATION_TRANSITIONS: TransitionRule[] = [
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.DRAFT,
    to: ApplicationStatus.CANCELLED,
    action: "CANCEL",
    roles: [ROLE_CODES.OWNER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.DRAFT,
    to: ApplicationStatus.PENDING_INSTALLER,
    action: "ASSIGN_INSTALLER",
    roles: [ROLE_CODES.OWNER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.PENDING_INSTALLER,
    to: ApplicationStatus.INSTALLER_COMPLETED,
    action: "COMPLETE_INSTALLER",
    roles: [ROLE_CODES.INSTALLER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.RETURNED,
    to: ApplicationStatus.INSTALLER_COMPLETED,
    action: "COMPLETE_INSTALLER",
    roles: [ROLE_CODES.INSTALLER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.INSTALLER_COMPLETED,
    to: ApplicationStatus.PENDING_CERTIFIER,
    action: "ASSIGN_CERTIFIER",
    roles: [ROLE_CODES.OWNER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.PENDING_CERTIFIER,
    to: ApplicationStatus.PENDING_OWNER_SUBMISSION,
    action: "COMPLETE_CERTIFIER",
    roles: [ROLE_CODES.CERTIFIER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.RETURNED,
    to: ApplicationStatus.PENDING_OWNER_SUBMISSION,
    action: "COMPLETE_CERTIFIER",
    roles: [ROLE_CODES.CERTIFIER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.PENDING_INSTALLER,
    to: ApplicationStatus.DRAFT,
    action: "REVOKE_INSTALLER_DELEGATION",
    roles: [ROLE_CODES.OWNER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.PENDING_CERTIFIER,
    to: ApplicationStatus.INSTALLER_COMPLETED,
    action: "REVOKE_CERTIFIER_DELEGATION",
    roles: [ROLE_CODES.OWNER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.PENDING_OWNER_SUBMISSION,
    to: ApplicationStatus.SUBMITTED,
    action: "SUBMIT",
    roles: [ROLE_CODES.OWNER],
  },
  {
    applicationType: ApplicationType.MODERNIZATION,
    from: ApplicationStatus.RETURNED,
    to: ApplicationStatus.SUBMITTED,
    action: "SUBMIT",
    roles: [ROLE_CODES.OWNER],
  },
];

function lifecycleSubmitTransitions(type: ApplicationType): TransitionRule[] {
  return [
    ...ownerSubmitTransitions(type),
    {
      applicationType: type,
      from: ApplicationStatus.RETURNED,
      to: ApplicationStatus.SUBMITTED,
      action: "SUBMIT",
      roles: [ROLE_CODES.OWNER],
    },
  ];
}

export const APPLICATION_TRANSITIONS: TransitionRule[] = [
  ...REGISTRATION_TRANSITIONS,
  ...lifecycleSubmitTransitions(ApplicationType.DEREGISTRATION),
  ...lifecycleSubmitTransitions(ApplicationType.DATA_CORRECTION),
  ...lifecycleSubmitTransitions(ApplicationType.DATA_UPDATE),
  ...MODERNIZATION_TRANSITIONS,
  ...ISHMT_HIERARCHICAL_REVIEW_TYPES.flatMap((t) => ishmtHierarchicalReviewTransitions(t)),
  ...ISHMT_DIRECT_CHIEF_REVIEW_TYPES.flatMap((t) => ishmtDirectChiefReviewTransitions(t)),
  ...ishmtRegistrationChiefReturnTransitions(),
  ...ishmtModernizationChiefReturnTransitions(),
];

/** Application types whose APPROVE side-effects are not yet implemented */
export const APPROVAL_NOT_IMPLEMENTED_TYPES: ApplicationType[] = [];

export function getTransitionsForType(type: ApplicationType): TransitionRule[] {
  return APPLICATION_TRANSITIONS.filter((t) => t.applicationType === type);
}

export function isActionSupported(type: ApplicationType, action: WorkflowAction): boolean {
  return getTransitionsForType(type).some((t) => t.action === action);
}

export function findTransition(
  type: ApplicationType,
  from: ApplicationStatus,
  action: WorkflowAction,
  roleCode: RoleCode,
  options?: { returnTarget?: ReturnTargetRole },
): TransitionRule | undefined {
  return getTransitionsForType(type).find((t) => {
    if (t.from !== from || t.action !== action || !roleMatchesTransition(roleCode, t.roles)) {
      return false;
    }
    if (action === "RETURN" && t.returnTarget && options?.returnTarget) {
      return t.returnTarget === options.returnTarget;
    }
    if (action === "RETURN" && t.returnTarget && !options?.returnTarget) {
      return false;
    }
    return true;
  });
}

export function assertTransition(
  type: ApplicationType,
  from: ApplicationStatus,
  action: WorkflowAction,
  roleCode: RoleCode,
  options?: { returnTarget?: ReturnTargetRole },
): ApplicationStatus {
  if (!getTransitionsForType(type).length) {
    throw new WorkflowError(`Lloji i aplikimit '${type}' nuk mbështetet.`, "UNSUPPORTED_TYPE");
  }

  const rule = findTransition(type, from, action, roleCode, options);

  if (!rule) {
    throw new WorkflowError(
      `Tranzicioni '${action}' nuk lejohet për '${type}' nga statusi '${from}' (roli: ${roleCode}).`,
      "UNSUPPORTED_TRANSITION",
    );
  }

  if (action === "APPROVE" && APPROVAL_NOT_IMPLEMENTED_TYPES.includes(type)) {
    throw new WorkflowError(
      `Miratimi për '${type}' nuk është implementuar ende. Tranzicioni u bllokua.`,
      "NOT_IMPLEMENTED",
    );
  }

  return rule.to;
}

export function resolveReturnStatus(_target: ReturnTargetRole): ApplicationStatus {
  return ApplicationStatus.RETURNED;
}

export function resolveReturnResumeStatus(target: ReturnTargetRole): ApplicationStatus {
  switch (target) {
    case ReturnTargetRole.OWNER:
      return ApplicationStatus.BASIC_DATA_COMPLETED;
    case ReturnTargetRole.INSTALLER:
      return ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS;
    case ReturnTargetRole.CERTIFIER:
      return ApplicationStatus.CERTIFICATION_IN_PROGRESS;
    default:
      return ApplicationStatus.RETURNED;
  }
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Në pregatitje",
  BASIC_DATA_COMPLETED: "Të dhënat bazë u plotësuan",
  PENDING_INSTALLER: "Në pritje të instaluesit",
  INSTALLER_INVITED: "Ftesa u dërgua te instaluesi",
  INSTALLER_ACCEPTED: "Instaluesi pranoi ftesën",
  TECHNICAL_DATA_IN_PROGRESS: "Të dhënat teknike në përpunim",
  TECHNICAL_DATA_COMPLETED: "Të dhënat teknike u plotësuan",
  INSTALLER_COMPLETED: "Instaluesi përfundoi - caktoni certifikuesin",
  PENDING_CERTIFIER: "Në pritje të certifikuesit",
  CERTIFIER_INVITED: "Ftesa u dërgua te certifikuesi",
  CERTIFIER_ACCEPTED: "Certifikuesi pranoi ftesën",
  CERTIFICATION_IN_PROGRESS: "Certifikimi në përpunim",
  CERTIFICATION_COMPLETED: "Certifikimi u plotësua",
  CERTIFICATION_COMPLETED_WITH_ISSUES: "Certifikimi me çështje",
  PENDING_OWNER_SUBMISSION: "Gati për Aplikim për Registrim",
  SUBMITTED: "Në pritje të Kryeinspektorit",
  UNDER_REVIEW: "Në shqyrtim (legacy)",
  PENDING_DIRECTOR: "Në pritje të Drejtorit",
  PENDING_SECTOR_HEAD: "Në pritje të Përgjegjësit",
  PENDING_FIELD_REVIEW: "Në shqyrtim nga inspektorët",
  PENDING_SECTOR_HEAD_REPORT: "Në pritje të raportit të Përgjegjësit",
  PENDING_DIRECTOR_REPORT: "Në pritje të raportit të Drejtorit",
  PENDING_CHIEF_INSPECTOR: "Në pritje të vendimit të Kryeinspektorit",
  RETURNED_TO_INSPECTORS: "Kthyer te inspektorët",
  RETURNED_TO_SECTOR_HEAD: "Kthyer te Përgjegjësi",
  RETURNED_TO_DIRECTOR: "Kthyer te Drejtori",
  RETURNED: "E kthyer për korrigjim",
  REJECTED: "E refuzuar",
  APPROVED: "E miratuar",
  ELEVATOR_CREATED: "Ashensori u krijua",
  ASSETS_GENERATED: "Asetet u gjeneruan",
  CLOSED: "E mbyllur",
  CANCELLED: "E anuluar",
  EXPIRED: "E skaduar",
};

export const RETURN_TARGET_LABELS: Record<ReturnTargetRole, string> = {
  OWNER: "Personi përgjegjës i ashensorit",
  INSTALLER: "Instaluesi",
  CERTIFIER: "Certifikuesi / OM",
};

export const REVIEW_LEVEL_BY_ACTION: Partial<Record<WorkflowAction, ReviewLevel>> = {
  DELEGATE_TO_DIRECTOR: "CHIEF",
  DELEGATE_TO_SECTOR_HEAD: "DIRECTOR",
  ASSIGN_FIELD_INSPECTORS: "SECTOR_HEAD",
  SUBMIT_FIELD_REPORT: "FIELD_INSPECTOR",
  FORWARD_TO_DIRECTOR: "SECTOR_HEAD",
  FORWARD_TO_CHIEF: "DIRECTOR",
  APPROVE: "CHIEF",
  REJECT: "CHIEF",
};
