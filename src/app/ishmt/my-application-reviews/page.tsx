import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { OfficialTableFooter, RegistryNumber, SectionCard } from "@/components/shared/institutional";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import { getAuthSession } from "@/lib/auth";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import { formatDateSq } from "@/lib/format-date";
import { isFieldInspectorRole } from "@/lib/permissions/ishmt-roles";
import { FieldInspectorWorkloadService } from "@/lib/services/field-inspector-workload-service";

function locationLabel(
  buildingAddress: string | null | undefined,
  municipalityName: string | null | undefined,
) {
  const parts = [buildingAddress, municipalityName].filter(Boolean);
  return parts.length ? parts.join(" · ") : "-";
}

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

  const [pending, closed] = await Promise.all([
    FieldInspectorWorkloadService.listRegistrationPipelineDocumentReviews(ctx),
    FieldInspectorWorkloadService.listClosedDocumentReviews(ctx),
  ]);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="IQMT · Inspektor"
        title="Shqyrtimi i aplikimeve"
        description="Dosjet e caktuara mbeten këtu me statusin aktual deri te regjistrimi nga kryeinspektori."
        actions={
          <Link
            href="/ishmt/inspector/dashboard"
            className="text-sm font-medium text-gov-primary hover:underline"
          >
            ← Paneli im
          </Link>
        }
      >
        <SectionCard
          title="Dosjet në proces"
          subtitle="Shqyrtim dokumentacioni - statusi i aplikimit përditësohet deri te miratimi"
          meta={
            <span className="workflow-status-outline tabular-nums">
              {pending.length} aktive
            </span>
          }
        >
          {pending.length === 0 ? (
            <PortalEmptyState>Nuk keni aplikime për regjistrim në proces.</PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Nr. aplikimit</th>
                    <th>Lloji</th>
                    <th>Statusi i aplikimit</th>
                    <th>Vendndodhja</th>
                    <th>Terren</th>
                    <th>Caktuar</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((app, index) => (
                    <tr key={app.assignmentId}>
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
                      <td className="max-w-[14rem] truncate text-muted-foreground">
                        {locationLabel(app.buildingAddress, app.municipalityName)}
                      </td>
                      <td>
                        {app.requiresFieldVerification ? (
                          <WorkflowStatusChip label="Kërkohet" tone="waiting" />
                        ) : (
                          <span className="text-sm text-muted-foreground">Jo</span>
                        )}
                      </td>
                      <td className="tabular-nums text-muted-foreground">
                        {formatDateSq(app.assignedAt)}
                      </td>
                      <td>
                        <Link href={`/ishmt/review/${app.applicationId}`} className="portal-table-link">
                          Shqyrto dosjen
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PortalTableWrap>
              <OfficialTableFooter total={pending.length} />
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Të mbyllura"
          meta={
            <span className="workflow-status-outline tabular-nums">
              {closed.length} regjistruar ose mbyllur
            </span>
          }
        >
          {closed.length === 0 ? (
            <PortalEmptyState>
              Dosjet do të shfaqen këtu pasi kryeinspektori të miratojë ose refuzojë aplikimin.
            </PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Nr. aplikimit</th>
                    <th>Lloji</th>
                    <th>Statusi i dosjes</th>
                    <th>Përfunduar</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {closed.map((app, index) => (
                    <tr key={app.assignmentId}>
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
                      <td className="tabular-nums text-muted-foreground">
                        {app.completedAt ? formatDateSq(app.completedAt) : "-"}
                      </td>
                      <td>
                        <Link href={`/ishmt/review/${app.applicationId}`} className="portal-table-link">
                          Shiko dosjen e plotë
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PortalTableWrap>
              <OfficialTableFooter total={closed.length} label="dosje" />
            </>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
