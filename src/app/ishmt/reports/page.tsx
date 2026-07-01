import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { CitizenReportsList } from "@/components/ishmt/citizen-reports-list";
import { getAuthSession } from "@/lib/auth";
import {
  CITIZEN_REPORT_ACTIVE_STATUSES,
  CITIZEN_REPORT_CLOSED_STATUSES,
} from "@/lib/ishmt/citizen-report-queue";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { CitizenReportService } from "@/lib/services/citizen-report-service";

export default async function CitizenReportsQueuePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.REPORTS_VIEW)) {
    redirect("/unauthorized");
  }

  const [activeReports, closedReports] = await Promise.all([
    CitizenReportService.listForReview({ statuses: CITIZEN_REPORT_ACTIVE_STATUSES }),
    CitizenReportService.listForReview({ statuses: CITIZEN_REPORT_CLOSED_STATUSES }),
  ]);

  return (
    <AppShell title="Raportimet e qytetarëve">
      <StandardPageLayout
        eyebrow="ISHMT · Raportime publike"
        title="Raportimet e qytetarëve"
        description="Raportime publike për probleme sigurie dhe ashensorë të paregjistruar"
      >
        <SectionCard
          title="Radha e shqyrtimit"
          subtitle="Raportime që presin shqyrtim, caktim ose hetim"
          meta={
            <span className="portal-badge-neutral tabular-nums">{activeReports.length} raportime</span>
          }
          padded
        >
          <CitizenReportsList
            reports={activeReports}
            variant="active"
            emptyMessage="Nuk ka raportime në radhë."
          />
        </SectionCard>

        <SectionCard
          title="Regjistri i raportimeve të zgjidhura"
          subtitle="Raportimet e mbyllura me shënim zgjidhjeje"
          meta={
            <span className="portal-badge-neutral tabular-nums">{closedReports.length} raportime</span>
          }
          padded
        >
          <CitizenReportsList
            reports={closedReports}
            variant="closed"
            emptyMessage="Nuk ka raportime të zgjidhura ende."
          />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
