import { OrgStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageShell } from "@/components/directorate/directorate-page-header";
import { SectionCard } from "@/components/shared/institutional";
import { DIRECTORATE_COMPANY_TABS } from "@/lib/directorate/directorate-nav";
import { requireDirectorateOrAdminReadonly } from "@/lib/directorate/access";
import { OrganizationService } from "@/lib/services/organization-service";

export default async function DirectorateLicensesPage() {
  await requireDirectorateOrAdminReadonly();
  const companies = await OrganizationService.listLicensedCompanies({
    status: OrgStatus.ACTIVE,
  });

  const withLicense = companies.filter((c) => c.licenses.length > 0);
  const sorted = [...withLicense].sort(
    (a, b) => a.licenses[0]!.expiryDate.getTime() - b.licenses[0]!.expiryDate.getTime(),
  );

  const expiringSoon = sorted.filter(
    (company) =>
      company.licenses[0] &&
      company.licenses[0].expiryDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000,
  ).length;

  return (
    <AppShell title="Licencat aktive">
      <DirectoratePageShell
        title="Licencat aktive"
        description="Të gjitha licencat e vlefshme, të renditura sipas datës së skadimit - më afër skadimit së pari."
        tabs={DIRECTORATE_COMPANY_TABS}
      >
        <SectionCard
          title="Licencat në regjistër"
          subtitle={
            expiringSoon > 0
              ? `${expiringSoon} licenca skadojnë brenda 30 ditëve`
              : "Asnjë licencë nuk skadon së shpejti"
          }
          meta={
            <span className="text-sm tabular-nums text-muted-foreground">
              {sorted.length} {sorted.length === 1 ? "licencë" : "licenca"}
            </span>
          }
          padded
        >
          <DirectorateCompaniesTable
            companies={sorted}
            emptyMessage="Nuk ka licenca aktive të regjistruara."
          />
        </SectionCard>
      </DirectoratePageShell>
    </AppShell>
  );
}
