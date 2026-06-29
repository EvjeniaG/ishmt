import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
import { DataSheet, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";
import { OrganizationService } from "@/lib/services/organization-service";
import { EditCompanyForm } from "@/components/forms/edit-company-form";
import { CompanyEnforcementPanel } from "@/components/directorate/company-enforcement-panel";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";
import { getMunicipalities } from "@/lib/data/municipalities";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const isDirectorate = session.user.roleCode === ROLE_CODES.DIRECTORATE;
  const isAdminReadOnly = session.user.roleCode === ROLE_CODES.ADMIN;
  if (!isDirectorate && !isAdminReadOnly) redirect("/unauthorized");

  const { id } = await params;
  const company = await OrganizationService.getById(id);
  if (!company) notFound();

  const municipalities = await getMunicipalities();

  return (
    <AppShell title={company.name}>
      <div className="space-y-6">
        <DirectoratePageHeader
          title={company.name}
          description={`${company.type} · ${ORG_STATUS_LABELS[company.status] ?? company.status}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link href="/directorate/companies">← Kthehu</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/directorate/companies/${id}/licenses`}>Licencat</Link>
              </Button>
            </div>
          }
        />

        {isDirectorate ? (
          <>
            <CompanyEnforcementPanel companyId={company.id} status={company.status} />
            <EditCompanyForm company={company} municipalities={municipalities} />
          </>
        ) : (
          <SectionCard title={company.name} padded>
            <DataSheet
              items={[
                { label: "Lloji", value: company.type },
                { label: "Statusi", value: ORG_STATUS_LABELS[company.status] ?? company.status },
                { label: "NIPT", value: company.nipt ?? "-", mono: true },
                { label: "Bashkia", value: company.municipality?.nameSq ?? "-" },
                { label: "Email", value: company.email ?? "-" },
              ]}
            />
          </SectionCard>
        )}

        <SectionCard title={`Anëtarët (${company.memberships.length})`} padded>
          <ul className="space-y-1 text-sm">
            {company.memberships.map((m) => (
              <li key={m.id}>
                {m.user.firstName} {m.user.lastName} - {m.user.email} ({m.role.code})
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}
