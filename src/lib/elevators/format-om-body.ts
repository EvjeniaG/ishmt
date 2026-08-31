/** Normalizon numrin e trupit të miratuar në formatin "OM 013". */
export function formatOmBodyNumber(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  const match = normalized.match(/\bOM\s*(\d+)\b/i);
  if (match) {
    return `OM ${match[1]}`;
  }
  return null;
}

/** Për shfaqje: OM + numri, jo "OM OM …" ose emër organizate. */
export function displayOmBody(
  approvedBodyNumber: string | null | undefined,
  orgName?: string | null,
): string {
  const fromApproved = formatOmBodyNumber(approvedBodyNumber);
  if (fromApproved) return fromApproved;

  const fromOrg = formatOmBodyNumber(orgName);
  if (fromOrg) return fromOrg;

  const trimmed = orgName?.trim();
  if (trimmed) {
    if (/^OMI\s/i.test(trimmed)) {
      const withoutPrefix = trimmed.replace(/^OMI\s+/i, "").trim();
      const fromWithoutPrefix = formatOmBodyNumber(withoutPrefix);
      if (fromWithoutPrefix) return fromWithoutPrefix;
    }
    return trimmed;
  }

  return "OM";
}

/** Emër i normalizuar vetëm për trupat OM (p.sh. "OM OM 013" → "OM 013"). */
export function normalizeOmBodyOrganizationName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const normalized = displayOmBody(null, trimmed);
  if (!formatOmBodyNumber(trimmed) && !/^OMI\s/i.test(trimmed)) return null;
  if (normalized === trimmed || normalized === "OM") return null;
  return normalized;
}

/** Emri i shfaqur për organizatën certifikuese (normalizon "OM OM 013" → "OM 013"). */
export function displayCertifierOrganizationName(
  orgName: string | null | undefined,
  omiNumber?: string | null,
): string {
  const formatted = displayOmBody(omiNumber, orgName);
  if (formatted && formatted !== "OM") return formatted;
  return orgName?.trim() || "-";
}
