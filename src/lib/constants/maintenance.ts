/** Intervention subtypes shown in the UI (mapped to coarse MaintenanceType). */
export const INTERVENTION_TYPES = [
  "Servisim rutinë",
  "Defekt mekanik",
  "Defekt elektrik",
  "Zëvendësim pjesësh",
  "Kontroll sigurie",
  "Emergjencë",
  "Tjetër",
] as const;

export type InterventionTypeLabel = (typeof INTERVENTION_TYPES)[number];
