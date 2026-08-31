import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationStatus, ApplicationType } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { LegalDeadlineBadge } from "@/components/deadlines/deadline-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { OfficialTableFooter, RegistryNumber, SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import { canChiefHandleApplications } from "@/lib/permissions/ishmt-roles";
import { db } from "@/lib/db";
import { withDemoDataApplicationScope } from "@/lib/demo/demo-data-mode";

export default async function ChiefInboxPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!canChiefHandleApplications(session.user.roleCode)) redirect("/unauthorized");

  const applications = await db.application.findMany({
    where: withDemoDataApplicationScope({
      deletedAt: null,
      type: ApplicationType.NEW_REGISTRATION,
      status: ApplicationStatus.SUBMITTED,
    }),
    include: {
      data: { select: { buildingAddress: true } },
      ownerOrg: { select: { name: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="IQMT · Kryeinspektor"
        title="Aplikime të reja për rregjistrim"
        description="Aplikimet e dërguara nga personi përgjegjës - delegoni te drejtori i drejtorisë dhe caktoni numrin e inspektorëve."
      >
        <SectionCard title="Radha e aplikimeve" subtitle="Në pritje të delegimit">
          {applications.length === 0 ? (
            <PortalEmptyState>Nuk ka aplikime të reja.</PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th className="w-12">#</th>
                    <th>Nr. aplikimit</th>
                    <th>Lloji</th>
                    <th>Personi përgjegjës</th>
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
                      <td>{APPLICATION_TYPE_LABELS[app.type] ?? app.type}</td>
                      <td>{app.ownerOrg.name}</td>
                      <td>
                        <ApplicationStatusBadge
                          status={app.status}
                          type={app.type}
                          roleCode={session.user.roleCode}
                        />
                      </td>
                      <td>
                        {app.submittedAt ? (
                          <LegalDeadlineBadge submittedAt={app.submittedAt} compact />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <Link href={`/ishmt/review/${app.id}`} className="portal-table-link">
                          Delego
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
