export type InstallerTechnicalReviewStatus =
  | "PENDING_REVIEW"
  | "CORRECTIONS_REQUESTED"
  | "APPROVED";

export type InstallerTechnicalReview = {
  status: InstallerTechnicalReviewStatus;
  certifierNotes?: string | null;
  installerResponse?: string | null;
  approvedAt?: string | null;
  requestedAt?: string | null;
};

type ApplicationDataLike = {
  registrationExtendedData?: unknown;
};

function reviewFromExtended(raw: unknown): Partial<InstallerTechnicalReview> | null {
  if (!raw || typeof raw !== "object") return null;
  const review = (raw as Record<string, unknown>).installerTechnicalReview;
  if (!review || typeof review !== "object") return null;
  return review as Partial<InstallerTechnicalReview>;
}

export function getInstallerTechnicalReview(data?: ApplicationDataLike | null): InstallerTechnicalReview {
  const review = reviewFromExtended(data?.registrationExtendedData);
  const status = review?.status;
  if (
    status === "PENDING_REVIEW" ||
    status === "CORRECTIONS_REQUESTED" ||
    status === "APPROVED"
  ) {
    return {
      status,
      certifierNotes: typeof review?.certifierNotes === "string" ? review.certifierNotes : null,
      installerResponse: typeof review?.installerResponse === "string" ? review.installerResponse : null,
      approvedAt: typeof review?.approvedAt === "string" ? review.approvedAt : null,
      requestedAt: typeof review?.requestedAt === "string" ? review.requestedAt : null,
    };
  }

  return {
    status: "PENDING_REVIEW",
    certifierNotes: null,
    installerResponse: null,
    approvedAt: null,
    requestedAt: null,
  };
}

export function hasInstallerTechnicalReviewRecord(data?: ApplicationDataLike | null): boolean {
  return reviewFromExtended(data?.registrationExtendedData) != null;
}

/** Certifikimi lejohet vetëm pas miratimit të të dhënave teknike të instaluesit. */
export function isInstallerTechnicalReviewApproved(
  data?: ApplicationDataLike | null,
  status?: string | null,
): boolean {
  const review = getInstallerTechnicalReview(data);
  if (review.status === "APPROVED") return true;

  // Aplikime të vjetra pa regjistrim review - certifikimi tashmë nisur
  if (
    status === "CERTIFICATION_IN_PROGRESS" ||
    status === "CERTIFICATION_COMPLETED" ||
    status === "CERTIFICATION_COMPLETED_WITH_ISSUES"
  ) {
    return !hasInstallerTechnicalReviewRecord(data);
  }

  return false;
}

export function mergeInstallerTechnicalReview(
  existing: unknown,
  patch: Partial<InstallerTechnicalReview>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};
  const current = getInstallerTechnicalReview({ registrationExtendedData: base });
  base.installerTechnicalReview = {
    ...current,
    ...patch,
  };
  return base;
}

export function initialInstallerTechnicalReviewExtended(existing: unknown): Record<string, unknown> {
  if (hasInstallerTechnicalReviewRecord({ registrationExtendedData: existing })) {
    return existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};
  }
  return mergeInstallerTechnicalReview(existing, { status: "PENDING_REVIEW" });
}
