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
import type { CertifierDashboardService } from "@/lib/services/certifier-dashboard-service";

type Data = Awaited<ReturnType<typeof CertifierDashboardService.getDashboard>>;

function isContractAction(action: Data["requiredActions"][number]) {
  return action.status === "PENDING_CONTRACT";
}

function toRequiredActions(actions: Data["requiredActions"]): RequiredActionItem[] {
  return actions.map((action) => {
    if (isContractAction(action)) {
      return {
        id: action.id,
        title: `${action.type === "MAINTENANCE" ? "Mirëmbajtje" : "Inspektim"} - kontrata ${action.applicationNumber}`,
        subtitle: action.address,
        severity: action.severity,
        href: action.href,
        actionLabel: action.actionLabel,
        dueDate: action.dueDate,
        hint: "Ngarkoni kontratën e nënshkruar dhe pranoni ftesën.",
      };
    }
    return {
      id: action.id,
      title: action.applicationNumber,
      subtitle: action.address,
      severity: action.severity,
      href: action.href,
      actionLabel: action.actionLabel,
      dueDate: action.dueDate,
    };
  });
}

export function CertifierDashboard({ data }: { data: Data }) {
  const { certifikim, instalime, mirembajtje, inspektime } = data.cards;
  const requiredActions = toRequiredActions(data.requiredActions);
  const description = data.hasMaintenanceAssignments
    ? "Certifikim, inspektime periodike dhe mirëmbajtje (ku jeni caktuar edhe si kompani mirëmbajtëse)"
    : "Certifikim dhe inspektime periodike OMI — pa detyra mirëmbajtjeje";

  return (
    <StandardPageLayout
      eyebrow="Portali · OMI"
      title="Paneli operativ"
      description={description}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="default">
            <Link href="/portal/omi/kontratat">Kontratat</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/portal/omi/inspektim-periodik">Inspektimet</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/portal/applications">Certifikimet</Link>
          </Button>
        </div>
      }
    >
      <div className={`grid gap-3 sm:grid-cols-2 ${mirembajtje ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <MetricCard compact label="Certifikim" value={certifikim.value} accent={certifikim.accent} subtitle={certifikim.subtitle} />
        <MetricCard compact label="Instalime" value={instalime.value} accent={instalime.accent} subtitle={instalime.subtitle} />
        {mirembajtje && (
          <MetricCard compact label="Mirëmbajtje" value={mirembajtje.value} accent={mirembajtje.accent} subtitle={mirembajtje.subtitle} />
        )}
        <MetricCard compact label="Inspektime" value={inspektime.value} accent={inspektime.accent} subtitle={inspektime.subtitle} />
      </div>

      <RequiredActionsPanel
        actions={requiredActions}
        subtitle="Detyrat që presin veprimin tuaj"
        layout="list"
        statusRoleCode={ROLE_CODES.CERTIFIER}
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
                <th>Adresa</th>
                <th>Instaluesi</th>
                <th>Statusi</th>
                <th>Hapi tjetër</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.recentApplications.map((a) => (
                <tr key={a.id}>
                  <td>{a.applicationNumber}</td>
                  <td>{a.address}</td>
                  <td>{a.installer}</td>
                  <td>
                    <ApplicationStatusBadge status={a.status} type={a.type} roleCode={ROLE_CODES.CERTIFIER} />
                  </td>
                  <td>{a.nextAction}</td>
                  <td>
                    <Link href={a.href} className="portal-table-link">
                      Hap
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
