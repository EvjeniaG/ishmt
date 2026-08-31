import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FieldInspectorDashboard } from "@/components/ishmt/field-inspector-dashboard";
import { getAuthSession } from "@/lib/auth";
import { isFieldInspectorRole } from "@/lib/permissions/ishmt-roles";
import { FieldInspectorWorkloadService } from "@/lib/services/field-inspector-workload-service";
import { IshmtAlarmService } from "@/lib/services/ishmt-alarm-service";

export default async function FieldInspectorDashboardPage() {
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

  const [summary, pipelineDocumentReviews, closedDocumentReviews, fieldInspections, alarms] =
    await Promise.all([
      FieldInspectorWorkloadService.getSummary(ctx),
      FieldInspectorWorkloadService.listRegistrationPipelineDocumentReviews(ctx),
      FieldInspectorWorkloadService.listClosedDocumentReviews(ctx),
      FieldInspectorWorkloadService.listFieldInspections(ctx),
      IshmtAlarmService.getAlarms(ctx),
    ]);

  return (
    <AppShell title="Paneli im">
      <FieldInspectorDashboard
        summary={summary}
        pendingDocumentReviews={pipelineDocumentReviews}
        completedDocumentReviews={closedDocumentReviews}
        fieldInspections={fieldInspections}
        alarms={alarms}
        roleCode={session.user.roleCode}
      />
    </AppShell>
  );
}
