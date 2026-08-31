import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { InspectorCitizenReportsTable } from "@/components/ishmt/inspector-citizen-reports-table";
import { getAuthSession } from "@/lib/auth";
import { isFieldInspectorRole } from "@/lib/permissions/ishmt-roles";
import { CitizenReportService } from "@/lib/services/citizen-report-service";

export default async function MyCitizenReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showHistory = tab === "history";

  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isFieldInspectorRole(session.user.roleCode)) redirect("/unauthorized");

  const [activeReports, closedReports] = await Promise.all([
    CitizenReportService.listAssignedToInspector(session.user.id, { activeOnly: true }),
    CitizenReportService.listAssignedToInspector(session.user.id, { closedOnly: true }),
  ]);

  const reports = showHistory ? closedReports : activeReports;

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="IQMT · Inspektor"
        title="Raportimet e mia nga qytetarët"
        description="Raportime publike të caktuara për hetim në terren - vetëm ato që ju takojnë."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ["active", "Në proces"],
              ["history", "Historiku"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={
                key === "history"
                  ? "/ishmt/my-citizen-reports?tab=history"
                  : "/ishmt/my-citizen-reports"
              }
              className={`rounded-md border px-3 py-1.5 text-sm ${
                (key === "history") === showHistory
                  ? "border-primary bg-primary/5 font-medium"
                  : "hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <SectionCard
          title={showHistory ? "Raportime të mbyllura" : "Raportime aktive"}
          subtitle={
            showHistory
              ? "Raportime që keni zgjidhur ose që u mbyllën"
              : "Presin hetim, përditësim statusi ose mbyllje"
          }
          meta={
            <span className="portal-badge-neutral tabular-nums">
              {reports.length} raportime
            </span>
          }
          padded
        >
          <InspectorCitizenReportsTable
            rows={reports}
            variant={showHistory ? "closed" : "active"}
            emptyMessage={
              showHistory
                ? "Nuk keni raportime të mbyllura."
                : "Nuk keni raportime aktive nga qytetarët. Njoftimet do të shfaqen kur ju caktohet një raportim."
            }
          />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
