import { ApplicationStatus, ApplicationType } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import type { RegistrationPhase } from "@/lib/registration/phase-router";
import { isDemoModeEnabled } from "@/lib/demo/demo-mode";

export type RegistrationDemoStep =
  | "owner-basic-data"
  | "owner-assign-installer"
  | "installer-technical"
  | "owner-assign-certifier"
  | "certifier-certification"
  | "owner-pre-submit";

export const REGISTRATION_DEMO_STEP_LABELS: Record<RegistrationDemoStep, string> = {
  "owner-basic-data": "Plotëso fushat me të dhëna demo - Hapi 1",
  "owner-assign-installer": "Plotëso fushat me të dhëna demo - Hapi 2",
  "installer-technical": "Plotëso fushat me të dhëna demo - Të dhënat teknike",
  "owner-assign-certifier": "Plotëso fushat me të dhëna demo - Hapi 4",
  "certifier-certification": "Plotëso fushat me të dhëna demo - Certifikimi",
  "owner-pre-submit": "Demo - plotëso dosjen para parashtrimit",
};

export function isDemoToolsEnabled(): boolean {
  return isDemoModeEnabled();
}

/** Which demo fill action is available for the current user on this application. */
export function resolveRegistrationDemoStep(input: {
  type: ApplicationType;
  status: ApplicationStatus;
  roleCode: RoleCode;
  phase?: RegistrationPhase;
}): RegistrationDemoStep | null {
  if (!isDemoToolsEnabled() || input.type !== ApplicationType.NEW_REGISTRATION) {
    return null;
  }

  const { status, roleCode, phase } = input;

  if (roleCode === ROLE_CODES.OWNER) {
    if (status === ApplicationStatus.BASIC_DATA_COMPLETED) {
      return "owner-assign-installer";
    }
    if (status === ApplicationStatus.TECHNICAL_DATA_COMPLETED || status === ApplicationStatus.INSTALLER_COMPLETED) {
      return "owner-assign-certifier";
    }
    if (
      phase === "final-review" &&
      (status === ApplicationStatus.CERTIFICATION_COMPLETED ||
        status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES ||
        status === ApplicationStatus.PENDING_OWNER_SUBMISSION)
    ) {
      return "owner-pre-submit";
    }
  }

  if (roleCode === ROLE_CODES.INSTALLER) {
    if (phase === "technical-data" || status === ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS) {
      return "installer-technical";
    }
  }

  if (roleCode === ROLE_CODES.CERTIFIER) {
    if (phase === "certification-data" || status === ApplicationStatus.CERTIFICATION_IN_PROGRESS) {
      return "certifier-certification";
    }
  }

  return null;
}
