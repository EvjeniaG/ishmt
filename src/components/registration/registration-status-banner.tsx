import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApplicationStatus } from "@prisma/client";
import type { RegistrationPhase } from "@/lib/registration/phase-router";
import {
  getRegistrationBannerContent,
  registrationBannerChipClass,
} from "@/lib/registration/registration-banner";
import type { RoleCode } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";

export function RegistrationStatusBanner({
  applicationNumber,
  phase,
  status,
  roleCode,
}: {
  applicationNumber: string;
  phase: RegistrationPhase;
  status: ApplicationStatus;
  roleCode?: RoleCode;
}) {
  const content = getRegistrationBannerContent(phase, status, roleCode);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-gradient-to-r from-card via-card to-muted/20 px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-mono text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {applicationNumber}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{content.headline}</p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
            registrationBannerChipClass(content.chipTone),
          )}
        >
          {content.chip}
        </span>
        <Link
          href="/portal/applications"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-gov-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Aplikimet
        </Link>
      </div>
    </div>
  );
}
