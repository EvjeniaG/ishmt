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
  return parts.length ? parts.join(" · ") : "—";
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

  const [pending, completed] = await Promise.all([
    FieldInspectorWorkloadService.listPendingDocumentReviews(ctx),
    FieldInspectorWorkloadService.listCompletedDocumentReviews(ctx),
  ]);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="IQMT · Inspektor"
        title="Shqyrtimi i aplikimeve"
        description="Dosjet e caktuara për shqyrtim dokumentacioni dhe historiku i punës suaj."
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
          title="Detyrat aktive"
          subtitle="Dosje në pritje të raportit tuaj"
          meta={
            <span className="workflow-status-outline tabular-nums">
              {pending.length} aktive
            </span>
          }
        >
          {pending.length === 0 ? (
            <PortalEmptyState>Nuk keni aplikime të caktuara për shqyrtim.</PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Nr. aplikimit</th>
                    <th>Lloji</th>
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
          title="Historiku"
          subtitle="Dosjet e shqyrtuara — dosja e plotë mbetet e hapur edhe pas regjistrimit"
          meta={
            <span className="workflow-status-outline tabular-nums">
              {completed.length} përfunduar
            </span>
          }
        >
          {completed.length === 0 ? (
            <PortalEmptyState>
              Ende nuk keni përfunduar shqyrtime. Pas dorëzimit të raportit, dosjet do të shfaqen këtu.
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
                  {completed.map((app, index) => (
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
                        {app.completedAt ? formatDateSq(app.completedAt) : "—"}
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
              <OfficialTableFooter total={completed.length} label="dosje" />
            </>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
