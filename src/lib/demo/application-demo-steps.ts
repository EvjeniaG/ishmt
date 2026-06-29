import { ApplicationType, DataUpdateType } from "@prisma/client";
import type { RegistrationDemoStep } from "@/lib/demo/registration-demo-steps";

export type LifecycleDemoStep =
  | "modernization-data"
  | "modernization-installer"
  | "modernization-certifier"
  | "correction-fields"
  | "update-type"
  | "update-fields"
  | "ownership-recipient"
  | "lifecycle-documents";

export type ApplicationDemoStep = RegistrationDemoStep | LifecycleDemoStep;

export const APPLICATION_DEMO_STEP_LABELS: Record<ApplicationDemoStep, string> = {
  "owner-basic-data": "Plotëso fushat me të dhëna demo - Hapi 1",
  "owner-assign-installer": "Demo - instaluesi",
  "installer-technical": "Demo - të dhënat teknike",
  "owner-assign-certifier": "Demo - certifikuesi",
  "certifier-certification": "Demo - certifikimi",
  "owner-pre-submit": "Demo - dosja para parashtrimit",
  "modernization-data": "Demo - modernizimi",
  "modernization-installer": "Demo - instaluesi",
  "modernization-certifier": "Demo - certifikuesi",
  "correction-fields": "Demo - korrigjimet",
  "update-type": "Demo - lloji i ndryshimit",
  "update-fields": "Demo - ndryshimet",
  "ownership-recipient": "Demo - marrësi i ri",
  "lifecycle-documents": "Demo - dokumentet",
};

export function isDemoToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

export function resolveApplicationDemoStep(input: {
  type: ApplicationType;
  updateType?: string | null;
  hasModernization?: boolean;
  hasInstaller?: boolean;
  hasCertifier?: boolean;
  hasChanges?: boolean;
  hasUpdateType?: boolean;
  hasReason?: boolean;
  canInviteRecipient?: boolean;
  ownershipAccepted?: boolean;
}): ApplicationDemoStep | null {
  if (!isDemoToolsEnabled()) return null;

  switch (input.type) {
    case ApplicationType.NEW_REGISTRATION:
      return null; // resolved by registration-demo-steps
    case ApplicationType.MODERNIZATION:
      if (!input.hasModernization) return "modernization-data";
      if (!input.hasInstaller) return "modernization-installer";
      if (!input.hasCertifier) return "modernization-certifier";
      return "lifecycle-documents";
    case ApplicationType.DATA_CORRECTION:
      if (!input.hasChanges) return "correction-fields";
      return null;
    case ApplicationType.DATA_UPDATE:
      if (input.updateType === DataUpdateType.OWNERSHIP_TRANSFER) {
        if (input.canInviteRecipient) return "ownership-recipient";
        if (!input.ownershipAccepted) return null;
        return "lifecycle-documents";
      }
      if (!input.hasUpdateType) return "update-type";
      if (!input.hasChanges) return "update-fields";
      return "lifecycle-documents";
    case ApplicationType.DEREGISTRATION:
      return "lifecycle-documents";
    default:
      return null;
  }
}
