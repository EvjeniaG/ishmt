import type { LicensedCompanyLookupStatus } from "@/lib/services/licensed-company-registration-service";

export function licensedCompanyFeedbackMessage(
  status: LicensedCompanyLookupStatus | null,
  options?: { roleLabel?: string },
): { tone: "error" | "success" | "muted"; text: string } | null {
  if (!status || status.status === "TOO_SHORT") return null;

  const roleLabel =
    options?.roleLabel ??
    ("roleLabel" in status ? status.roleLabel : undefined) ??
    "licencës";

  switch (status.status) {
    case "NOT_FOUND":
      return {
        tone: "error",
        text: `Ky numër licence ${roleLabel} nuk ekziston në regjistrin e Drejtorisë së Politikave.`,
      };
    case "INACTIVE":
      return {
        tone: "error",
        text: "Licenca nuk është aktive ose ka skaduar.",
      };
    case "HAS_ACTIVE_ACCOUNT":
      return {
        tone: "error",
        text: `Ekziston tashmë llogari aktive për këtë kompani (${status.orgName}).`,
      };
    case "NIPT_MISMATCH":
      return {
        tone: "error",
        text: `Licenca nuk përputhet me NIPT-in e kompanisë (pritet: ${status.expectedNipt}).`,
      };
    case "AVAILABLE":
      if (status.directorateRegistered && status.niptVerified) {
        return {
          tone: "success",
          text: `${status.orgName} është regjistruar nga Drejtoría - llogaria juaj do të lidhet direkt me këtë kompani.`,
        };
      }
      return {
        tone: "success",
        text: status.niptVerified
          ? `Licenca u gjet për ${status.orgName} dhe përputhet me NIPT-in.`
          : `Licenca u gjet për ${status.orgName}. Plotësoni NIPT-in për verifikim të plotë.`,
      };
    default:
      return null;
  }
}

export function isLicensedCompanyReadyForRegistration(
  status: LicensedCompanyLookupStatus | null,
): boolean {
  return status?.status === "AVAILABLE" && status.niptVerified;
}

/** @deprecated Përdorni licensedCompanyFeedbackMessage */
export function omLicenseFeedbackMessage(status: LicensedCompanyLookupStatus | null) {
  return licensedCompanyFeedbackMessage(status, { roleLabel: "OM" });
}

/** @deprecated Përdorni isLicensedCompanyReadyForRegistration */
export function isOmLicenseReadyForRegistration(status: LicensedCompanyLookupStatus | null) {
  return isLicensedCompanyReadyForRegistration(status);
}

export function installLicenseFeedbackMessage(status: LicensedCompanyLookupStatus | null) {
  return licensedCompanyFeedbackMessage(status, { roleLabel: "instalimit" });
}
