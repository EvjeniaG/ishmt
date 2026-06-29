import { ApplicationStatus } from "@prisma/client";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import type { RegistrationPhase } from "@/lib/registration/phase-router";

export type RegistrationBannerContent = {
  headline: string;
  chip: string;
  chipTone: "action" | "waiting" | "done" | "danger" | "neutral";
};

const CHIP_STYLES = {
  action: "workflow-status-action",
  waiting: "workflow-status-waiting",
  done: "workflow-status-done",
  danger: "workflow-status-danger",
  neutral: "workflow-status-outline",
} as const;

export function registrationBannerChipClass(tone: RegistrationBannerContent["chipTone"]) {
  return CHIP_STYLES[tone];
}

export function getRegistrationBannerContent(
  phase: RegistrationPhase,
  status: ApplicationStatus,
  roleCode?: RoleCode,
): RegistrationBannerContent {
  if (roleCode === ROLE_CODES.INSTALLER) {
    switch (phase) {
      case "installer-accept":
        return { headline: "Pranoni ftesën për të vazhduar", chip: "Ftesë e re", chipTone: "action" };
      case "technical-data":
        return { headline: "Plotësoni të dhënat teknike", chip: "Hapi 2/3", chipTone: "action" };
      case "installer-complete":
        return { headline: "Puna juaj përfundoi", chip: "Gati", chipTone: "done" };
      default:
        return { headline: "Aplikimi në proces", chip: "Instalues", chipTone: "neutral" };
    }
  }

  if (roleCode === ROLE_CODES.CERTIFIER) {
    switch (phase) {
      case "certifier-accept":
        return { headline: "Pranoni ftesën për të vazhduar", chip: "Ftesë e re", chipTone: "action" };
      case "certification-data":
        return { headline: "Plotësoni certifikimin", chip: "Hapi 2/3", chipTone: "action" };
      case "certifier-complete":
        return { headline: "Puna juaj përfundoi", chip: "Gati", chipTone: "done" };
      default:
        return { headline: "Aplikimi në proces", chip: "Certifikues", chipTone: "neutral" };
    }
  }

  switch (phase) {
    case "basic-data":
      return { headline: "Plotësoni formularin dhe ruajeni", chip: "Hapi 1/6", chipTone: "action" };
    case "select-installer":
      return { headline: "Zgjidhni instaluesin dhe dërgoni ftesën", chip: "Hapi 2/6", chipTone: "action" };
    case "wait-installer":
      return { headline: "Presim instaluesin - do njoftoheni", chip: "Në pritje", chipTone: "waiting" };
    case "select-certifier":
      return { headline: "Zgjidhni certifikuesin dhe dërgoni ftesën", chip: "Hapi 4/6", chipTone: "action" };
    case "wait-certifier":
      return { headline: "Presim certifikuesin - do njoftoheni", chip: "Në pritje", chipTone: "waiting" };
    case "final-review":
      if (status === ApplicationStatus.RETURNED) {
        return { headline: "Korrigjoni dhe parashtrojeni përsëri", chip: "Korrigjim", chipTone: "action" };
      }
      if (status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES) {
        return { headline: "Ka problem me certifikimin - kontaktoni certifikuesin", chip: "Bllokuar", chipTone: "danger" };
      }
      return { headline: "Kontrolloni gjithçka dhe parashtrojeni", chip: "Hapi 6/6", chipTone: "action" };
    case "submitted":
    case "review":
      if (status === ApplicationStatus.PENDING_CHIEF_INSPECTOR) {
        return { headline: "Në pritje të miratimit final", chip: "Në shqyrtim", chipTone: "waiting" };
      }
      return { headline: "Aplikimi po shqyrtohet - nuk kërkohet veprim", chip: "Në shqyrtim", chipTone: "waiting" };
    case "completed":
      return { headline: "Regjistrimi u miratua", chip: "Miratuar", chipTone: "done" };
    case "rejected":
      return { headline: "Aplikimi u refuzua", chip: "Refuzuar", chipTone: "danger" };
    default:
      return { headline: "Vazhdoni me hapin më poshtë", chip: "Regjistrim", chipTone: "neutral" };
  }
}
