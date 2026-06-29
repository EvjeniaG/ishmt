import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApplicationStatus, ApplicationType, DataUpdateType } from "@prisma/client";
import type { RegistrationPhase } from "@/lib/registration/phase-router";
import {
  applicationBannerChipClass,
  getApplicationBannerContent,
  parseBannerStepProgress,
} from "@/lib/application/application-banner";
import { APPLICATION_TYPE_LABELS, OWNERSHIP_TRANSFER_LABEL } from "@/lib/constants/application-labels";
import type { RoleCode } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";

function applicationTypeLabel(type: ApplicationType, updateType?: string | null) {
  if (type === ApplicationType.DATA_UPDATE && updateType === DataUpdateType.OWNERSHIP_TRANSFER) {
    return OWNERSHIP_TRANSFER_LABEL;
  }
  return APPLICATION_TYPE_LABELS[type];
}

export function ApplicationPageBanner({
  applicationNumber,
  type,
  status,
  updateType,
  registrationPhase,
  roleCode,
  hasChanges,
  hasReason,
  hasModernization,
  ownershipAccepted,
  actions,
  compact,
}: {
  applicationNumber: string;
  type: ApplicationType;
  status: ApplicationStatus;
  updateType?: string | null;
  registrationPhase?: RegistrationPhase | null;
  roleCode?: RoleCode;
  hasChanges?: boolean;
  hasReason?: boolean;
  hasModernization?: boolean;
  ownershipAccepted?: boolean;
  actions?: React.ReactNode;
  /** Kur wizard-i i regjistrimit tregon statusin, mos përsërit banner-in e madh. */
  compact?: boolean;
}) {
  const content = getApplicationBannerContent({
    type,
    status,
    updateType,
    registrationPhase,
    roleCode,
    hasChanges,
    hasReason,
    hasModernization,
    ownershipAccepted,
  });

  const stepProgress = parseBannerStepProgress(content.chip);
  const progressPct = stepProgress
    ? Math.min(100, Math.round((stepProgress.current / stepProgress.total) * 100))
    : null;

  const backLink = (
    <Link
      href="/portal/applications"
      className="inline-flex w-full items-center justify-center gap-1.5 self-start rounded-xl border border-border/70 bg-background/80 px-3.5 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-all hover:border-gov-primary/30 hover:text-gov-primary hover:shadow-md sm:w-auto sm:justify-start"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Aplikimet
    </Link>
  );

  if (compact) {
    return (
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pb-5">
        <div className="min-w-0 flex-1">
          <span className="workflow-type-pill">{applicationTypeLabel(type, updateType)}</span>
          <p className="mt-2 break-all text-sm text-muted-foreground sm:break-normal">
            Nr. aplikimi:{" "}
            <span className="font-mono font-medium text-foreground">{applicationNumber}</span>
          </p>
        </div>
        <div className="w-full sm:w-auto sm:shrink-0">{backLink}</div>
      </div>
    );
  }

  return (
    <div className="workflow-hero relative overflow-hidden">
      <div className="workflow-hero-glow" aria-hidden />
      <div className="workflow-hero-glow-secondary" aria-hidden />

      <div className="relative workflow-hero-body">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="workflow-type-pill">{applicationTypeLabel(type, updateType)}</span>
            <span className={cn(applicationBannerChipClass(content.chipTone))}>{content.chip}</span>
          </div>
          <h1 className="workflow-hero-headline">{content.headline}</h1>
          <p className="workflow-hero-ref break-all sm:break-normal">
            Nr. aplikimi: <span className="workflow-hero-ref-num">{applicationNumber}</span>
          </p>
          {actions && <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">{actions}</div>}
        </div>
        <div className="w-full sm:w-auto sm:shrink-0">{backLink}</div>
      </div>

      {progressPct != null && stepProgress && (
        <div className="workflow-hero-progress">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Progresi i aplikimit</span>
            <span className="font-semibold text-gov-primary">
              Hapi {stepProgress.current} nga {stepProgress.total}
            </span>
          </div>
          <div className="workflow-progress-track">
            <div className="workflow-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
