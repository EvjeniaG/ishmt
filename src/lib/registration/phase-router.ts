import {
  ApplicationStatus,
  ApplicationType,
  DelegationStatus,
  DelegationType,
  ReturnTargetRole,
} from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { canReviewApplications } from "@/lib/permissions/ishmt-roles";
import { isReturnedToRole } from "@/lib/workflows/return-targets";

export type RegistrationPhase =
  | "basic-data"
  | "select-installer"
  | "wait-installer"
  | "installer-accept"
  | "technical-data"
  | "installer-complete"
  | "select-certifier"
  | "wait-certifier"
  | "certifier-accept"
  | "certification-data"
  | "certifier-complete"
  | "final-review"
  | "submitted"
  | "review"
  | "completed"
  | "rejected";

/** 6 hapat e personit përgjegjës të ashensorit - burim i vetëm i së vërtetës për etiketat e workflow-it. */
export const OWNER_REGISTRATION_STEPS: {
  step: number;
  id: RegistrationPhase;
  label: string;
  ownerAction: boolean;
  delegateRole?: "INSTALLER" | "CERTIFIER";
}[] = [
  { step: 1, id: "basic-data", label: "Të dhënat", ownerAction: true },
  { step: 2, id: "select-installer", label: "Instaluesi", ownerAction: true },
  { step: 3, id: "technical-data", label: "Të dhënat teknike", ownerAction: false, delegateRole: "INSTALLER" },
  { step: 4, id: "select-certifier", label: "Certifikuesi", ownerAction: true },
  { step: 5, id: "certification-data", label: "Certifikimi", ownerAction: false, delegateRole: "CERTIFIER" },
  { step: 6, id: "final-review", label: "Parashtrimi", ownerAction: true },
];

/** @deprecated Përdorni OWNER_REGISTRATION_STEPS */
export const REGISTRATION_PHASES = OWNER_REGISTRATION_STEPS.map((s) => ({
  id: s.id,
  label: s.label,
  step: s.step,
}));

export type OwnerWizardStepState = "completed" | "active" | "waiting" | "upcoming";

export type OwnerWizardStepView = {
  step: number;
  label: string;
  state: OwnerWizardStepState;
  ownerAction: boolean;
  delegateRole?: "INSTALLER" | "CERTIFIER";
};

type AppContext = {
  id: string;
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
};

function installerDelegation(app: AppContext) {
  return app.delegations?.find((d) => d.accessType === DelegationType.INSTALLER);
}

function certifierDelegation(app: AppContext) {
  return app.delegations?.find((d) => d.accessType === DelegationType.CERTIFIER);
}

const POST_INSTALLER_WORK_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.TECHNICAL_DATA_COMPLETED,
  ApplicationStatus.INSTALLER_COMPLETED,
  ApplicationStatus.PENDING_CERTIFIER,
  ApplicationStatus.CERTIFIER_INVITED,
  ApplicationStatus.CERTIFIER_ACCEPTED,
  ApplicationStatus.CERTIFICATION_IN_PROGRESS,
  ApplicationStatus.CERTIFICATION_COMPLETED,
  ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES,
  ApplicationStatus.PENDING_OWNER_SUBMISSION,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.APPROVED,
  ApplicationStatus.ELEVATOR_CREATED,
  ApplicationStatus.ASSETS_GENERATED,
  ApplicationStatus.CLOSED,
];

export const POST_CERTIFIER_WORK_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.CERTIFICATION_COMPLETED,
  ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES,
  ApplicationStatus.PENDING_OWNER_SUBMISSION,
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.PENDING_CHIEF_INSPECTOR,
  ApplicationStatus.APPROVED,
  ApplicationStatus.ELEVATOR_CREATED,
  ApplicationStatus.ASSETS_GENERATED,
  ApplicationStatus.CLOSED,
];

/** Statuset ku certifikuesi ka ende punë aktive. */
export const CERTIFIER_IN_PROGRESS_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.PENDING_CERTIFIER,
  ApplicationStatus.CERTIFIER_INVITED,
  ApplicationStatus.CERTIFIER_ACCEPTED,
  ApplicationStatus.CERTIFICATION_IN_PROGRESS,
];

/** Instalim i përfunduar - certifikuesi duhet të pranojë / fillojë certifikimin. */
export const CERTIFIER_AWAITING_START_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.PENDING_CERTIFIER,
  ApplicationStatus.CERTIFIER_INVITED,
];

