import { ApplicationStatus, ApplicationType, DataUpdateType } from "@prisma/client";
import type { RegistrationPhase } from "@/lib/registration/phase-router";
import { getRegistrationBannerContent } from "@/lib/registration/registration-banner";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";

export type ApplicationBannerContent = {
  headline: string;
  chip: string;
  chipTone: "action" | "waiting" | "done" | "danger" | "neutral";
};

export function applicationBannerChipClass(tone: ApplicationBannerContent["chipTone"]) {
  const styles = {
    action: "workflow-status-action",
    waiting: "workflow-status-waiting",
    done: "workflow-status-done",
    danger: "workflow-status-danger",
    neutral: "workflow-status-outline",
  } as const;
  return styles[tone];
}

/** Nxjerr progresin nga chip "Hapi 2/6" ose "Hapi 2–4". */
export function parseBannerStepProgress(chip: string): { current: number; total: number } | null {
  const slash = chip.match(/^Hapi (\d+)\/(\d+)$/);
  if (slash) return { current: Number(slash[1]), total: Number(slash[2]) };
  const range = chip.match(/^Hapi (\d+)[–-](\d+)$/);
  if (range) return { current: Number(range[1]), total: Number(range[2]) };
  return null;
}

function postSubmitHeadline(status: ApplicationStatus): ApplicationBannerContent | null {
  if (status === ApplicationStatus.SUBMITTED || status === ApplicationStatus.UNDER_REVIEW) {
    return { headline: "Aplikimi po shqyrtohet - nuk kërkohet veprim", chip: "Në shqyrtim", chipTone: "waiting" };
  }
  if (status === ApplicationStatus.PENDING_CHIEF_INSPECTOR) {
    return { headline: "Në pritje të miratimit final", chip: "Në shqyrtim", chipTone: "waiting" };
  }
  if (
    status === ApplicationStatus.APPROVED ||
    status === ApplicationStatus.ELEVATOR_CREATED ||
    status === ApplicationStatus.ASSETS_GENERATED ||
    status === ApplicationStatus.CLOSED
  ) {
    return { headline: "Aplikimi u miratua", chip: "Miratuar", chipTone: "done" };
  }
  if (status === ApplicationStatus.REJECTED) {
    return { headline: "Aplikimi u refuzua", chip: "Refuzuar", chipTone: "danger" };
  }
  return null;
}

export function getApplicationBannerContent(input: {
  type: ApplicationType;
  status: ApplicationStatus;
  updateType?: string | null;
  registrationPhase?: RegistrationPhase | null;
  roleCode?: RoleCode;
  hasChanges?: boolean;
  hasReason?: boolean;
  hasModernization?: boolean;
  ownershipAccepted?: boolean;
}): ApplicationBannerContent {
  const post = postSubmitHeadline(input.status);
  if (post) return post;

  if (input.type === ApplicationType.NEW_REGISTRATION && input.registrationPhase) {
    return getRegistrationBannerContent(input.registrationPhase, input.status, input.roleCode);
  }

  const editable =
    input.status === ApplicationStatus.DRAFT || input.status === ApplicationStatus.RETURNED;

  if (input.type === ApplicationType.MODERNIZATION) {
    if (editable && !input.hasModernization) {
      return { headline: "Plotësoni të dhënat e modernizimit", chip: "Hapi 1/5", chipTone: "action" };
    }
    if (editable) {
      return { headline: "Zgjidhni instaluesin dhe certifikuesin", chip: "Hapi 2–4", chipTone: "action" };
    }
    return { headline: "Modernizimi në proces", chip: "Në proces", chipTone: "neutral" };
  }

  if (input.type === ApplicationType.DEREGISTRATION) {
    if (editable) {
      return { headline: "Ngarkoni dokumentet dhe parashtrojeni", chip: "Hapi 3/4", chipTone: "action" };
    }
    return { headline: "Çregjistrim ashensori", chip: "Në proces", chipTone: "neutral" };
  }

  if (input.type === ApplicationType.DATA_CORRECTION) {
    if (editable && !input.hasChanges) {
      return { headline: "Tregoni çfarë duhet korrigjuar", chip: "Hapi 2/4", chipTone: "action" };
    }
    if (editable) {
      return { headline: "Ngarkoni dokumentet dhe parashtrojeni", chip: "Hapi 3/4", chipTone: "action" };
    }
    return { headline: "Ndryshim të dhënash", chip: "Në proces", chipTone: "neutral" };
  }

  if (input.type === ApplicationType.DATA_UPDATE && input.updateType === DataUpdateType.OWNERSHIP_TRANSFER) {
    if (input.roleCode === ROLE_CODES.OWNER && !input.ownershipAccepted) {
      return { headline: "Dërgoni ftesën te personi përgjegjës i ashensorit i ri", chip: "Hapi 2/5", chipTone: "action" };
    }
    if (input.ownershipAccepted) {
      return { headline: "Parashtro aplikimin te IQMT", chip: "Hapi 3/4", chipTone: "action" };
    }
    return { headline: "Transferim pronësie", chip: "Në proces", chipTone: "neutral" };
  }

  if (input.type === ApplicationType.DATA_UPDATE) {
    if (editable && !input.hasChanges) {
      return { headline: "Zgjidhni çfarë ndryshon dhe plotësoni fushat", chip: "Hapi 2/5", chipTone: "action" };
    }
    if (editable) {
      return { headline: "Ngarkoni dokumentet dhe parashtrojeni", chip: "Hapi 4/5", chipTone: "action" };
    }
    return { headline: "Përditësim të dhënave", chip: "Në proces", chipTone: "neutral" };
  }

  if (input.status === ApplicationStatus.RETURNED) {
    return { headline: "Korrigjoni dhe parashtrojeni përsëri", chip: "Korrigjim", chipTone: "action" };
  }

  return { headline: "Vazhdoni me hapin më poshtë", chip: "Aplikim", chipTone: "neutral" };
}
