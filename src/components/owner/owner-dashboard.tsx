import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { MetricCard } from "@/components/shared/metric-card";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { ComplianceIndicatorBadge } from "@/components/shared/compliance-indicator-badge";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import { ApplicationStatusBadge, WorkflowStatusChip } from "@/components/applications/application-status-badge";
import { ElevatorStatusBadge } from "@/components/elevators/elevator-status-badge";
import { ROLE_CODES } from "@/lib/constants/roles";
import type { OwnerDashboardService, RequiredActionItem } from "@/lib/services/owner-dashboard-service";
import { cn } from "@/lib/utils";

type DashboardData = Awaited<ReturnType<typeof OwnerDashboardService.getDashboard>>;

const SEVERITY_LABELS: Record<RequiredActionItem["severity"], string> = {
  danger: "Prioritet i lartë",
  warning: "Monitorim",
  info: "Referencë",
};

function SeverityBadge({ severity }: { severity: RequiredActionItem["severity"] }) {
  const tone =
    severity === "danger" ? "danger" as const : severity === "warning" ? "waiting" as const : "action" as const;
  return <WorkflowStatusChip label={SEVERITY_LABELS[severity]} tone={tone} />;
}

export function OwnerDashboard({ data }: { data: DashboardData }) {
  const actionCount = data.requiredActions.length;
  const overdue = data.procedureSummary.overdue;

  return (
    <StandardPageLayout
      eyebrow="Portali · Personi përgjegjës i ashensorit"
      title="Paneli operativ"
      description="Përmbledhje e ashensorëve, aplikimeve dhe detyrimeve tuaja si person përgjegjës."
      actions={
        <Button asChild>
          <Link href="/portal/applications/new/registration">Regjistro ashensor</Link>
        </Button>
      }
    >
      <div className="portal-kpi-grid sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Ashensorë në shërbim"
          value={data.cards.activeElevators}
          accent="success"
          subtitle="Status aktiv në regjistër"
        />
        <MetricCard
          label="Aplikime në proces"
          value={data.cards.inProgressApplications}
          accent="primary"
          subtitle="Regjistrim, lifecycle dhe draft"
        />
        <MetricCard
          label="Në shqyrtim ISHMT"
          value={data.procedureSummary.inReview}
          accent="primary"
          subtitle="Të parashtruara te inspektoriati"
        />
        <MetricCard
          label="Veprime të kërkuara"
          value={actionCount}
          accent={actionCount > 0 ? "danger" : "success"}
          subtitle={
            overdue > 0
              ? `${overdue} me afat procedural të tejkaluar`
              : "Detyrime, afate dhe korrigjime"
          }
        />
      </div>

      <SectionCard title="Veprime të kërkuara" subtitle="Detyrimet që kërkojnë ndërhyrjen tuaj" padded>
        {data.requiredActions.length === 0 ? (
          <PortalEmptyState>Nuk ka veprime që kërkojnë vëmendje.</PortalEmptyState>
        ) : (
          <PortalTableWrap>
            <thead>
              <tr>
                <th className="w-36">Prioriteti</th>
                <th>Përshkrimi</th>
                <th className="w-28">Afati</th>
                <th className="w-32"></th>
              </tr>
            </thead>
            <tbody>
              {data.requiredActions.map((action) => (
                <tr key={action.id}>
                  <td>
                    <SeverityBadge severity={action.severity} />
                  </td>
                  <td>
                    <p className="font-medium text-foreground">{action.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{action.subtitle}</p>
                  </td>
                  <td className="text-sm tabular-nums text-muted-foreground">
                    {action.dueDate ? new Date(action.dueDate).toLocaleDateString("sq-AL") : "-"}
                  </td>
                  <td>
                    <Link href={action.href} className="portal-table-link">
                      {action.actionLabel}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </PortalTableWrap>
        )}
      </SectionCard>

      <SectionCard title="Veprime të shpejta" subtitle="Nisni një proces ose menaxhoni ashensorët" padded>
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Ndryshime në kartelë
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/applications/new/correction">Korrigjim të dhënave</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/applications/new/update">Përditësim të dhënave</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/applications/new/ownership-transfer">Transferim pronësie</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/applications/new/modernization">Modernizim</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/applications/new/deregistration">Çregjistrim</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-gov-primary">
                <Link href="/portal/applications/new">Të gjitha llojet</Link>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Menaxhim i ashensorëve
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/maintenance">Cakto kompani mirëmbajtjeje</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/qr-codes">Shiko QR kodet</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/documents">Ngarko dokument</Link>
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Aplikimet e fundit"
        subtitle="Dosjet e fundit të hapura ose në proces"
        meta={
          <Link href="/portal/applications" className="text-xs font-medium text-gov-primary hover:underline">
            Shiko të gjitha
          </Link>
        }
      >
        {data.recentApplications.length === 0 ? (
          <PortalEmptyState>Nuk ka aplikime.</PortalEmptyState>
        ) : (
          <PortalTableWrap>
            <thead>
              <tr>
                <th>Nr. aplikimit</th>
                <th>Lloji</th>
                <th>Statusi</th>
                <th>Adresa</th>
                <th>Krijuar</th>
                <th>Hapi tjetër</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.recentApplications.map((app) => (
                <tr key={app.id}>
                  <td className="font-medium">{app.applicationNumber}</td>
                  <td>{APPLICATION_TYPE_LABELS[app.type as keyof typeof APPLICATION_TYPE_LABELS] ?? app.type}</td>
                  <td>
                    <ApplicationStatusBadge status={app.status} type={app.type} roleCode={ROLE_CODES.OWNER} />
                  </td>
                  <td>{app.address}</td>
                  <td className="tabular-nums">{new Date(app.createdAt).toLocaleDateString("sq-AL")}</td>
                  <td className="text-sm text-muted-foreground">{app.nextAction}</td>
                  <td>
                    <Link href={app.href} className="portal-table-link">
                      Hap
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </PortalTableWrap>
        )}
      </SectionCard>

      <SectionCard
        title="Ashensorët e fundit"
        subtitle="Regjistrimet tuaja në kartelë"
        meta={
          <Link href="/portal/elevators" className="text-xs font-medium text-gov-primary hover:underline">
            Shiko të gjithë
          </Link>
        }
      >
        {data.recentElevators.length === 0 ? (
          <PortalEmptyState>Nuk ka ashensorë të regjistruar.</PortalEmptyState>
        ) : (
          <PortalTableWrap>
            <thead>
              <tr>
                <th>Nr. regjistrimit</th>
                <th>Marka</th>
                <th>Adresa</th>
                <th>Statusi</th>
                <th>Përputhshmëria</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.recentElevators.map((elv) => (
                <tr key={elv.id}>
                  <td className="font-medium">{elv.registryNumber}</td>
                  <td>{elv.brand}</td>
                  <td>{elv.address}</td>
                  <td>
                    <ElevatorStatusBadge status={elv.status} />
                  </td>
                  <td>
                    <ComplianceIndicatorBadge
                      indicator={elv.compliance.indicator}
                      label={elv.compliance.label}
                    />
                  </td>
                  <td>
                    <Link href={`/portal/elevators/${elv.id}`} className="portal-table-link">
                      Hap dosjen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </PortalTableWrap>
        )}
      </SectionCard>
    </StandardPageLayout>
  );
}
