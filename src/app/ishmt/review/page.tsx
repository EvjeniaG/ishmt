import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { OfficialTableFooter, RegistryNumber, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { labelApplicationType } from "@/lib/constants/display-labels";
import { ApplicationService } from "@/lib/services/application-service";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import type { ReviewQueueBucket } from "@/lib/services/application-participation";
import { currentPhaseLabel } from "@/lib/services/application-participation";

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showHistory = tab === "completed";
  const queueBucket: ReviewQueueBucket = showHistory ? "completed" : "active_pipeline";

  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_VIEW_ALL)) {
    redirect("/unauthorized");
  }

  const role = session.user.roleCode;

  const applications = await ApplicationService.listForContext(
    {
      userId: session.user.id,
      email: session.user.email ?? "",
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      activeOrgId: session.user.activeOrgId,
      activeOrgType: session.user.activeOrgType,
      activeOrgName: session.user.activeOrgName,
      roleCode: session.user.roleCode,
      permissions: session.user.permissions,
    },
    { queueBucket },
  );

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="IQMT · Shqyrtim administrativ"
        title="Aplikime në shqyrtim"
        description="Regjistri i aplikimeve të parashtruara te IQMT - në proces dhe historiku."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["active", "Në proces"],
              ["completed", "Historiku"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={key === "completed" ? "/ishmt/review?tab=completed" : "/ishmt/review"}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                (key === "completed") === showHistory
                  ? "border-primary bg-primary/5 font-medium"
                  : "hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <SectionCard
          title="Regjistri i aplikimeve"
          subtitle={
            showHistory
              ? "Të gjitha llojet e aplikimeve të mbyllura ose të vendosura"
              : "Të gjitha llojet e aplikimeve aktive në proces"
          }
          meta={
            <span className="portal-badge-neutral tabular-nums">{applications.length} aplikime</span>
          }
        >
          {applications.length === 0 ? (
            <PortalEmptyState>
              {showHistory ? "Nuk ka aplikime në historik." : "Nuk ka aplikime në proces."}
            </PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Nr. aplikimit</th>
                    <th>Lloji</th>
                    <th>Vendndodhja / Personi përgjegjës i ashensorit</th>
                    <th>Hallka aktuale</th>
                    <th>Progresi</th>
                    <th>Statusi</th>
                    <th>Afati</th>
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
                      <td>{labelApplicationType(app.type, app.data?.updateType)}</td>
                      <td>
                        <p>{app.data?.municipality?.nameSq ?? app.targetElevator?.registryNumber ?? "-"}</p>
                        <p className="text-xs font-normal text-muted-foreground">{app.ownerOrg.name}</p>
                      </td>
                      <td>
                        <p className="text-sm">{currentPhaseLabel(app.status)}</p>
                        {app.currentAssignee ? (
                          <p className="text-xs text-muted-foreground">
                            {app.currentAssignee.firstName} {app.currentAssignee.lastName}
                          </p>
                        ) : null}
                      </td>
                      <td className="text-sm text-muted-foreground">
                        {app.fieldReviewAssignments.length > 0
                          ? (() => {
                              const p = ApplicationService.getFieldReviewProgressSummary(
                                app.fieldReviewAssignments,
                              );
                              return `${p.completed} nga ${p.total} raporte`;
                            })()
                          : "-"}
                      </td>
                      <td>
                        <ApplicationStatusBadge
                          status={app.status}
                          type={app.type}
                          roleCode={role}
                        />
                      </td>
                      <td>
                        {app.submittedAt &&
                        ["SUBMITTED", "UNDER_REVIEW", "PENDING_CHIEF_INSPECTOR"].includes(app.status) ? (
                          <LegalDeadlineBadge submittedAt={app.submittedAt} compact />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
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
              <OfficialTableFooter total={applications.length} label="aplikime" />
            </>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
