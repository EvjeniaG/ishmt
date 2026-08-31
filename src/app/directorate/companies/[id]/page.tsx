import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CompanyEnforcementPanel } from "@/components/directorate/company-enforcement-panel";
import { CompanyLicenseOverview } from "@/components/directorate/company-licenses-panel";
import { CompanyProfileSection } from "@/components/directorate/company-profile-section";
import { DirectoratePageShell } from "@/components/directorate/directorate-page-header";
import { OrgStatusBadge } from "@/components/directorate/org-status-badge";
import { DataSheet, SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";
import { directorateCompanyDetailTabs } from "@/lib/directorate/directorate-nav";
import { getMunicipalities } from "@/lib/data/municipalities";
import {
  capabilitiesFromOrg,
  capabilityLabels,
} from "@/lib/organizations/org-capabilities";
import { OrganizationService } from "@/lib/services/organization-service";
import { LicenseService } from "@/lib/services/license-service";

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
  const [company, municipalities, licenses] = await Promise.all([
    OrganizationService.getById(id),
    getMunicipalities(),
    LicenseService.listByOrganization(id),
  ]);
  if (!company) notFound();

  const caps = capabilityLabels(capabilitiesFromOrg(company)).filter((label) => label !== "Mirëmbajtje");

  return (
    <AppShell title={company.name}>
      <DirectoratePageShell
        title={company.name}
        description={[caps.join(" · "), company.nipt].filter(Boolean).join(" · ")}
        actions={
          <Link href="/directorate/companies" className="text-sm font-medium text-gov-primary hover:underline">
            ← Regjistri
          </Link>
        }
        tabs={directorateCompanyDetailTabs(id)}
      >
        <SectionCard
          title="Profili i kompanisë"
          meta={<OrgStatusBadge status={company.status} />}
          padded
        >
          {isDirectorate ? (
            <CompanyProfileSection company={company} municipalities={municipalities} />
          ) : (
            <DataSheet
              items={[
                { label: "Emri", value: company.name },
                { label: "NIPT", value: company.nipt ?? "-", mono: true },
                { label: "Email", value: company.email ?? "-" },
                { label: "Telefon", value: company.phone ?? "-" },
                { label: "Adresa", value: company.address ?? "-" },
                { label: "Bashkia", value: company.municipality?.nameSq ?? "-" },
              ]}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Licencat"
          subtitle="Numrat e licencës për regjistrim në portal · pezullimi bëhet këtu"
          actions={
            <Link
              href={`/directorate/companies/${id}/licenses`}
              className="text-sm font-medium text-gov-primary hover:underline"
            >
              Menaxho licencat →
            </Link>
          }
          padded
        >
          <CompanyLicenseOverview licenses={licenses} />
        </SectionCard>

        <SectionCard
          title={`Anëtarët e llogarisë (${company.memberships.length})`}
          subtitle="Përdoruesit e regjistruar në portal për këtë kompani"
          padded
        >
          {company.memberships.length === 0 ? (
            <PortalEmptyState>
              Asnjë llogari portal ende - kompania regjistrohet me NIPT dhe numrat e licencës.
            </PortalEmptyState>
          ) : (
            <PortalTableWrap>
              <thead>
                <tr>
                  <th>Emri</th>
                  <th>Email</th>
                  <th>Roli</th>
                </tr>
              </thead>
              <tbody>
                {company.memberships.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium">
                      {m.user.firstName} {m.user.lastName}
                    </td>
                    <td className="text-muted-foreground">{m.user.email}</td>
                    <td>{m.role.code}</td>
                  </tr>
                ))}
              </tbody>
            </PortalTableWrap>
          )}
        </SectionCard>

        {isDirectorate && (
          <CompanyEnforcementPanel
            companyId={company.id}
            companyName={company.name}
            status={company.status}
          />
        )}
      </DirectoratePageShell>
    </AppShell>
  );
}
