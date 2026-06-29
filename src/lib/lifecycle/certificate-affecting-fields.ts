import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";

/** Fields whose change requires issuing a new registration certificate. */
export const CERTIFICATE_AFFECTING_FIELDS = new Set([
  "registryNumber",
  "serialNumber",
  "manufacturer",
  "buildingAddress",
  "responsibleEntityName",
  "responsibleEntityIdentifier",
  "omiNumber",
  "examinationType",
]);

export function changesAffectCertificate(changes: FieldChange[]): boolean {
  return changes.some((c) => CERTIFICATE_AFFECTING_FIELDS.has(c.field));
}
