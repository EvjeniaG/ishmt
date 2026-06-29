import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import {
  OfficialTableFooter,
  RegistryNumber,
  SectionCard,
} from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import { canApproveApplications } from "@/lib/permissions/ishmt-roles";
import { ApplicationService } from "@/lib/services/application-service";

export default async function ChiefApprovalsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!canApproveApplications(session.user.roleCode)) redirect("/unauthorized");

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
    status: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <PageHeader
          eyebrow="ISHMT"
          title="Aplikime për miratim"
          description="Dosjet e shqyrtuara nga specialistët, në pritje të vendimit të miratimit ose refuzimit."
        />

        <SectionCard
          title="Regjistri i miratimeve"
          subtitle="Dosjet në pritje të vendimit final"
          meta={
            <span className="portal-badge-warning tabular-nums">{applications.length} në pritje</span>
          }
        >
          {applications.length === 0 ? (
            <PortalEmptyState>Nuk ka aplikime në pritje të miratimit.</PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Nr. aplikimit</th>
                    <th>Lloji</th>
                    <th>Adresa</th>
                    <th>Statusi</th>
                    <th>Data e dërgimit</th>
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
                      <td>{app.data?.buildingAddress ?? "-"}</td>
                      <td>
                        <ApplicationStatusBadge
                          status={app.status}
                          type={app.type}
                          roleCode={session.user.roleCode}
                        />
                      </td>
                      <td className="tabular-nums">
                        {app.submittedAt
                          ? new Date(app.submittedAt).toLocaleDateString("sq-AL")
                          : "-"}
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
      </div>
    </AppShell>
  );
}
