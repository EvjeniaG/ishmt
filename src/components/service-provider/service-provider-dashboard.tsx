import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { MetricCard } from "@/components/shared/metric-card";
import { RequiredActionsPanel } from "@/components/dashboard/required-actions-panel";
import { SectionCard } from "@/components/shared/institutional";
import { ServiceProviderDemoPanel } from "@/components/service-provider/service-provider-demo-panel";
import { isDemoToolsEnabled } from "@/lib/demo/demo-data-mode";
import { ROLE_CODES } from "@/lib/constants/roles";
import { portalEyebrowForCapabilities } from "@/lib/constants/portal-labels";
import { capabilityLabels } from "@/lib/organizations/org-capabilities";
import { type RequiredActionItem } from "@/lib/dashboard/required-actions";
import type { ServiceProviderDashboardData } from "@/lib/services/service-provider-dashboard-service";

function installActions(
  actions: NonNullable<ServiceProviderDashboardData["install"]>["requiredActions"],
): RequiredActionItem[] {
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

function maintenanceActions(
  actions: NonNullable<ServiceProviderDashboardData["maintenance"]>["requiredActions"],
): RequiredActionItem[] {
  return actions.map((action) => ({
    id: action.id,
    title: action.title,
    subtitle: action.subtitle,
    severity: action.severity,
    href: action.href,
    actionLabel: action.actionLabel,
  }));
}

function omActions(
  actions: NonNullable<ServiceProviderDashboardData["om"]>["requiredActions"],
): RequiredActionItem[] {
  return actions.map((action) => ({
    id: action.id,
    title: action.applicationNumber,
    subtitle: action.address,
    severity: action.severity,
    href: action.href,
    actionLabel: action.actionLabel,
    dueDate: action.dueDate,
  }));
}

export function ServiceProviderDashboard({
  data,
  activeNipt,
}: {
  data: ServiceProviderDashboardData;
  activeNipt?: string | null;
}) {
  const { caps, install, maintenance, om } = data;
  const labels = capabilityLabels(caps).join(" · ");

  const allActions: RequiredActionItem[] = [
    ...(install ? installActions(install.requiredActions) : []),
    ...(maintenance ? maintenanceActions(maintenance.requiredActions) : []),
    ...(om ? omActions(om.requiredActions) : []),
  ];

  return (
    <StandardPageLayout
      eyebrow={portalEyebrowForCapabilities(caps)}
      title="Paneli operativ"
      description={`Përmbledhje e detyrave për ${labels.toLowerCase()}`}
    >
      {install && (
        <SectionCard title="Instalim" padded>
          <div className="portal-kpi-grid mb-4">
            <MetricCard label="Ftesa në Pritje" value={install.cards.invited} accent="warning" />
            <MetricCard label="Aplikime të Pranuara" value={install.cards.accepted} accent="success" />
            <MetricCard label="Të Dhëna Teknike për Plotësim" value={install.cards.technicalPending} />
            <MetricCard label="Të Kthyera për Korrigjim" value={install.cards.returned} accent="warning" />
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/portal/applications">Aplikime instalimi</Link>
          </Button>
        </SectionCard>
      )}

      {maintenance && (
        <SectionCard title="Mirëmbajtje" padded>
          <div className="portal-kpi-grid mb-4">
            <MetricCard label="Kontrata Aktive" value={maintenance.cards.activeContracts} accent="success" />
            <MetricCard label="Kontrata në Pritje" value={maintenance.cards.pendingContracts} accent="warning" />
            <MetricCard label="Ndërhyrje këtë muaj" value={maintenance.cards.interventionsThisMonth} />
            <MetricCard label="Ashensorë me problem" value={maintenance.cards.problemElevators} accent="danger" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/elevators">Ashensorët</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/sherbimi/contracts">Kontratat</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/sherbimi/nderhyrje">Ndërhyrjet</Link>
            </Button>
          </div>
        </SectionCard>
      )}

      {om && (
        <SectionCard title="OM / Certifikim" padded>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <MetricCard compact label="Certifikim" value={om.cards.certifikim.value} accent={om.cards.certifikim.accent} />
            <MetricCard compact label="Instalime" value={om.cards.instalime.value} accent={om.cards.instalime.accent} />
            <MetricCard compact label="Kontrolle" value={om.cards.inspektime.value} accent={om.cards.inspektime.accent} />
            {om.cards.mirembajtje && (
              <MetricCard compact label="Mirëmbajtje OM" value={om.cards.mirembajtje.value} accent={om.cards.mirembajtje.accent} />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/applications">Aplikime certifikimi</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/omi/kontratat-kontrolli">Kontratat e inspektimit</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/portal/omi/inspektim-periodik">Inspektimet</Link>
            </Button>
          </div>
        </SectionCard>
      )}

      <RequiredActionsPanel
        actions={allActions}
        subtitle="Detyrat që presin veprimin tuaj"
        layout="list"
        statusRoleCode={ROLE_CODES.INSTALLER}
      />

      {isDemoToolsEnabled() && <ServiceProviderDemoPanel activeNipt={activeNipt} />}
    </StandardPageLayout>
  );
}
