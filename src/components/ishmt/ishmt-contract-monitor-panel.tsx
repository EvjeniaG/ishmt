import Link from "next/link";
import { IshmtContractIssueRowActions } from "@/components/ishmt/ishmt-contract-issue-row-actions";
import {
  AlertTriangle,
  CalendarClock,
  Clock3,
  FileWarning,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { PortalEmptyState } from "@/components/shared/portal-table";
import { IshmtContractIssuesPagination } from "@/components/ishmt/ishmt-contract-issues-pagination";
import { cn } from "@/lib/utils";
import type { IshmtContractIssueRow, IshmtContractStats } from "@/lib/services/ishmt-contract-monitor-service";
import {
  buildContractsFilterHref,
  type ContractIssueListFilters,
} from "@/lib/ishmt/contract-issue-filters";

export const CONTRACT_ISSUE_LABELS: Record<string, string> = {
  "no-maintenance-contract": "Pa kontratë mirëmbajtjeje",
  "no-inspection-contract": "Pa kontratë kontrolli periodik (OM)",
  "maintenance-contract-expired": "Kontrata mirëmbajtjes skaduar",
  "inspection-contract-expired": "Kontrata e kontrollit periodik skaduar",
  "maintenance-contract-expiring": "Mirëmbajtje skadon së shpejti",
  "inspection-contract-expiring": "Kontroll periodik skadon së shpejti",
  "pending-maintenance-contract": "Mirëmbajtje në pritje pranimi",
  "pending-inspection-contract": "Kontroll periodik në pritje pranimi",
};

const SEVERITY_BADGE = {
  critical: "portal-badge-danger",
  warning: "portal-badge-warning",
  info: "portal-badge-info",
} as const;

const SEVERITY_LABELS = {
  critical: "Kritike",
  warning: "Monitorim",
  info: "Info",
} as const;

type StatCard = {
  key: string;
  label: string;
  hint: string;
  value: number;
  href: string;
  filter: Partial<ContractIssueListFilters>;
  emphasis?: boolean;
  icon: LucideIcon;
  tone: "danger" | "warning" | "primary" | "neutral";
};

type StatGroup = {
  title: string;
  description: string;
  cards: StatCard[];
};

function isStatCardActive(
  card: StatCard,
  filters: ContractIssueListFilters,
): boolean {
  return Object.entries(card.filter).every(
    ([key, value]) => filters[key as keyof ContractIssueListFilters] === value,
  );
}

function buildStatGroups(
  stats: IshmtContractStats,
  filterBase: ContractIssueListFilters,
): StatGroup[] {
  const link = (partial: Partial<ContractIssueListFilters>) =>
    `${buildContractsFilterHref(filterBase, { ...partial, page: 1 })}#alarmet-lista`;

  return [
    {
      title: "Mungesa kritike",
      description: "Ashensorë aktivë pa mbulim kontraktual",
      cards: [
        {
          key: "no-maintenance-contract",
          label: "Pa kontratë mirëmbajtjeje",
          hint: "Pa kontratë aktive - shpesh edhe pa kompani të caktuar",
          value: stats.noMaintenanceContract,
          href: link({ issue: "no-maintenance-contract" }),
          filter: { issue: "no-maintenance-contract" },
          emphasis: true,
          icon: FileWarning,
          tone: "danger",
        },
        {
          key: "no-inspection-contract",
          label: "Pa kontratë OM",
          hint: "Mungon kontrata periodike me trupin certifikues",
          value: stats.noInspectionContract,
          href: link({ issue: "no-inspection-contract" }),
          filter: { issue: "no-inspection-contract" },
          emphasis: true,
          icon: ShieldAlert,
          tone: "danger",
        },
      ],
    },
    {
      title: "Skadimet",
      description: "Kontrata me datë mbarimi të kaluar ose afër",
      cards: [
        {
          key: "maintenance-contract-expired",
          label: "Mirëmbajtje e skaduar",
          hint: "Kontrata aktive me afat të tejkaluar",
          value: stats.maintenanceContractExpired,
          href: link({ issue: "maintenance-contract-expired" }),
          filter: { issue: "maintenance-contract-expired" },
          emphasis: true,
          icon: AlertTriangle,
          tone: "danger",
        },
        {
          key: "inspection-contract-expired",
          label: "Kontroll i skaduar",
          hint: "Kontrata OM me datë mbarimi të kaluar",
          value: stats.inspectionContractExpired,
          href: link({ issue: "inspection-contract-expired" }),
          filter: { issue: "inspection-contract-expired" },
          emphasis: true,
          icon: AlertTriangle,
          tone: "danger",
        },
        {
          key: "maintenance-expiring-7",
          label: "Mirëmbajtje ≤7 ditë",
          hint: "Kërkon rinovim urgjent",
          value: stats.maintenanceContractExpiring7,
          href: link({ issue: "maintenance-contract-expiring", expiringWithin: 7 }),
          filter: { issue: "maintenance-contract-expiring", expiringWithin: 7 },
          emphasis: stats.maintenanceContractExpiring7 > 0,
          icon: CalendarClock,
          tone: "warning",
        },
        {
          key: "inspection-expiring-7",
          label: "Kontroll ≤7 ditë",
          hint: "Afati i kontratës OM po afrohet",
          value: stats.inspectionContractExpiring7,
          href: link({ issue: "inspection-contract-expiring", expiringWithin: 7 }),
          filter: { issue: "inspection-contract-expiring", expiringWithin: 7 },
          emphasis: stats.inspectionContractExpiring7 > 0,
          icon: CalendarClock,
          tone: "warning",
        },
        {
          key: "maintenance-expiring-30",
          label: "Mirëmbajtje ≤30 ditë",
          hint: "Planifikoni rinovimin",
          value: stats.maintenanceContractExpiring30,
          href: link({ issue: "maintenance-contract-expiring", expiringWithin: 30 }),
          filter: { issue: "maintenance-contract-expiring", expiringWithin: 30 },
          icon: Clock3,
          tone: "neutral",
        },
        {
          key: "inspection-expiring-30",
          label: "Kontroll ≤30 ditë",
          hint: "Monitorim i afatit kontraktual",
          value: stats.inspectionContractExpiring30,
          href: link({ issue: "inspection-contract-expiring", expiringWithin: 30 }),
          filter: { issue: "inspection-contract-expiring", expiringWithin: 30 },
          icon: Clock3,
          tone: "neutral",
        },
      ],
    },
    {
      title: "Në pritje pranimi",
      description: "Kontrata të dërguara te pronari, pa konfirmim ende",
      cards: [
        {
          key: "pending-maintenance-contract",
          label: "Mirëmbajtje në pritje",
          hint: "Pronari duhet të pranojë kontratën",
          value: stats.pendingMaintenanceContract,
          href: link({ issue: "pending-maintenance-contract" }),
          filter: { issue: "pending-maintenance-contract" },
          icon: Wrench,
          tone: "primary",
        },
        {
          key: "pending-inspection-contract",
          label: "Kontroll në pritje",
          hint: "Kontrata OM në pritje pranimi",
          value: stats.pendingInspectionContract,
          href: link({ issue: "pending-inspection-contract" }),
          filter: { issue: "pending-inspection-contract" },
          icon: ShieldAlert,
          tone: "primary",
        },
      ],
    },
  ];
}

const TONE_STYLES = {
  danger: {
    card: "border-red-200/70 from-red-500/[0.04]",
    icon: "bg-red-100 text-red-700",
    value: "text-gov-danger",
  },
  warning: {
    card: "border-amber-200/70 from-amber-500/[0.05]",
    icon: "bg-amber-100 text-amber-800",
    value: "text-gov-warning",
  },
  primary: {
    card: "border-gov-primary/20 from-gov-primary/[0.04]",
    icon: "bg-gov-primary/10 text-gov-primary",
    value: "text-gov-primary",
  },
  neutral: {
    card: "border-border/80 from-muted/30",
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground",
  },
} as const;

function ContractStatCard({
  card,
  active,
}: {
  card: StatCard;
  active?: boolean;
}) {
  const styles = TONE_STYLES[card.tone];
  const Icon = card.icon;

  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br p-4",
        styles.card,
        card.value === 0 && "opacity-75",
        active && "ring-2 ring-gov-primary/40 ring-offset-2",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", styles.icon)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className={cn("text-2xl font-bold tabular-nums tracking-tight", styles.value)}>{card.value}</p>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold leading-snug text-foreground">{card.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{card.hint}</p>
      </div>
    </div>
  );
}

export function IshmtContractOverview({
  stats,
  filterBase,
}: {
  stats: IshmtContractStats;
  filterBase: ContractIssueListFilters;
}) {
  const urgent =
    stats.noMaintenanceContract +
    stats.noInspectionContract +
    stats.maintenanceContractExpired +
    stats.inspectionContractExpired;
  const expiringSoon =
    stats.maintenanceContractExpiring7 + stats.inspectionContractExpiring7;
  const pending =
    stats.pendingMaintenanceContract + stats.pendingInspectionContract;

  const kpis: Array<{
    label: string;
    value: number;
    accent: "primary" | "warning" | "danger" | "success";
    subtitle: string;
    active: boolean;
  }> = [
    {
      label: "Ashensorë aktivë",
      value: stats.totalActive,
      accent: "primary",
      subtitle: "Në regjistër kombëtar",
      active: !filterBase.issue && !filterBase.issueCategory && !filterBase.severity && !filterBase.expiringWithin,
    },
    {
      label: "Mungesa kritike",
      value: urgent,
      accent: urgent > 0 ? "danger" : "success",
      subtitle: "Pa kontratë ose të skaduara",
      active: filterBase.issueCategory === "missing",
    },
    {
      label: "Skadim ≤7 ditë",
      value: expiringSoon,
      accent: expiringSoon > 0 ? "warning" : "primary",
      subtitle: "Mirëmbajtje dhe kontroll periodik OM",
      active: filterBase.issueCategory === "expiring" && filterBase.expiringWithin === 7,
    },
    {
      label: "Në pritje pranimi",
      value: pending,
      accent: "primary",
      subtitle: "Kontrata te pronari",
      active: filterBase.issueCategory === "pending",
    },
  ];

  return (
    <div className="portal-kpi-grid sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={cn("rounded-xl", kpi.active && "ring-2 ring-gov-primary/40 ring-offset-2")}
        >
          <MetricCard
            label={kpi.label}
            value={kpi.value}
            accent={kpi.accent}
            subtitle={kpi.subtitle}
            interactive={false}
          />
        </div>
      ))}
    </div>
  );
}

