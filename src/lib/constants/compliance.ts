/**
 * Public QR compliance indicator logic.
 * @see approved extension - Compliance Indicator
 */
export const COMPLIANCE_INDICATOR = {
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  RED: "RED",
} as const;

export const REMINDER_DAYS_BEFORE = [30, 15, 7, 1] as const;

export const SUSPENSION_REASONS = [
  "EXPIRED_INSPECTION",
  "EXPIRED_CERTIFICATE",
  "EXPIRED_MAINTENANCE",
  "SAFETY_RISK",
  "CITIZEN_REPORT",
  "ADMINISTRATIVE_DECISION",
] as const;
