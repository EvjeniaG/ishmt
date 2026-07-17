import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { OfficialTableFooter, RegistryNumber, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import { isFieldInspectorRole } from "@/lib/permissions/ishmt-roles";
import { ApplicationService } from "@/lib/services/application-service";

export default async function MyApplicationReviewsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isFieldInspectorRole(session.user.roleCode)) redirect("/unauthorized");

  const ctx = {
    userId: session.user.id,
    email: session.user.email ?? "",
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    activeOrgId: session.user.activeOrgId,
    activeOrgType: session.user.activeOrgType,
    activeOrgName: session.user.activeOrgName,
    roleCode: session.user.roleCode,
    permissions: session.user.permissions,
  };

  const applications = await ApplicationService.listForContext(ctx, {
    queueBucket: "needs_action",
  });

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="ISHMT · Inspektor"
        title="Shqyrtimi i aplikimeve"
        description="Dosjet e caktuara nga përgjegjësi i sektorit — plotësoni raportin e shqyrtimit."
      >
        <SectionCard title="Detyrat e mia" subtitle="Aplikime në pritje të raportit">
          {applications.length === 0 ? (
            <PortalEmptyState>Nuk keni aplikime të caktuara për shqyrtim.</PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Nr. aplikimit</th>
                    <th>Lloji</th>
                    <th>Statusi</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, index) => (
                    <tr key={app.id}>
                      <td className="tabular-nums text-muted-foreground">{index + 1}</td>
                      <td>
                        <RegistryNumber>{app.applicationNumber}</RegistryNumber>
                      </td>
                      <td>{APPLICATION_TYPE_LABELS[app.type] ?? app.type}</td>
                      <td>
                        <ApplicationStatusBadge
                          status={app.status}
                          type={app.type}
                          roleCode={session.user.roleCode}
                        />
                      </td>
                      <td>
                        <Link href={`/ishmt/review/${app.id}`} className="portal-table-link">
                          Shqyrto dosjen
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PortalTableWrap>
              <OfficialTableFooter total={applications.length} />
            </>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
