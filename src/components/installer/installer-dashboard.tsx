import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { MetricCard } from "@/components/shared/metric-card";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { RequiredActionsPanel } from "@/components/dashboard/required-actions-panel";
import { ROLE_CODES } from "@/lib/constants/roles";
import { type RequiredActionItem } from "@/lib/dashboard/required-actions";
import type { InstallerDashboardService } from "@/lib/services/installer-dashboard-service";

type Data = Awaited<ReturnType<typeof InstallerDashboardService.getDashboard>>;

function toRequiredActions(actions: Data["requiredActions"]): RequiredActionItem[] {
  return actions.map((action) => ({
    id: action.id,
    title: `${action.applicationNumber} · ${action.actionLabel}`,
    subtitle: `${action.owner} · ${action.address}`,
    severity: action.severity,
    href: action.href,
    actionLabel: action.actionLabel,
    dueDate: action.dueDate,
    applicationStatus: action.status,
    applicationType: action.type,
  }));
}

export function InstallerDashboard({ data }: { data: Data }) {
  const requiredActions = toRequiredActions(data.requiredActions);

  return (
    <StandardPageLayout
      eyebrow="Portali · Instalues"
      title="Paneli operativ"
      description="Aplikime të deleguara dhe detyra teknike"
      actions={
        <Button asChild variant="outline">
          <Link href="/portal/applications">Shiko aplikimet</Link>
        </Button>
      }
    >
      <div className="portal-kpi-grid">
        <MetricCard label="Ftesa në Pritje" value={data.cards.invited} accent="warning" />
        <MetricCard label="Aplikime të Pranuara" value={data.cards.accepted} accent="success" />
        <MetricCard label="Të Dhëna Teknike për Plotësim" value={data.cards.technicalPending} />
        <MetricCard label="Të Dhëna Teknike të Dorëzuara" value={data.cards.technicalCompleted} accent="success" />
        <MetricCard label="Të Kthyera për Korrigjim" value={data.cards.returned} accent="warning" />
      </div>

      <RequiredActionsPanel
        actions={requiredActions}
        layout="list"
        statusRoleCode={ROLE_CODES.INSTALLER}
      />

      <SectionCard
        title="Aplikimet e fundit"
        actions={
          <Link href="/portal/applications" className="portal-table-link text-sm">
            Shiko të gjitha →
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
                <th>Personi përgjegjës i ashensorit</th>
                <th>Adresa</th>
                <th>Statusi</th>
                <th>Hapi tjetër</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.recentApplications.map((a) => (
                <tr key={a.id}>
                  <td>{a.applicationNumber}</td>
                  <td>{a.owner}</td>
                  <td>{a.address}</td>
                  <td>
                    <ApplicationStatusBadge
                      status={a.status}
                      type={a.type}
                      roleCode={ROLE_CODES.INSTALLER}
                      delegationRevoked={a.delegationRevoked}
                    />
                  </td>
                  <td>{a.nextAction}</td>
                  <td><Link href={a.href} className="portal-table-link">Hap</Link></td>
                </tr>
              ))}
            </tbody>
          </PortalTableWrap>
        )}
      </SectionCard>
    </StandardPageLayout>
  );
}
