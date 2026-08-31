"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Info, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/institutional";
import {
  buildContractsFilterHref,
  type ContractIssueListFilters,
} from "@/lib/ishmt/contract-issue-filters";
import type { IshmtComplianceDigestSnapshot, IshmtDigestSectionNotifyStatus } from "@/lib/services/ishmt-compliance-digest-service";
import type { IshmtContractStats } from "@/lib/services/ishmt-contract-monitor-service";
import {
  notifyAllComplianceDigestAction,
  notifyExpiredContractsAction,
  notifyInspectionExpiring30Action,
  notifyMissingQrAction,
  type ComplianceDigestNotifyResult,
} from "@/lib/actions/ishmt-compliance-digest-actions";
import {
  buildComplianceNotifyFeedback,
  formatLastNotifiedLabel,
  notifyFeedbackToneClasses,
  type NotifyFeedbackTone,
} from "@/lib/ishmt/compliance-notify-feedback";

type MonitorSection = {
  id: keyof IshmtDigestSectionNotifyStatus | string;
  title: string;
  description: string;
  count: number;
  secondaryLabel?: string;
  listHref: string;
  notify?: () => Promise<ComplianceDigestNotifyResult>;
};

function NotifyFeedbackBanner({
  message,
  tone,
}: {
  message: string;
  tone: NotifyFeedbackTone;
}) {
  const Icon = tone === "success" ? CheckCircle2 : Info;

  return (
    <p
      className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${notifyFeedbackToneClasses(tone)}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  );
}

function applyNotifyResultToSectionStatus(
  current: IshmtDigestSectionNotifyStatus,
  sectionId: string,
  result: Extract<ComplianceDigestNotifyResult, { success: true }>,
): IshmtDigestSectionNotifyStatus {
  if (!(sectionId in current)) return current;
  const key = sectionId as keyof IshmtDigestSectionNotifyStatus;
  const nextAt = result.sentAt ?? result.lastSentAt;
  if (!nextAt) return current;
  return { ...current, [key]: nextAt };
}

function listHref(filters: Partial<ContractIssueListFilters>, base: ContractIssueListFilters): string {
  return `${buildContractsFilterHref(base, { ...filters, page: 1 })}#alarmet-lista`;
}

function buildSections(
  snapshot: IshmtComplianceDigestSnapshot,
  stats: IshmtContractStats,
  filterBase: ContractIssueListFilters,
  canNotify: boolean,
): MonitorSection[] {
  const expiring7 =
    stats.maintenanceContractExpiring7 + stats.inspectionContractExpiring7;
  const pending =
    stats.pendingMaintenanceContract + stats.pendingInspectionContract;

  const sections: MonitorSection[] = [
    {
      id: "expired",
      title: "Kontrata të skaduara",
      description:
        "Ashensorë aktivë me kontratë mirëmbajtjeje ose kontrolli periodik (OM) me datë mbarimi të kaluar.",
      count: snapshot.contractsExpiredTotal,
      secondaryLabel: `${snapshot.maintenanceContractExpired} mirëmbajtje · ${snapshot.inspectionContractExpired} kontroll periodik`,
      listHref: listHref({ issueCategory: "expired" }, filterBase),
      notify: canNotify ? notifyExpiredContractsAction : undefined,
    },
    {
      id: "inp-30",
      title: "INP skadon brenda 30 ditëve",
      description: "Kontrata e kontrollit periodik që kërkon rinovim ose veprim nga OM dhe pronari.",
      count: snapshot.inspectionContractExpiring30,
      listHref: listHref(
        { issue: "inspection-contract-expiring", expiringWithin: 30 },
        filterBase,
      ),
      notify: canNotify ? notifyInspectionExpiring30Action : undefined,
    },
    {
      id: "qr",
      title: "Mungon vendosja e QR",
      description:
        "Kompani/pronarë me ashensorë pa fotografi të konfirmuar të vendosjes së kodit QR.",
      count: snapshot.missingQrCompanies,
      secondaryLabel: `${snapshot.missingQrElevators} ashensorë`,
      listHref: "/ishmt/search?missingQrPlacement=1",
      notify: canNotify ? notifyMissingQrAction : undefined,
    },
    {
      id: "no-maintenance",
      title: "Pa kontratë mirëmbajtjeje",
      description: "Ashensorë aktivë pa kontratë aktive me kompaninë e mirëmbajtjes.",
      count: stats.noMaintenanceContract,
      listHref: listHref({ issue: "no-maintenance-contract" }, filterBase),
    },
    {
      id: "no-inspection",
      title: "Pa kontratë kontrolli periodik (OM)",
      description: "Ashensorë aktivë pa kontratë periodike me trupin certifikues.",
      count: stats.noInspectionContract,
      listHref: listHref({ issue: "no-inspection-contract" }, filterBase),
    },
    {
      id: "expiring-7",
      title: "Kontrata skadon brenda 7 ditëve",
      description: "Mirëmbajtje dhe kontroll periodik OM që kërkojnë veprim urgjent.",
      count: expiring7,
      secondaryLabel: `${stats.maintenanceContractExpiring7} mirëmbajtje · ${stats.inspectionContractExpiring7} kontroll periodik`,
      listHref: listHref({ issueCategory: "expiring", expiringWithin: 7 }, filterBase),
    },
    {
      id: "pending",
      title: "Kontrata në pritje pranimi",
      description: "Kontrata të dërguara te pronari, pa konfirmim ende.",
      count: pending,
      secondaryLabel: `${stats.pendingMaintenanceContract} mirëmbajtje · ${stats.pendingInspectionContract} kontroll periodik`,
      listHref: listHref({ issueCategory: "pending" }, filterBase),
    },
  ];

  return sections;
}