export function IshmtContractStatsPanel({
  stats,
  filters,
}: {
  stats: IshmtContractStats;
  filters: ContractIssueListFilters;
}) {
  const groups = buildStatGroups(stats, filters);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.title}>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.cards.map((card) => (
              <ContractStatCard
                key={card.key}
                card={card}
                active={isStatCardActive(card, filters)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function fmtDueDate(date: Date | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("sq-AL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function IshmtContractIssuesTable({
  issues,
  total,
  page = 1,
  pageSize = 50,
  totalPages = 1,
  prevHref,
  nextHref,
  matchedElevator,
  searchQuery,
}: {
  issues: IshmtContractIssueRow[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  prevHref?: string;
  nextHref?: string;
  matchedElevator?: {
    id: string;
    registryNumber: string;
    buildingAddress: string;
    municipality: { nameSq: string };
  } | null;
  searchQuery?: string;
}) {
  if (issues.length === 0) {
    if (matchedElevator) {
      return (
        <div className="space-y-3">
          <PortalEmptyState>
            Ashensori {matchedElevator.registryNumber} është në regjistër aktiv
            {matchedElevator.municipality?.nameSq
              ? ` (${matchedElevator.municipality.nameSq})`
              : ""}
            , por nuk ka alarm kontratash për filtrin aktual - kontratat e mirëmbajtjes  dhe OM
            duken në rregull. Kjo faqe liston vetëm raste me problem (pa kontratë, skadim, pritje
            pranimi).
          </PortalEmptyState>
          <Link
            href={`/portal/elevators/${matchedElevator.id}`}
            className="inline-flex text-sm font-medium text-gov-primary hover:underline"
          >
            Hap dosjen e ashensorit →
          </Link>
        </div>
      );
    }

    return (
      <PortalEmptyState>
        {searchQuery ? (
          <>
            Nuk u gjet ashensor aktiv ose alarm për «{searchQuery}». Provoni Regjistrin kombëtar
            (/ishmt/search).
          </>
        ) : (
          "Nuk ka raste për filtrin e zgjedhur. Regjistri është në rregull për këtë kategori."
        )}
      </PortalEmptyState>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="max-h-[min(28rem,55vh)] overflow-auto overscroll-contain">
        <div className="portal-table-wrap overflow-visible">
          <table className="portal-table">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 w-36 bg-gov-surface shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                  Prioriteti
                </th>
                <th className="sticky top-0 z-10 bg-gov-surface shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                  Ashensori
                </th>
                <th className="sticky top-0 z-10 bg-gov-surface shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                  Problemi
                </th>
                <th className="sticky top-0 z-10 bg-gov-surface shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                  Personi përgjegjës
                </th>
                <th className="sticky top-0 z-10 bg-gov-surface shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                  Bashkia
                </th>
                <th className="sticky top-0 z-10 bg-gov-surface shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                  Mirëmbajtja
                </th>
                <th className="sticky top-0 z-10 bg-gov-surface shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                  OM
                </th>
                <th className="sticky top-0 z-10 bg-gov-surface shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                  Skadimi
                </th>
                <th className="sticky top-0 z-10 w-20 bg-gov-surface shadow-[inset_0_-1px_0_0_hsl(var(--border))]" />
              </tr>
            </thead>
            <tbody>
              {issues.map((row) => (
                <tr key={`${row.elevatorId}-${row.issueType}`} className="align-top">
                  <td>
                    <span className={cn("inline-flex whitespace-nowrap", SEVERITY_BADGE[row.severity])}>
                      {SEVERITY_LABELS[row.severity]}
                    </span>
                  </td>
                  <td>
                    <p className="font-semibold tabular-nums tracking-tight">{row.registryNumber}</p>
                    <p className="mt-0.5 max-w-[14rem] text-xs leading-relaxed text-muted-foreground">
                      {row.buildingAddress}
                    </p>
                  </td>
                  <td>
                    <p className="text-sm font-medium text-foreground">{row.issueLabel}</p>
                  </td>
                  <td>
                    <p className="text-sm">{row.ownerName}</p>
                    {row.ownerNipt && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.ownerNipt}</p>
                    )}
                  </td>
                  <td className="text-sm">{row.municipality}</td>
                  <td className="text-sm">{row.maintenanceCompany ?? "-"}</td>
                  <td className="text-sm">{row.inspectionCompany ?? "-"}</td>
                  <td className="tabular-nums text-sm">{fmtDueDate(row.dueDate)}</td>
                  <td>
                    <IshmtContractIssueRowActions row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && (
        <IshmtContractIssuesPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          prevHref={prevHref}
          nextHref={nextHref}
        />
      )}
    </div>
  );
}
