import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageShell } from "@/components/directorate/directorate-page-header";
import { DirectorateWorkloadList } from "@/components/directorate/directorate-workload-list";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/institutional";
import type { DirectorateDashboardService } from "@/lib/services/directorate-dashboard-service";

type Data = Awaited<ReturnType<typeof DirectorateDashboardService.getOverview>>;

function MetricLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block transition-transform hover:-translate-y-0.5">
      {children}
    </Link>
  );
}

export function DirectorateDashboard({ data }: { data: Data }) {
  const attentionCount =
    data.cards.expiringLicenses + data.cards.revokedLicenses + data.cards.suspendedCompanies;

  return (
    <DirectoratePageShell
      title="Paneli operativ"
      description="Regjistrimi i kompanive, licencat dhe mbikëqyrja e aktivitetit të instalimeve dhe OM."
      actions={
        <Button asChild>
          <Link href="/directorate/companies/new">Shto kompani të re</Link>
        </Button>
      }
    >
      <div className="portal-kpi-grid sm:grid-cols-2 lg:grid-cols-4">
        <MetricLink href="/directorate/companies?type=INSTALLER&status=ACTIVE">
          <MetricCard
            label="Instalues aktivë"
            value={data.cards.activeInstallers}
            accent="primary"
            subtitle="Në regjistrin e Drejtorisë"
          />
        </MetricLink>
        <MetricLink href="/directorate/companies?type=CERTIFIER&status=ACTIVE">
          <MetricCard
            label="OM / certifikues aktivë"
            value={data.cards.activeCertifiers}
            accent="primary"
            subtitle="Me licencë OM aktive"
          />
        </MetricLink>
        <MetricLink href="/directorate/activity?phase=installation">
          <MetricCard
            label="Instalime në proces"
            value={data.cards.activeInstallations}
            accent="success"
            subtitle="Aplikime me instalues të licencuar"
          />
        </MetricLink>
        <MetricLink href="/directorate/activity?phase=certification">
          <MetricCard
            label="Certifikime në proces"
            value={data.cards.activeCertifications}
            accent="success"
            subtitle="Aplikime me OM të licencuar"
          />
        </MetricLink>
      </div>

      <SectionCard
        title="Kujdes i kërkuar"
        subtitle="Licenca, pezullime dhe situata që duhen shqyrtuar"
        padded
      >
        <div className="portal-kpi-grid sm:grid-cols-2 lg:grid-cols-3">
          <MetricLink href="/directorate/licenses">
            <MetricCard
              label="Licenca që skadojnë (30 ditë)"
              value={data.cards.expiringLicenses}
              accent={data.cards.expiringLicenses > 0 ? "warning" : "success"}
              subtitle="Rinovoni ose pezulloni kompaninë"
            />
          </MetricLink>
          <MetricLink href="/directorate/companies?status=REVOKED">
            <MetricCard
              label="Licenca të revokuara"
              value={data.cards.revokedLicenses}
              accent={data.cards.revokedLicenses > 0 ? "danger" : "primary"}
              subtitle="Kompanitë pa autorizim aktiv"
            />
          </MetricLink>
          <MetricLink href="/directorate/companies/suspended">
            <MetricCard
              label="Kompani të pezulluara"
              value={data.cards.suspendedCompanies}
              accent={data.cards.suspendedCompanies > 0 ? "danger" : "success"}
              subtitle="Nuk shfaqen në zgjedhje aplikimesh"
            />
          </MetricLink>
        </div>
        {attentionCount === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">Nuk ka alarme aktive - regjistri është në rregull.</p>
        )}
      </SectionCard>

      <SectionCard title="Veprime të shpejta" subtitle="Hyrje direkte në detyrat më të zakonshme" padded>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/directorate/companies">Shiko regjistrin</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/directorate/companies/new">Regjistro kompani të re</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/directorate/licenses">Menaxho licencat</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/directorate/activity">Aktiviteti i kompanive</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/directorate/companies/suspended">Kompani të pezulluara</Link>
          </Button>
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <DirectorateWorkloadList
          title="Ngarkesa - instaluesit"
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
          title="Ngarkesa - certifikuesit / OM"
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
        subtitle={`${data.cards.applicationsUsingLicensed} aplikime përdorin kompani të licencuara · ${data.cards.registeredElevators} ashensorë në regjistër`}
        actions={
          <Link href="/directorate/companies" className="text-sm font-medium text-gov-primary hover:underline">
            Regjistri i plotë →
          </Link>
        }
        padded
      >
        <DirectorateCompaniesTable companies={data.recentCompanies} />
      </SectionCard>
    </DirectoratePageShell>
  );
}