/** Certifikimi aktiv - certifikuesi po punon dokumentacionin. */
export const CERTIFIER_ACTIVE_WORK_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.CERTIFIER_ACCEPTED,
  ApplicationStatus.CERTIFICATION_IN_PROGRESS,
];

function resolveInstallerPhase(app: AppContext): RegistrationPhase {
  const instDel = installerDelegation(app);

  if (instDel?.status === DelegationStatus.PENDING || instDel?.status === DelegationStatus.INVITED) {
    return "installer-accept";
  }

  if (app.status === ApplicationStatus.RETURNED && isReturnedToRole(app, ReturnTargetRole.INSTALLER)) {
    return "technical-data";
  }

  const installerWorkStatuses: ApplicationStatus[] = [
    ApplicationStatus.INSTALLER_ACCEPTED,
    ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
  ];
  if (installerWorkStatuses.includes(app.status)) {
    return "technical-data";
  }

  if (POST_INSTALLER_WORK_STATUSES.includes(app.status)) {
    return "installer-complete";
  }

  return "submitted";
}

function resolveCertifierPhase(app: AppContext): RegistrationPhase {
  const certDel = certifierDelegation(app);

  if (certDel?.status === DelegationStatus.PENDING || certDel?.status === DelegationStatus.INVITED) {
    return "certifier-accept";
  }

  if (app.status === ApplicationStatus.RETURNED && isReturnedToRole(app, ReturnTargetRole.CERTIFIER)) {
    return "certification-data";
  }

  const certifierWorkStatuses: ApplicationStatus[] = [
    ApplicationStatus.CERTIFIER_ACCEPTED,
    ApplicationStatus.CERTIFICATION_IN_PROGRESS,
  ];
  if (certifierWorkStatuses.includes(app.status)) {
    return "certification-data";
  }

  if (POST_CERTIFIER_WORK_STATUSES.includes(app.status)) {
    return "certifier-complete";
  }

  return "submitted";
}

function resolveOwnerPhase(app: AppContext): RegistrationPhase {
  if (app.status === ApplicationStatus.RETURNED) {
    if (isReturnedToRole(app, ReturnTargetRole.OWNER)) return "final-review";
    if (isReturnedToRole(app, ReturnTargetRole.INSTALLER)) return "wait-installer";
    if (isReturnedToRole(app, ReturnTargetRole.CERTIFIER)) return "wait-certifier";
    return "basic-data";
  }

  if (app.status === ApplicationStatus.DRAFT) return "basic-data";
  if (app.status === ApplicationStatus.BASIC_DATA_COMPLETED) return "select-installer";

  if (
    app.status === ApplicationStatus.PENDING_INSTALLER ||
    app.status === ApplicationStatus.INSTALLER_INVITED ||
    app.status === ApplicationStatus.INSTALLER_ACCEPTED ||
    app.status === ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS
  ) {
    return "wait-installer";
  }

  if (
    app.status === ApplicationStatus.TECHNICAL_DATA_COMPLETED ||
    app.status === ApplicationStatus.INSTALLER_COMPLETED
  ) {
    return "select-certifier";
  }

  if (
    app.status === ApplicationStatus.PENDING_CERTIFIER ||
    app.status === ApplicationStatus.CERTIFIER_INVITED ||
    app.status === ApplicationStatus.CERTIFIER_ACCEPTED ||
    app.status === ApplicationStatus.CERTIFICATION_IN_PROGRESS
  ) {
    return "wait-certifier";
  }

  if (
    app.status === ApplicationStatus.CERTIFICATION_COMPLETED ||
    app.status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES ||
    app.status === ApplicationStatus.PENDING_OWNER_SUBMISSION
  ) {
    return "final-review";
  }

  return "basic-data";
}

