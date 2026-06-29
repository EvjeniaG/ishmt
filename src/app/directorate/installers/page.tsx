import { OrgStatus, OrgType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateCompaniesTable } from "@/components/directorate/directorate-companies-table";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { DirectorateWorkloadList } from "@/components/directorate/directorate-workload-list";
import { SectionCard } from "@/components/shared/institutional";
import { requireDirectorateOrAdminReadonly } from "@/lib/directorate/access";
import { DirectorateDashboardService } from "@/lib/services/directorate-dashboard-service";
import { OrganizationService } from "@/lib/services/organization-service";

export default async function DirectorateInstallersPage() {
  await requireDirectorateOrAdminReadonly();

  const [companies, workload] = await Promise.all([
    OrganizationService.listLicensedCompanies({
      type: OrgType.INSTALLER,
      status: OrgStatus.ACTIVE,
    }),
    DirectorateDashboardService.getInstallerWorkload(),
  ]);

  return (
    <AppShell title="Instaluese të autorizuara">
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Instaluese të autorizuara"
          description="Kompanitë instaluese me status aktiv dhe licencë të vlefshme."
        />
        <DirectorateWorkloadList
          title="Ngarkesa aktuale"
          items={workload.map((row) => ({
            id: row.org!.id,
            name: row.org!.name,
            nipt: row.org!.nipt,
            count: row.count,
            suffix: "instalime aktive",
          }))}
          emptyMessage="Asnjë instalues nuk ka punë aktive."
        />
        <SectionCard title="Regjistri i instaluesve">
          <DirectorateCompaniesTable
            companies={companies}
            emptyMessage="Nuk ka kompani instaluese të autorizuara."
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}
