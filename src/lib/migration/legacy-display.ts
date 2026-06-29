import { formatOmBodyNumber } from "@/lib/elevators/format-om-body";

/** Tekst i unifikuar për regjistrat e importuar nga Excel legacy. */
export const LEGACY_REGISTRY_ATTRIBUTION = "Sistemi (regjistër i ngarkuar)";

export function isLegacyMigrationApplicationNumber(
  applicationNumber: string | null | undefined,
): boolean {
  return Boolean(applicationNumber?.trim().toUpperCase().startsWith("MIG-"));
}

export function displayLegacyActorName(
  user: { firstName: string; lastName: string } | null | undefined,
  options?: { applicationNumber?: string | null; legacyImport?: boolean },
): string {
  if (options?.legacyImport || isLegacyMigrationApplicationNumber(options?.applicationNumber)) {
    return LEGACY_REGISTRY_ATTRIBUTION;
  }
  if (!user) return "-";
  return `${user.firstName} ${user.lastName}`.trim();
}

export function isOmBodyOrganizationName(name: string | null | undefined): boolean {
  return Boolean(formatOmBodyNumber(name));
}

export function certifierOrganizationFieldLabel(name: string | null | undefined): string {
  return isOmBodyOrganizationName(name) ? "Trupi OM" : "Organizata certifikuese";
}
