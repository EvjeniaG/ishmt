import Link from "next/link";
import { DirectorateActivityTable } from "@/components/directorate/directorate-activity-table";
import {
  mapCertificationActivity,
  mapInstallationActivity,
} from "@/components/directorate/directorate-activity-utils";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { DirectorateWorkloadList } from "@/components/directorate/directorate-workload-list";
import { SectionCard } from "@/components/shared/institutional";
import { KpiStrip } from "@/components/shared/kpi-strip";
import type { DirectorateDashboardService } from "@/lib/services/directorate-dashboard-service";

type Data = Awaited<ReturnType<typeof DirectorateDashboardService.getOverview>>;

export function DirectorateDashboard({ data }: { data: Data }) {
  return (
    <div className="space-y-6">
      <DirectoratePageHeader
        title="Paneli i Drejtorisë"
        description="Regjistri i kompanive të licencuara dhe aktiviteti aktual i instalimeve / certifikimeve"
      />

      <KpiStrip
        columns={3}
        items={[
          { label: "Instalues aktivë", value: data.cards.activeInstallers },
          { label: "OMI / Certifikues aktivë", value: data.cards.activeCertifiers },
          { label: "Instalime në proces", value: data.cards.activeInstallations },
          { label: "Certifikime në proces", value: data.cards.activeCertifications },
          { label: "Aplikime me kompani të licencuara", value: data.cards.applicationsUsingLicensed },
          { label: "Ashensorë në regjistër", value: data.cards.registeredElevators },
          {
            label: "Licenca që skadojnë (30 ditë)",
            value: data.cards.expiringLicenses,
            emphasis: data.cards.expiringLicenses > 0,
          },
          {
            label: "Licenca të revokuara",
            value: data.cards.revokedLicenses,
            emphasis: data.cards.revokedLicenses > 0,
          },
          {
            label: "Kompani të pezulluara",
            value: data.cards.suspendedCompanies,
            emphasis: data.cards.suspendedCompanies > 0,
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <DirectorateActivityTable
          title="Instalime aktive - kompanitë instaluese"
          emptyMessage="Nuk ka instalime në proces tani."
          rows={data.activeInstallationApps.map(mapInstallationActivity)}
          moreHref="/directorate/activity?phase=installation"
        />
        <DirectorateActivityTable
          title="Certifikime aktive - kompanitë certifikuese / OMI"
          emptyMessage="Nuk ka certifikime në proces tani."
          rows={data.activeCertificationApps.map(mapCertificationActivity)}
          moreHref="/directorate/activity?phase=certification"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DirectorateWorkloadList
          title="Ngarkesa - instaluesit (tani)"
          items={data.topInstallers.map((row) => ({
            id: row.org!.id,
            name: row.org!.name,
            nipt: row.org!.nipt,
            count: row.count,
            suffix: "instalime aktive",
          }))}
          emptyMessage="Asnjë instalues nuk ka punë aktive."
          moreHref="/directorate/activity?phase=installation"
        />
        <DirectorateWorkloadList
          title="Ngarkesa - certifikuesit / OMI (tani)"
          items={data.topCertifiers.map((row) => ({
            id: row.org!.id,
            name: row.org!.name,
            nipt: row.org!.nipt,
            count: row.count,
            suffix: "certifikime aktive",
          }))}
          emptyMessage="Asnjë certifikues nuk ka punë aktive."
          moreHref="/directorate/activity?phase=certification"
        />
      </div>

      <SectionCard
        title="Kompanitë e fundit në regjistër"
        actions={
          <Link href="/directorate/companies" className="text-sm text-gov-primary hover:underline">
            Regjistri i plotë →
          </Link>
        }
      >
        <DirectorateCompaniesTable companies={data.recentCompanies} />
      </SectionCard>
    </div>
  );
}
