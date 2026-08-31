import type { RegistrationPhase } from "@/lib/registration/phase-router";
import { COMPLETED_APPLICATION_STATUS_LABEL } from "@/lib/registration/status-presentation";

export const REGISTRATION_PHASE_ACTION_LABELS: Record<RegistrationPhase, string> = {
  "basic-data": "Plotësoni të dhënat bazë",
  "select-installer": "Caktoni kompaninë instaluese",
  "wait-installer": "Në pritje të instaluesit",
  "installer-accept": "Pranoni ftesën e instalimit",
  "technical-data": "Plotësoni të dhënat teknike",
  "technical-reconciliation": "Korrigjoni të dhënat teknike",
  "installer-complete": "Pjesa juaj u plotësua",
  "select-certifier": "Caktoni kompaninë certifikuese",
  "wait-certifier": "Në pritje të certifikuesit",
  "certifier-accept": "Pranoni ftesën OM",
  "installer-technical-review": "Rakordoni të dhënat e instaluesit",
  "certification-data": "Plotësoni certifikimin",
  "certifier-complete": "Pjesa juaj u plotësua",
  "final-review": "Rishikoni dhe parashtroni te IQMT",
  submitted: "Në shqyrtim nga IQMT",
  review: "Shqyrtim institucional",
  completed: COMPLETED_APPLICATION_STATUS_LABEL,
  rejected: "E refuzuar",
};
