import { formatOmBodyNumber } from "@/lib/elevators/format-om-body";
import { LEGACY_REGISTRY_ATTRIBUTION } from "@/lib/migration/legacy-display";

export type LegacyPeriodicFindings = {
  legacyImport?: boolean;
  semesterLabel?: string;
  trupa?: string;
  raporti?: string;
  muaji?: string;
  comments?: string;
  dedupeKey?: string;
};

export function parseLegacyPeriodicFindings(
  findings: string | null | undefined,
): LegacyPeriodicFindings | null {
  if (!findings?.trim()) return null;
  try {
    const parsed = JSON.parse(findings) as LegacyPeriodicFindings;
    if (parsed?.legacyImport) return parsed;
  } catch {
    // tekst i lirë
  }
  return null;
}

export function isLegacyImportFindings(findings: string | null | undefined): boolean {
  return parseLegacyPeriodicFindings(findings) != null;
}

/** Shfaq raportin periodik legacy si tekst, jo JSON. */
export function formatInspectionFindings(findings: string | null | undefined): string | null {
  if (!findings?.trim()) return null;

  const legacy = parseLegacyPeriodicFindings(findings);
  if (legacy) {
    const parts: string[] = [];
    if (legacy.semesterLabel) parts.push(`Semestri: ${legacy.semesterLabel}`);
    if (legacy.trupa) parts.push(`OM: ${formatOmBodyNumber(legacy.trupa) ?? legacy.trupa}`);
    if (legacy.raporti) parts.push(`Raporti: ${legacy.raporti}`);
    if (legacy.muaji) parts.push(`Muaji: ${legacy.muaji}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }

  if (findings.startsWith("K/INSP:")) return LEGACY_REGISTRY_ATTRIBUTION;

  return findings;
}

export function inspectionFindingsLabel(findings: string | null | undefined): string {
  if (isLegacyImportFindings(findings)) return "Shënime";
  if (findings?.trim().startsWith("K/INSP:")) return "Burimi";
  return "Gjetjet";
}

export function extractLegacyReportReference(findings: string | null | undefined): string | null {
  const legacy = parseLegacyPeriodicFindings(findings);
  return legacy?.raporti?.trim() || null;
}

export function extractLegacyPeriodicComments(
  findings: string | null | undefined,
): string | null {
  const legacy = parseLegacyPeriodicFindings(findings);
  const comments = legacy?.comments?.trim();
  return comments || null;
}

/** Për legacy: vetëm komente të lira (jo semestër/OM/muaj - shfaqen diku tjetër). */
export function formatLegacyInspectionNotes(findings: string | null | undefined): string | null {
  return extractLegacyPeriodicComments(findings);
}
