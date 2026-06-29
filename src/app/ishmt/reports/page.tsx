import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { OfficialTableFooter, SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState } from "@/components/shared/portal-table";
import { getAuthSession } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { CitizenReportService } from "@/lib/services/citizen-report-service";
import {
  CITIZEN_REPORT_STATUS_LABELS,
  CITIZEN_REPORT_TYPE_LABELS,
  REPORT_PRIORITY_CLASS,
  REPORT_PRIORITY_LABELS,
} from "@/lib/registration/report-labels";

export default async function CitizenReportsQueuePage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.REPORTS_VIEW)) {
    redirect("/unauthorized");
  }

  const reports = await CitizenReportService.listForReview();

  return (
    <AppShell title="Raportimet e qytetarëve">
      <StandardPageLayout
        eyebrow="ISHMT · Raportime publike"
        title="Raportimet e qytetarëve"
        description="Raportime publike për probleme sigurie dhe ashensorë të paregjistruar"
      >
        <SectionCard
          title="Regjistri i raportimeve"
          subtitle="Të gjitha raportimet e parashtruara nga qytetarët"
          meta={
            <span className="portal-badge-neutral tabular-nums">{reports.length} raportime</span>
          }
          padded
        >
          {reports.length === 0 ? (
            <PortalEmptyState>Nuk ka raportime.</PortalEmptyState>
          ) : (
            <>
              <ul className="divide-y">
                {reports.map((report) => (
                  <li key={report.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                    <div className="min-w-0">
                      <Link
                        href={`/ishmt/reports/${report.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {report.reportNumber}
                      </Link>
                      <p className="text-muted-foreground">
                        {CITIZEN_REPORT_TYPE_LABELS[report.type]}
                        {report.elevator ? ` · ${report.elevator.registryNumber}` : ""}
                        {report.municipality ? ` · ${report.municipality.nameSq}` : ""}
                      </p>
                      <p className="mt-1 line-clamp-1 text-muted-foreground">{report.description}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${REPORT_PRIORITY_CLASS[report.priority]}`}
                      >
                        {REPORT_PRIORITY_LABELS[report.priority]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {CITIZEN_REPORT_STATUS_LABELS[report.status]}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <OfficialTableFooter total={reports.length} label="raportime" />
            </>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
