import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { MetricCard } from "@/components/shared/metric-card";
import { RequiredActionsPanel } from "@/components/dashboard/required-actions-panel";
import type { MaintenanceDashboardService } from "@/lib/services/maintenance-dashboard-service";

type Data = Awaited<ReturnType<typeof MaintenanceDashboardService.getDashboard>>;

export function MaintenanceDashboardPanel({ data }: { data: Data }) {
  return (
    <StandardPageLayout
      eyebrow="Portali · Mirëmbajtje"
      title="Paneli operativ"
      description="Kontrata, ndërhyrje dhe detyrime për ashensorët e caktuar"
    >
      <div className="portal-kpi-grid">
        <MetricCard label="Kontrata Aktive" value={data.cards.activeContracts} accent="success" />
        <MetricCard label="Kontrata në Pritje" value={data.cards.pendingContracts} accent="warning" />
        <MetricCard label="Kontrata të Refuzuara" value={data.cards.rejectedContracts} />
        <MetricCard label="Ndërhyrje këtë muaj" value={data.cards.interventionsThisMonth} />
        <MetricCard label="Kontrolle periodike të paplotësuara" value={data.cards.missingMonthlyReports} accent="warning" />
        <MetricCard label="Pa ndërhyrje të regjistruar" value={data.cards.missingInterventions} accent="danger" />
        <MetricCard label="Pa inspektim të regjistruar" value={data.cards.missingInspections} accent="danger" />
        <MetricCard label="Inspektime në afat" value={data.cards.inspectionsDue} accent="warning" />
        <MetricCard label="Ashensorë me problem" value={data.cards.problemElevators} accent="danger" />
        <MetricCard label="Kontrata që skadojnë" value={data.cards.expiringContracts} accent="warning" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild className="bg-gov-primary hover:bg-gov-secondary">
          <Link href="/portal/sherbimi/nderhyrje">Regjistro ndërhyrje</Link>
        </Button>
        <Button asChild variant="outline"><Link href="/portal/sherbimi/raport-mujor">Kontroll periodik</Link></Button>
        <Button asChild variant="outline"><Link href="/portal/sherbimi/contracts">Kontratat (ngarko/prano)</Link></Button>
        <Button asChild variant="outline"><Link href="/portal/elevators">Ashensorët e caktuar</Link></Button>
      </div>

      <RequiredActionsPanel
        actions={data.requiredActions}
        subtitle="Kontrata, ndërhyrje dhe raporte që presin veprim"
        layout="list"
      />
    </StandardPageLayout>
  );
}
