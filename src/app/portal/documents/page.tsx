import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { PortalDocumentsService } from "@/lib/services/portal-documents-service";
import { portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { ROLE_CODES } from "@/lib/constants/roles";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { PERMISSIONS } from "@/lib/permissions/codes";

const ALLOWED_ROLES = [
  ROLE_CODES.OWNER,
  ROLE_CODES.INSTALLER,
  ROLE_CODES.CERTIFIER,
  ROLE_CODES.MAINTENANCE,
];

export default async function PortalDocumentsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!ALLOWED_ROLES.includes(session.user.roleCode as typeof ALLOWED_ROLES[number])) {
    redirect("/unauthorized");
  }
  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.DOCUMENTS_VIEW)) {
    redirect("/unauthorized");
  }

  const ctx = await requireAuthForPage();
  const documents = await PortalDocumentsService.listForOrg(ctx);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow={portalEyebrowForRole(session.user.roleCode)}
        title="Dokumentet"
        description="Arkiva e dokumenteve të organizatës suaj"
      >
        <SectionCard
          title="Arkiva e dokumenteve"
          meta={
            <span className="portal-badge-neutral tabular-nums">{documents.length} regjistrime</span>
          }
        >
          {documents.length === 0 ? (
            <PortalEmptyState>Nuk ka dokumente të ngarkuara.</PortalEmptyState>
          ) : (
            <PortalTableWrap>
              <thead>
                <tr>
                  <th>Dokumenti</th>
                  <th>Lloji</th>
                  <th>Referenca</th>
                  <th>Ngarkuar nga</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.originalFilename}</td>
                    <td>{doc.classification}</td>
                    <td>{doc.reference}</td>
                    <td>{doc.uploadedBy ?? "-"}</td>
                    <td>{new Date(doc.uploadedAt).toLocaleDateString("sq-AL")}</td>
                    <td>
                      <Link href={`/api/documents/${doc.id}/download`} className="text-gov-primary hover:underline">
                        Shkarko
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PortalTableWrap>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