export function IshmtComplianceMonitorPanel({
  snapshot,
  stats,
  filters,
  canNotify,
  sectionNotifyStatus: initialSectionNotifyStatus,
}: {
  snapshot: IshmtComplianceDigestSnapshot;
  stats: IshmtContractStats;
  filters: ContractIssueListFilters;
  canNotify: boolean;
  sectionNotifyStatus?: IshmtDigestSectionNotifyStatus;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; tone: NotifyFeedbackTone } | null>(
    null,
  );
  const [sectionNotifyStatus, setSectionNotifyStatus] = useState<IshmtDigestSectionNotifyStatus>(
    initialSectionNotifyStatus ?? { expired: null, "inp-30": null, qr: null },
  );

  const sections = buildSections(snapshot, stats, filters, canNotify);
  const highlightSections = sections.slice(0, 3);
  const detailSections = sections.slice(3);
  const hasAnyIssue = sections.some((section) => section.count > 0);
  const hasNotifyableIssue = highlightSections.some((section) => section.count > 0);

  async function runAction(section: MonitorSection) {
    if (!section.notify) return;
    setBusyId(section.id);
    setFeedback(null);
    const result = await section.notify();
    setBusyId(null);

    if (!result.success) {
      setFeedback({ message: result.error ?? "Njoftimi dështoi.", tone: "warning" });
      return;
    }

    setSectionNotifyStatus((current) =>
      applyNotifyResultToSectionStatus(current, section.id, result),
    );
    setFeedback(
      buildComplianceNotifyFeedback({
        ...result,
        contextLabel: section.title,
      }),
    );
  }

  async function notifyAll() {
    setBusyId("all");
    setFeedback(null);
    const result = await notifyAllComplianceDigestAction();
    setBusyId(null);

    if (!result.success) {
      setFeedback({ message: result.error ?? "Njoftimi dështoi.", tone: "warning" });
      return;
    }

    setSectionNotifyStatus((current) => {
      let next = { ...current };
      for (const section of highlightSections) {
        if (section.count > 0) {
          next = applyNotifyResultToSectionStatus(next, section.id, result);
        }
      }
      return next;
    });
    setFeedback(
      buildComplianceNotifyFeedback({
        ...result,
        contextLabel: "kategoritë kryesore",
      }),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Përditësimi i fundit:{" "}
          <span className="font-medium text-foreground">{snapshot.dateKey}</span>
          <span className="mx-2 text-border">·</span>
          <span>{stats.totalActive} ashensorë aktivë në regjistër</span>
        </p>
        {canNotify && (
          <Button
            type="button"
            size="sm"
            disabled={!hasNotifyableIssue || busyId !== null}
            onClick={() => void notifyAll()}
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {busyId === "all" ? "Duke dërguar…" : "Njofto palët (kryesore)"}
          </Button>
        )}
      </div>

      {feedback && <NotifyFeedbackBanner message={feedback.message} tone={feedback.tone} />}

      <div className="grid gap-4 md:grid-cols-3">
        {highlightSections.map((section) => (
          <MetricCard
            key={section.id}
            label={section.title}
            value={section.count}
            subtitle={section.secondaryLabel ?? section.description}
            accent={section.count > 0 ? "danger" : "primary"}
            interactive={false}
          />
        ))}
      </div>

      {highlightSections.map((section) => {
        const lastNotifiedLabel =
          section.id in sectionNotifyStatus
            ? formatLastNotifiedLabel(
                sectionNotifyStatus[section.id as keyof IshmtDigestSectionNotifyStatus],
              )
            : null;

        return (
        <SectionCard key={section.id} title={section.title} subtitle={section.description} padded>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-semibold tabular-nums">{section.count}</p>
              {section.secondaryLabel && (
                <p className="mt-1 text-sm text-muted-foreground">{section.secondaryLabel}</p>
              )}
              {lastNotifiedLabel && (
                <p className="mt-2 inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900">
                  {lastNotifiedLabel}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild type="button" size="sm" variant="outline">
                <Link href={section.listHref}>Shiko listën</Link>
              </Button>
              {section.notify && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={section.count === 0 || busyId !== null}
                  onClick={() => void runAction(section)}
                >
                  <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                  {busyId === section.id ? "Duke dërguar…" : "Njofto palët"}
                </Button>
              )}
            </div>
          </div>
        </SectionCard>
        );
      })}

      <SectionCard
        title="Kontrata & afatet - detaje"
        subtitle="Të gjitha kategoritë e monitorimit kontraktual. Për njoftime të personalizuara, filtroni listën më poshtë."
        padded
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {detailSections.map((section) => (
            <div
              key={section.id}
              className="flex flex-col justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-4"
            >
              <div>
                <p className="font-medium text-foreground">{section.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{section.count}</p>
                {section.secondaryLabel && (
                  <p className="mt-1 text-xs text-muted-foreground">{section.secondaryLabel}</p>
                )}
              </div>
              <Button asChild type="button" size="sm" variant="outline" className="w-fit">
                <Link href={section.listHref}>Shiko listën</Link>
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>

      {!hasAnyIssue && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Sot nuk ka alarme në këto kategori. Do të merrni njoftim ditor kur të shfaqen raste të reja.
        </p>
      )}
    </div>
  );
}
