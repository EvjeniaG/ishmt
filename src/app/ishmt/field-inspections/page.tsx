import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import {
  FieldInspectionAssignForm,
  FieldInspectionAssignmentsTable,
  FieldInspectionSummaryCards,
} from "@/components/ishmt/field-inspection-panels";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { summarizeFieldInspections } from "@/lib/ishmt/field-inspection-labels";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { canAssignFieldInspections } from "@/lib/permissions/ishmt-roles";
import { IshmtFieldInspectionService } from "@/lib/services/ishmt-field-inspection-service";

export default async function FieldInspectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ applicationId?: string }>;
}) {
  const { applicationId } = await searchParams;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const canAssign =
    canAssignFieldInspections(session.user.roleCode) &&
    roleHasPermission(session.user.roleCode, PERMISSIONS.INSPECTIONS_FIELD_ASSIGN);
  const canViewAll = roleHasPermission(session.user.roleCode, PERMISSIONS.INSPECTIONS_FIELD_VIEW_ALL);

  if (!canAssign && !canViewAll) redirect("/unauthorized");

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

  const [assignments, inspectors, filteredApplication] = await Promise.all([
    IshmtFieldInspectionService.listForAssigner(ctx, applicationId ? { applicationId } : undefined),
    canAssign ? IshmtFieldInspectionService.listFieldInspectors(ctx) : Promise.resolve([]),
    applicationId
      ? db.application.findFirst({
          where: { id: applicationId, deletedAt: null },
          select: { id: true, applicationNumber: true },
        })
      : Promise.resolve(null),
  ]);

  const summary = summarizeFieldInspections(assignments);

  return (
    <AppShell title="Inspektimet në terren">
      <StandardPageLayout eyebrow="IQMT · Inspektim terreni" title="Caktim inspektimi">
        {filteredApplication ? (
          <p className="text-base text-muted-foreground">
            Filtruar:{" "}
            <Link
              href={`/ishmt/review/${filteredApplication.id}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {filteredApplication.applicationNumber}
            </Link>
            {" · "}
            <Link href="/ishmt/field-inspections" className="underline underline-offset-2">
              Hiq filtrin
            </Link>
          </p>
        ) : null}

        <FieldInspectionSummaryCards summary={summary} />

        {canAssign && <FieldInspectionAssignForm inspectors={inspectors} />}

        <SectionCard
          title={filteredApplication ? "Caktimet për këtë aplikim" : "Caktimet"}
          meta={
            <span className="portal-badge-neutral tabular-nums">
              {summary.total} regjistrime
            </span>
          }
        >
          <FieldInspectionAssignmentsTable
            assignments={assignments}
            roleCode={session.user.roleCode}
            canCancel={canAssign && roleHasPermission(session.user.roleCode, PERMISSIONS.INSPECTIONS_FIELD_CANCEL)}
          />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