export function resolveRegistrationPhase(app: AppContext, roleCode: RoleCode): RegistrationPhase {
  if (app.type !== ApplicationType.NEW_REGISTRATION) return "basic-data";

  if (app.status === ApplicationStatus.REJECTED) return "rejected";

  const completedStatuses: ApplicationStatus[] = [
    ApplicationStatus.APPROVED,
    ApplicationStatus.ELEVATOR_CREATED,
    ApplicationStatus.ASSETS_GENERATED,
    ApplicationStatus.CLOSED,
  ];
  if (completedStatuses.includes(app.status)) {
    return "completed";
  }

  const reviewStatuses: ApplicationStatus[] = [
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.PENDING_CHIEF_INSPECTOR,
  ];
  if (reviewStatuses.includes(app.status)) {
    if (canReviewApplications(roleCode) || roleCode === ROLE_CODES.ADMIN) return "review";
    if (roleCode === ROLE_CODES.INSTALLER) return resolveInstallerPhase(app);
    if (roleCode === ROLE_CODES.CERTIFIER) return resolveCertifierPhase(app);
    return "submitted";
  }

  if (app.status === ApplicationStatus.RETURNED) {
    if (roleCode === ROLE_CODES.OWNER) return resolveOwnerPhase(app);
    if (roleCode === ROLE_CODES.INSTALLER) return resolveInstallerPhase(app);
    if (roleCode === ROLE_CODES.CERTIFIER) return resolveCertifierPhase(app);
    if (canReviewApplications(roleCode) || roleCode === ROLE_CODES.ADMIN) return "review";
  }

  if (roleCode === ROLE_CODES.INSTALLER) {
    return resolveInstallerPhase(app);
  }

  if (roleCode === ROLE_CODES.CERTIFIER) {
    return resolveCertifierPhase(app);
  }

  if (roleCode === ROLE_CODES.OWNER) {
    return resolveOwnerPhase(app);
  }

  return "submitted";
}

export function registrationPhasePath(appId: string, _phase?: RegistrationPhase): string {
  return `/portal/applications/${appId}`;
}

const POST_SUBMIT_OWNER_PHASES: RegistrationPhase[] = ["submitted", "review", "completed", "rejected"];

export function getOwnerStepNumberFromPhase(phase: RegistrationPhase): number {
  switch (phase) {
    case "basic-data":
      return 1;
    case "select-installer":
      return 2;
    case "wait-installer":
      return 3;
    case "select-certifier":
      return 4;
    case "wait-certifier":
      return 5;
    case "final-review":
      return 6;
    case "submitted":
    case "review":
    case "completed":
    case "rejected":
      return 7;
    default:
      return 1;
  }
}

/** Gjendja vizuale e secilit hap për personin përgjegjës të ashensorit - bazuar në fazën aktive, jo vetëm statusin. */
export function getOwnerWizardStepViews(phase: RegistrationPhase): OwnerWizardStepView[] {
  const activeStep = getOwnerStepNumberFromPhase(phase);
  const postSubmit = POST_SUBMIT_OWNER_PHASES.includes(phase);

  return OWNER_REGISTRATION_STEPS.map((def) => {
    let state: OwnerWizardStepState;
    if (postSubmit) {
      state = "completed";
    } else if (def.step < activeStep) {
      state = "completed";
    } else if (def.step === activeStep) {
      state = phase === "wait-installer" || phase === "wait-certifier" ? "waiting" : "active";
    } else {
      state = "upcoming";
    }
    return {
      step: def.step,
      label: def.label,
      state,
      ownerAction: def.ownerAction,
      delegateRole: def.delegateRole,
    };
  });
}

export function getOwnerPhaseTitle(phase: RegistrationPhase): string {
  switch (phase) {
    case "basic-data":
      return "Të dhënat e aplikimit";
    case "select-installer":
      return "Zgjidhni instaluesin";
    case "wait-installer":
      return "Presim instaluesin";
    case "select-certifier":
      return "Zgjidhni certifikuesin";
    case "wait-certifier":
      return "Presim certifikuesin";
    case "final-review":
      return "Parashtro aplikimin";
    case "submitted":
    case "review":
      return "Aplikimi në shqyrtim";
    case "completed":
      return "Regjistrimi u miratua";
    case "rejected":
      return "Aplikimi u refuzua";
    default:
      return "Regjistrim ashensori";
  }
}

export function getOwnerPhaseDescription(phase: RegistrationPhase): string {
  switch (phase) {
    case "basic-data":
      return "Plotësoni formularin, ngarkoni dokumentet dhe klikoni Ruaj.";
    case "select-installer":
      return "Zgjidhni kompaninë instaluese dhe dërgoni ftesën.";
    case "wait-installer":
      return "Instaluesi po plotëson të dhënat teknike.";
    case "select-certifier":
      return "Zgjidhni kompaninë certifikuese dhe dërgoni ftesën.";
    case "wait-certifier":
      return "Certifikuesi po plotëson certifikimin.";
    case "final-review":
      return "Kontrolloni përmbledhjen dhe parashtroni te ISHMT.";
    case "submitted":
    case "review":
      return "Aplikimi po shqyrtohet. Nuk duhet të bëni asgjë tani.";
    case "completed":
      return "Regjistrimi u miratua. Ashensori është regjistruar.";
    case "rejected":
      return "Ky aplikim u refuzua dhe nuk mund të vazhdojë.";
    default:
      return "";
  }
}

