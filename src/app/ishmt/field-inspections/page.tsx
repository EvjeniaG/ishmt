import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import {
  FieldInspectionAssignForm,
  FieldInspectionAssignmentsTable,
  FieldInspectionSummaryCards,
} from "@/components/ishmt/field-inspection-panels";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { summarizeFieldInspections } from "@/lib/ishmt/field-inspection-labels";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { canAssignFieldInspections } from "@/lib/permissions/ishmt-roles";
import { IshmtFieldInspectionService } from "@/lib/services/ishmt-field-inspection-service";

export default async function FieldInspectionsPage() {
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

  const [assignments, inspectors] = await Promise.all([
    IshmtFieldInspectionService.listForAssigner(ctx),
    canAssign ? IshmtFieldInspectionService.listFieldInspectors(ctx) : Promise.resolve([]),
  ]);

  const summary = summarizeFieldInspections(assignments);

  return (
    <AppShell title="Inspektimet në terren">
      <div className="space-y-6">
        <PageHeader
          eyebrow="ISHMT · Inspektim terreni"
          title="Caktim inspektimi"
        />

        <FieldInspectionSummaryCards summary={summary} />

        {canAssign && <FieldInspectionAssignForm inspectors={inspectors} />}

        <SectionCard
          title="Caktimet"
          meta={
            <span className="portal-badge-neutral tabular-nums">
              {summary.total} regjistrime
            </span>
          }
        >
          <FieldInspectionAssignmentsTable
            assignments={assignments}
            canCancel={canAssign && roleHasPermission(session.user.roleCode, PERMISSIONS.INSPECTIONS_FIELD_CANCEL)}
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}
