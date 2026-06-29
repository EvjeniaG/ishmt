import type { RegistrationPhase } from "@/lib/registration/phase-router";

export const REGISTRATION_PHASE_ACTION_LABELS: Record<RegistrationPhase, string> = {
  "basic-data": "Plotësoni të dhënat bazë",
  "select-installer": "Caktoni kompaninë instaluese",
  "wait-installer": "Në pritje të instaluesit",
  "installer-accept": "Pranoni ftesën e instalimit",
  "technical-data": "Plotësoni të dhënat teknike",
  "installer-complete": "Pjesa juaj u plotësua",
  "select-certifier": "Caktoni kompaninë certifikuese",
  "wait-certifier": "Në pritje të certifikuesit",
  "certifier-accept": "Pranoni ftesën OMI",
  "certification-data": "Plotësoni certifikimin",
  "certifier-complete": "Pjesa juaj u plotësua",
  "final-review": "Rishikoni dhe parashtroni te ISHMT",
  submitted: "Në shqyrtim nga ISHMT",
  review: "Shqyrtim institucional",
  completed: "E përfunduar",
  rejected: "E refuzuar",
};
