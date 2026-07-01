import Link from "next/link";
import { ComplianceIndicator } from "@prisma/client";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/institutional";
import { PortalTableWrap } from "@/components/shared/portal-table";
import { ComplianceService } from "@/lib/services/compliance-service";
import type { IshmtDashboardService } from "@/lib/services/ishmt-dashboard-service";
import { cn } from "@/lib/utils";

type Metrics = Awaited<ReturnType<typeof IshmtDashboardService.getMetrics>>;

const ELEVATOR_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Në shërbim",
  SUSPENDED: "Pezulluar",
  UNVERIFIED: "I paverifikuar",
  PENDING_CONFIRMATION: "Në pritje konfirmimi",
  PENDING_REGISTRATION: "Në pritje regjistrimi",
  REGISTERED: "I regjistruar",
  DEREGISTERED: "I çregjistruar",
  UNDER_INSPECTION: "Në inspektim",
  EXPIRED_CERTIFICATION: "Certifikatë e skaduar",
  MAINTENANCE_OVERDUE: "Mirëmbajtje e vonuar",
  OUT_OF_SERVICE: "Jashtë shërbimit",
};

function indicatorCount(
  byIndicator: Metrics["complianceSummary"]["byIndicator"],
  indicator: ComplianceIndicator,
) {
  return byIndicator.find((i) => i.indicator === indicator)?._count.indicator ?? 0;
}

export function IshmtDashboardKpi({ metrics }: { metrics: Metrics }) {
  const activeCount =
    metrics.elevatorByStatus.find((s) => s.status === "ACTIVE")?._count.status ?? 0;
  const overdue = metrics.queues.legalDeadlineOverdue;
  const redCount = metrics.complianceSummary.activeRed ?? 0;

  return (
    <div className="portal-kpi-grid sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Regjistri kombëtar"
        value={metrics.elevatorTotal}
        accent="primary"
        subtitle="Ashensorë në regjistrin digjital"
      />
      <MetricCard
        label="Në shërbim"
        value={activeCount}
        accent="success"
        subtitle="Status aktiv në regjistër"
      />
      <MetricCard
        label="Jashtë përputhshmërisë"
        value={redCount}
        accent={redCount > 0 ? "danger" : "primary"}
        subtitle="Ashensorë aktivë me indikator të kuq"
      />
      <MetricCard
        label="Afate procedurale të tejkaluara"
        value={overdue}
        accent={overdue > 0 ? "danger" : "primary"}
        subtitle="Aplikime jashtë afatit 10-ditor"
      />
    </div>
  );
}

