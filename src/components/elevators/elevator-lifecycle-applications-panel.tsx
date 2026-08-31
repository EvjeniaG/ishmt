"use client";

import Link from "next/link";
import { ApplicationType } from "@prisma/client";
import {
  ArrowRightLeft,
  ChevronRight,
  FilePenLine,
  RefreshCw,
  X,
  type LucideIcon,
} from "lucide-react";
import { ApplicationTypeGuide, ApplicationTypeSteps } from "@/components/applications/application-type-guide";
import { AppLink } from "@/components/shared/app-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  APPLICATION_TYPE_GUIDE,
  type ApplicationGuideKey,
} from "@/lib/constants/application-type-guide";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

type LifecycleAction = {
  guideKey: ApplicationGuideKey;
  href: string;
  icon: LucideIcon;
};

const LIFECYCLE_ACTIONS: LifecycleAction[] = [
  {
    guideKey: "OWNERSHIP_TRANSFER",
    href: "ownership-transfer",
    icon: ArrowRightLeft,
  },
  {
    guideKey: ApplicationType.DATA_UPDATE,
    href: "update",
    icon: RefreshCw,
  },
  {
    guideKey: ApplicationType.DATA_CORRECTION,
    href: "correction",
    icon: FilePenLine,
  },
];

function LifecycleCompactCard({
  action,
  onSelect,
}: {
  action: LifecycleAction;
  onSelect: (key: ApplicationGuideKey) => void;
}) {
  const guide = APPLICATION_TYPE_GUIDE[action.guideKey];
  const Icon = action.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(action.guideKey)}
      className="group flex w-full items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-4 py-3.5 text-left transition-colors hover:border-gov-primary/30 hover:bg-muted/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground group-hover:border-gov-primary/25 group-hover:text-gov-primary">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{guide.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {guide.tagline}
        </p>
        {guide.legalRef ? (
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {guide.legalRef}
          </p>
        ) : null}
      </div>
      <ChevronRight
        className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-gov-primary"
        aria-hidden
      />
    </button>
  );
}

function LifecycleDetailModal({
  guideKey,
  elevatorId,
  onClose,
}: {
  guideKey: ApplicationGuideKey;
  elevatorId: string;
  onClose: () => void;
}) {
  const guide = APPLICATION_TYPE_GUIDE[guideKey];
  const action = LIFECYCLE_ACTIONS.find((item) => item.guideKey === guideKey);
  const startHref = `/portal/applications/new/${action?.href}?elevatorId=${elevatorId}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lifecycle-detail-title"
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 id="lifecycle-detail-title" className="text-base font-semibold text-foreground">
              {guide.title}
            </h2>
            {guide.legalRef ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{guide.legalRef}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Mbyll"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <ApplicationTypeGuide guideKey={guideKey} />
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Hapat e procedurës
            </p>
            <ApplicationTypeSteps guideKey={guideKey} />
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-muted-foreground">
              <span className="block font-semibold text-foreground">Miratimi</span>
              {guide.approvers}
            </p>
            <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-muted-foreground">
              <span className="block font-semibold text-foreground">Pas miratimit</span>
              {guide.outcome}
            </p>
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <Button asChild className="w-full bg-gov-primary hover:bg-gov-secondary sm:w-auto">
            <Link href={startHref}>Fillo - {guide.shortTitle}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ElevatorLifecycleApplicationsPanel({ elevatorId }: { elevatorId: string }) {
  const [selectedKey, setSelectedKey] = useState<ApplicationGuideKey | null>(null);

  const closeModal = useCallback(() => setSelectedKey(null), []);

  useEffect(() => {
    if (!selectedKey) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedKey, closeModal]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">Aplikime për këtë ashensor</CardTitle>
            <CardDescription>
              Procedurat e lejuara pas regjistrimit fillestar - klikoni për udhëzimin e plotë.
            </CardDescription>
          </div>
          <AppLink
            href={`/portal/elevators/${elevatorId}?tab=applications`}
            className="shrink-0 text-sm font-medium text-gov-primary hover:underline"
          >
            Historiku i aplikimeve →
          </AppLink>
        </CardHeader>
        <CardContent>
          <div className={cn("grid gap-3", "sm:grid-cols-2 xl:grid-cols-3")}>
            {LIFECYCLE_ACTIONS.map((action) => (
              <LifecycleCompactCard
                key={action.guideKey}
                action={action}
                onSelect={setSelectedKey}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedKey ? (
        <LifecycleDetailModal
          guideKey={selectedKey}
          elevatorId={elevatorId}
          onClose={closeModal}
        />
      ) : null}
    </>
  );
}
