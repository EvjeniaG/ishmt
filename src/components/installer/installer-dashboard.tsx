import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { MetricCard } from "@/components/shared/metric-card";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ROLE_CODES } from "@/lib/constants/roles";
import type { InstallerDashboardService } from "@/lib/services/installer-dashboard-service";

type Data = Awaited<ReturnType<typeof InstallerDashboardService.getDashboard>>;

export function InstallerDashboard({ data }: { data: Data }) {
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
        <MetricCard label="Dokumente të Ngarkuara" value={data.cards.uploadedDocs} />
      </div>

      <SectionCard title="Veprime të kërkuara" padded>
        {data.requiredActions.length === 0 ? (
          <PortalEmptyState>Nuk ka veprime në pritje.</PortalEmptyState>
        ) : (
          <div className="space-y-3">
            {data.requiredActions.map((a) => (
              <div key={a.id} className="portal-list-item">
                <div>
                  <p className="font-medium">{a.applicationNumber} · {a.actionLabel}</p>
                  <p className="text-muted-foreground">{a.owner} · {a.address}</p>
                  <ApplicationStatusBadge status={a.status} type={a.type} roleCode={ROLE_CODES.INSTALLER} />
                </div>
                <Button asChild size="sm" variant="outline"><Link href={a.href}>{a.actionLabel}</Link></Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

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
                    <ApplicationStatusBadge status={a.status} type={a.type} roleCode={ROLE_CODES.INSTALLER} />
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