export function IshmtDashboardStats({ metrics }: { metrics: Metrics }) {
  const green = indicatorCount(metrics.complianceSummary.byIndicator, ComplianceIndicator.GREEN);
  const yellow = indicatorCount(metrics.complianceSummary.byIndicator, ComplianceIndicator.YELLOW);
  const red = indicatorCount(metrics.complianceSummary.byIndicator, ComplianceIndicator.RED);

  const complianceRows = [
    {
      key: "green",
      label: ComplianceService.getLabel(ComplianceIndicator.GREEN),
      value: green,
      href: "/ishmt/search?compliance=GREEN",
      emphasis: false,
    },
    {
      key: "yellow",
      label: ComplianceService.getLabel(ComplianceIndicator.YELLOW),
      value: yellow,
      href: "/ishmt/search?compliance=YELLOW",
      emphasis: false,
    },
    {
      key: "red",
      label: ComplianceService.getLabel(ComplianceIndicator.RED),
      value: red,
      href: "/ishmt/search?compliance=RED",
      emphasis: red > 0,
    },
    ...(metrics.complianceSummary.gapCounts
      ? [
          {
            key: "missing-inspection",
            label: "Mungesë inspektimi të regjistruar",
            value: metrics.complianceSummary.gapCounts.missingInspection,
            href: "/ishmt/search?complianceGap=missing-inspection",
            emphasis: metrics.complianceSummary.gapCounts.missingInspection > 0,
          },
          {
            key: "missing-company",
            label: "Mungesë kompanie mirëmbajtjeje",
            value: metrics.complianceSummary.gapCounts.missingMaintenanceCompany,
            href: "/ishmt/search?complianceGap=missing-maintenance-company",
            emphasis: metrics.complianceSummary.gapCounts.missingMaintenanceCompany > 0,
          },
          {
            key: "missing-record",
            label: "Mungesë regjistrimi mirëmbajtjeje",
            value: metrics.complianceSummary.gapCounts.missingMaintenanceRecord,
            href: "/ishmt/search?complianceGap=missing-maintenance-record",
            emphasis: metrics.complianceSummary.gapCounts.missingMaintenanceRecord > 0,
          },
          {
            key: "missing-qr-photo",
            label: "Pa foto vendosjeje QR",
            value: metrics.placementMissingQr,
            href: "/ishmt/search?missingQrPlacement=1",
            emphasis: metrics.placementMissingQr > 0,
          },
        ]
      : []),
  ];

  const proceduralRows = [
    { label: "Aplikime në pritje marrjeje", value: metrics.queues.submitted },
    { label: "Dosje në shqyrtim", value: metrics.queues.pendingReview },
    { label: "Në pritje të vendimit final", value: metrics.queues.pendingAdmin },
    {
      label: "Afat procedural i tejkaluar",
      value: metrics.queues.legalDeadlineOverdue,
      emphasis: metrics.queues.legalDeadlineOverdue > 0,
    },
    {
      label: "Afat procedural në skadim",
      value: metrics.queues.legalDeadlineUrgent,
      emphasis: metrics.queues.legalDeadlineUrgent > 0,
    },
    { label: "Parashtrime (7 ditë)", value: metrics.activity.applicationsThisWeek },
    { label: "Miratime (7 ditë)", value: metrics.activity.recentApprovals },
    { label: "Raportime publike", value: metrics.queues.pendingReports },
    { label: "Konfirmim regjistrimi", value: metrics.queues.pendingMigration },
  ];

  const statusRows = metrics.elevatorByStatus
    .slice()
    .sort((a, b) => b._count.status - a._count.status)
    .map((s) => ({
      key: s.status,
      label: ELEVATOR_STATUS_LABELS[s.status] ?? s.status,
      value: s._count.status,
    }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard
        title="Përputhshmëria kombëtare"
        subtitle="Indikatorët e monitorimit sipas regjistrit"
        meta={
          <Link href="/ishmt/compliance" className="text-xs font-medium text-gov-primary hover:underline">
            Raport i plotë
          </Link>
        }
      >
        <PortalTableWrap compact>
          <thead>
            <tr>
              <th>Indikatori / mungesa</th>
              <th className="text-right">Raste</th>
              <th className="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {complianceRows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className={cn("text-right font-semibold tabular-nums", row.emphasis && "text-gov-danger")}>
                  {row.value}
                </td>
                <td>
                  <Link href={row.href} className="portal-table-link">
                    Shiko
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </PortalTableWrap>
      </SectionCard>

      <SectionCard title="Procesi administrativ" subtitle="Radha e aplikimeve dhe raportimeve">
        <PortalTableWrap compact>
          <thead>
            <tr>
              <th>Treguesi</th>
              <th className="text-right">Vlera</th>
            </tr>
          </thead>
          <tbody>
            {proceduralRows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td
                  className={cn(
                    "text-right font-semibold tabular-nums",
                    row.emphasis && row.value > 0 && "text-gov-danger",
                  )}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </PortalTableWrap>
      </SectionCard>

      <SectionCard title="Gjendja administrative" subtitle="Shpërndarja sipas statusit në regjistër">
        <PortalTableWrap compact>
          <thead>
            <tr>
              <th>Statusi</th>
              <th className="text-right">Numri</th>
            </tr>
          </thead>
          <tbody>
            {statusRows.map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className="text-right font-semibold tabular-nums">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </PortalTableWrap>
      </SectionCard>

      <SectionCard
        title="Shpërndarja gjeografike"
        subtitle="Ashensorë në shërbim sipas bashkisë"
        meta={
          <Link href="/ishmt/search" className="text-xs font-medium text-gov-primary hover:underline">
            Kërko në regjistër
          </Link>
        }
      >
        {metrics.topMunicipalities.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted-foreground">Nuk ka të dhëna të disponueshme.</p>
        ) : (
          <PortalTableWrap compact>
            <thead>
              <tr>
                <th>Bashkia</th>
                <th className="text-right">Numri</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topMunicipalities.map((m) => (
                <tr key={m.municipalityId}>
                  <td>{m.name}</td>
                  <td className="text-right font-semibold tabular-nums">{m.count}</td>
                </tr>
              ))}
            </tbody>
          </PortalTableWrap>
        )}
      </SectionCard>
    </div>
  );
}