export function getInstallerDelegateStepStates(phase: RegistrationPhase) {
  const order: RegistrationPhase[] = ["installer-accept", "technical-data", "installer-complete"];
  const idx = order.indexOf(phase);
  const current = idx === -1 ? order.length : idx;
  return [
    { label: "Pranimi i ftesës", done: current > 0, active: current === 0 },
    { label: "Të dhënat teknike", done: current > 1, active: current === 1 },
    { label: "Përfunduar", done: current > 2, active: current === 2 },
  ];
}

export function getCertifierDelegateStepStates(phase: RegistrationPhase) {
  const order: RegistrationPhase[] = ["certifier-accept", "certification-data", "certifier-complete"];
  const idx = order.indexOf(phase);
  const current = idx === -1 ? order.length : idx;
  return [
    { label: "Pranimi i ftesës", done: current > 0, active: current === 0 },
    { label: "Certifikimi", done: current > 1, active: current === 1 },
    { label: "Përfunduar", done: current > 2, active: current === 2 },
  ];
}

export function getRegistrationWizardStep(
  status: ApplicationStatus,
  returnToRole?: ReturnTargetRole | null,
): number {
  if (status === ApplicationStatus.RETURNED) {
    if (returnToRole === ReturnTargetRole.INSTALLER) return 3;
    if (returnToRole === ReturnTargetRole.CERTIFIER) return 5;
    if (returnToRole === ReturnTargetRole.OWNER) return 6;
    return 1;
  }

  const allComplete: ApplicationStatus[] = [
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.PENDING_CHIEF_INSPECTOR,
    ApplicationStatus.APPROVED,
    ApplicationStatus.ELEVATOR_CREATED,
    ApplicationStatus.ASSETS_GENERATED,
    ApplicationStatus.CLOSED,
    ApplicationStatus.REJECTED,
  ];
  if (allComplete.includes(status)) return 7;

  const stepByStatus: Partial<Record<ApplicationStatus, number>> = {
    [ApplicationStatus.DRAFT]: 1,
    [ApplicationStatus.BASIC_DATA_COMPLETED]: 2,
    [ApplicationStatus.PENDING_INSTALLER]: 3,
    [ApplicationStatus.INSTALLER_INVITED]: 3,
    [ApplicationStatus.INSTALLER_ACCEPTED]: 3,
    [ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS]: 3,
    [ApplicationStatus.TECHNICAL_DATA_COMPLETED]: 4,
    [ApplicationStatus.INSTALLER_COMPLETED]: 4,
    [ApplicationStatus.PENDING_CERTIFIER]: 5,
    [ApplicationStatus.CERTIFIER_INVITED]: 5,
    [ApplicationStatus.CERTIFIER_ACCEPTED]: 5,
    [ApplicationStatus.CERTIFICATION_IN_PROGRESS]: 5,
    [ApplicationStatus.CERTIFICATION_COMPLETED]: 6,
    [ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES]: 6,
    [ApplicationStatus.PENDING_OWNER_SUBMISSION]: 6,
  };

  return stepByStatus[status] ?? 1;
}

export function getCurrentStep(phase: RegistrationPhase, status?: ApplicationStatus): number {
  if (phase && !status) return getOwnerStepNumberFromPhase(phase);
  if (status) return getRegistrationWizardStep(status);
  switch (phase) {
    case "select-installer":
    case "wait-installer":
    case "installer-accept":
      return 2;
    case "technical-data":
    case "installer-complete":
      return 3;
    case "select-certifier":
    case "wait-certifier":
    case "certifier-accept":
      return 4;
    case "certification-data":
    case "certifier-complete":
      return 5;
    case "final-review":
      return 6;
    case "submitted":
    case "review":
    case "completed":
    case "rejected":
      return 7;
    default:
      return 1;
  }
}

export function isOwnerRegistrationPhase(phase: RegistrationPhase): boolean {
  return ![
    "installer-accept",
    "technical-data",
    "installer-complete",
    "certifier-accept",
    "certification-data",
    "certifier-complete",
    "submitted",
    "review",
    "completed",
    "rejected",
  ].includes(phase);
}
