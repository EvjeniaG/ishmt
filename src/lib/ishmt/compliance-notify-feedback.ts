import { formatDateSq, formatDateTimeSq } from "@/lib/format-date";

export const COMPLIANCE_NOTIFY_COOLDOWN_DAYS = 7;

export type ComplianceNotifyStats = {
  created: number;
  skipped: number;
  organizations: number;
  lastSentAt: string | null;
  sentAt: string | null;
};

export type NotifyFeedbackTone = "success" | "info" | "warning" | "muted";

export type NotifyCooldownInfo = {
  lastSentAt: Date;
  availableAgainAt: Date;
  daysRemaining: number;
};

export function getNotifyCooldownInfo(
  lastSentAt: string | Date | null | undefined,
): NotifyCooldownInfo | null {
  if (!lastSentAt) return null;

  const sent = typeof lastSentAt === "string" ? new Date(lastSentAt) : lastSentAt;
  if (Number.isNaN(sent.getTime())) return null;

  const availableAgainAt = new Date(sent);
  availableAgainAt.setDate(availableAgainAt.getDate() + COMPLIANCE_NOTIFY_COOLDOWN_DAYS);

  const msRemaining = availableAgainAt.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

  return { lastSentAt: sent, availableAgainAt, daysRemaining };
}

function formatDaysRemaining(days: number): string {
  if (days === 1) return "1 dite";
  return `${days} ditësh`;
}

export function buildAlreadyNotifiedMessage(lastSentAt: string | Date | null | undefined): string {
  const cooldown = getNotifyCooldownInfo(lastSentAt);
  if (!cooldown) {
    return "Palët u njoftuan tashmë së fundmi.";
  }

  const sentLabel = formatDateTimeSq(cooldown.lastSentAt);
  const againLabel = formatDateTimeSq(cooldown.availableAgainAt);

  if (cooldown.daysRemaining === 0) {
    return `Palët u njoftuan më ${sentLabel}. Mund t'i njoftoni përsëri nga ${againLabel}.`;
  }

  return `Palët u njoftuan më ${sentLabel}. Mund t'i njoftoni përsëri pas ${formatDaysRemaining(cooldown.daysRemaining)}, më ${againLabel}.`;
}

export function buildComplianceNotifyFeedback(
  input: ComplianceNotifyStats & { contextLabel?: string },
): { message: string; tone: NotifyFeedbackTone } {
  const ctx = input.contextLabel ? ` - ${input.contextLabel}` : "";

  if (input.created > 0 && input.skipped === 0) {
    const when = input.sentAt ? ` (${formatDateTimeSq(input.sentAt)})` : "";
    return {
      tone: "success",
      message: `${input.created} njoftime u dërguan te ${input.organizations} organizata${ctx}${when}.`,
    };
  }

  if (input.created > 0 && input.skipped > 0) {
    return {
      tone: "success",
      message: `${input.created} njoftime të reja u dërguan${ctx}; ${input.skipped} ishin njoftuar tashmë.`,
    };
  }

  if (input.created === 0 && input.skipped > 0) {
    return {
      tone: "info",
      message: buildAlreadyNotifiedMessage(input.lastSentAt),
    };
  }

  return {
    tone: "warning",
    message: `Nuk u krijuan njoftime${ctx}. Kontrolloni që organizatat kanë përdorues aktivë.`,
  };
}

export function notifyFeedbackToneClasses(tone: NotifyFeedbackTone): string {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "info":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "warning":
      return "border-orange-200 bg-orange-50 text-orange-900";
    default:
      return "border-border/70 bg-muted/30 text-muted-foreground";
  }
}

export function formatLastNotifiedLabel(lastSentAt: string | null | undefined): string | null {
  if (!lastSentAt) return null;

  const cooldown = getNotifyCooldownInfo(lastSentAt);
  if (!cooldown) return null;

  const sentLabel = formatDateTimeSq(cooldown.lastSentAt);
  const againDateLabel = formatDateSq(cooldown.availableAgainAt);

  if (cooldown.daysRemaining === 0) {
    return `Njoftuar më ${sentLabel} · përsëri nga ${againDateLabel}`;
  }

  return `Njoftuar më ${sentLabel} · përsëri pas ${formatDaysRemaining(cooldown.daysRemaining)} (${againDateLabel})`;
}

export function serializeComplianceNotifyStats(input: {
  created: number;
  skipped: number;
  organizations: number;
  lastSentAt: Date | null;
  sentAt: Date | null;
}): ComplianceNotifyStats {
  return {
    created: input.created,
    skipped: input.skipped,
    organizations: input.organizations,
    lastSentAt: input.lastSentAt?.toISOString() ?? null,
    sentAt: input.sentAt?.toISOString() ?? null,
  };
}
