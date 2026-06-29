import Link from "next/link";
import { redirect } from "next/navigation";
import { OrgType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { KpiStrip } from "@/components/shared/kpi-strip";
import { getAuthSession } from "@/lib/auth";
import { DirectorateDashboardService } from "@/lib/services/directorate-dashboard-service";
import { OrganizationService } from "@/lib/services/organization-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function DirectorateStatisticsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.DIRECTORATE) redirect("/unauthorized");

  const [metrics, byType, installers, certifiers] = await Promise.all([
    DirectorateDashboardService.getOverview(),
    DirectorateDashboardService.getStatusBreakdown(),
    OrganizationService.listLicensedCompanies({ type: OrgType.INSTALLER }),
    OrganizationService.listLicensedCompanies({ type: OrgType.CERTIFIER }),
  ]);

  return (
    <AppShell title="Statistika">
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Statistika"
          description="Përmbledhje e regjistrit të kompanive të licencuara"
        />

        <KpiStrip
          columns={3}
          items={[
            { label: "Instalues", value: installers.length },
            { label: "OMI / Certifikues", value: certifiers.length },
            { label: "Aplikime me licencë", value: metrics.cards.applicationsUsingLicensed },
          ]}
        />

        <SectionCard title="Shpërndarja sipas statusit" padded>
          <ul className="divide-y divide-border/60">
            {byType.map((row) => (
              <li
                key={`${row.type}-${row.status}`}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="text-muted-foreground">
                  {row.type} · {row.status}
                </span>
                <span className="font-semibold tabular-nums">{row._count.id}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <Link href="/directorate/companies" className="text-sm text-gov-primary hover:underline">
          Shiko regjistrin e kompanive →
        </Link>
      </div>
    </AppShell>
  );
}
