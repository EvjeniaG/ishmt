import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { MetricCard } from "@/components/shared/metric-card";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ROLE_CODES } from "@/lib/constants/roles";
import type { CertifierDashboardService } from "@/lib/services/certifier-dashboard-service";

type Data = Awaited<ReturnType<typeof CertifierDashboardService.getDashboard>>;

function isContractAction(action: Data["requiredActions"][number]) {
  return action.status === "PENDING_CONTRACT";
}

export function CertifierDashboard({ data }: { data: Data }) {
  const { certifikim, instalime, mirembajtje, inspektime } = data.cards;

  return (
    <StandardPageLayout
      eyebrow="Portali · OMI"
      title="Paneli operativ"
      description="Certifikim, kontrata, mirëmbajtje dhe inspektime periodike"
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          compact
          label="Certifikim"
          value={certifikim.value}
          accent={certifikim.accent}
          subtitle={certifikim.subtitle}
        />
        <MetricCard
          compact
          label="Instalime"
          value={instalime.value}
          accent={instalime.accent}
          subtitle={instalime.subtitle}
        />
        <MetricCard
          compact
          label="Mirëmbajtje"
          value={mirembajtje.value}
          accent={mirembajtje.accent}
          subtitle={mirembajtje.subtitle}
        />
        <MetricCard
          compact
          label="Inspektime"
          value={inspektime.value}
          accent={inspektime.accent}
          subtitle={inspektime.subtitle}
        />
      </div>

      <SectionCard
        title="Veprime të kërkuara"
        subtitle="Detyrat që presin veprimin tuaj"
        padded
      >
        {data.requiredActions.length === 0 ? (
          <PortalEmptyState>Nuk ka veprime në pritje.</PortalEmptyState>
        ) : (
          <div className="space-y-3">
            {data.requiredActions.map((a) => (
              <div key={a.id} className="portal-list-item">
                <div className="min-w-0 flex-1 space-y-1">
                  {isContractAction(a) ? (
                    <>
                      <p className="font-medium">
                        {a.type === "MAINTENANCE" ? "Mirëmbajtje" : "Inspektim"} - kontrata{" "}
                        {a.applicationNumber}
                      </p>
                      <p className="text-muted-foreground">{a.address}</p>
                      <p className="text-xs text-muted-foreground">
                        Ngarkoni kontratën e nënshkruar dhe pranoni ftesën.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">{a.applicationNumber}</p>
                      <p className="text-muted-foreground">{a.address}</p>
                    </>
                  )}
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href={a.href}>{a.actionLabel}</Link>
                </Button>
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
