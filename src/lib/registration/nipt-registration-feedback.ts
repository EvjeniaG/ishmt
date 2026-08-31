import type { NiptLookupStatus } from "@/lib/services/licensed-company-registration-service";

export function niptRegistrationFeedbackMessage(
  status: NiptLookupStatus | null,
): { tone: "error" | "success" | "muted" | "info"; text: string } | null {
  if (!status || status.status === "TOO_SHORT") return null;

  switch (status.status) {
    case "HAS_ACTIVE_ACCOUNT":
      return {
        tone: "error",
        text: `Ekziston tashmë llogari aktive për këtë NIPT (${status.orgName}).`,
      };
    case "NOT_IN_DIRECTORATE":
      return {
        tone: "info",
        text: "NIPT-i nuk gjendet në regjistrin e Drejtorisë së Politikave. Regjistrimi bëhet si kompani mirëmbajtjeje.",
      };
    case "DIRECTORATE_REGISTERED": {
      const labels: string[] = [];
      if (status.capabilities.capInstall) labels.push("instalim");
      if (status.capabilities.capOm) labels.push("OM / certifikim");
      return {
        tone: "success",
        text: `${status.orgName} është e regjistruar nga Drejtoría me funksione: ${labels.join(" dhe ")}.`,
      };
    }
    default:
      return null;
  }
}

export function isNiptReadyForRegistration(status: NiptLookupStatus | null): boolean {
  return (
    status?.status === "DIRECTORATE_REGISTERED" || status?.status === "NOT_IN_DIRECTORATE"
  );
}
