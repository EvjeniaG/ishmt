import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ReportExportPanel } from "@/components/reports/report-export-panel";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { db } from "@/lib/db";
import { getAvailableReports } from "@/lib/reports/report-catalog";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";

export default async function ReportsExportPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.REPORTS_EXPORT)) {
    redirect("/unauthorized");
  }

  const ctx = await requireAuthForPage();
  const [reports, municipalities] = await Promise.all([
    Promise.resolve(getAvailableReports(ctx)),
    db.geoMunicipality.findMany({
      where: { isActive: true },
      orderBy: { nameSq: "asc" },
      select: { id: true, nameSq: true },
    }),
  ]);

  return (
    <AppShell title="Raportet">
      <StandardPageLayout
        eyebrow="Sistemi i regjistrimit"
        title="Gjenerimi i raporteve"
      >
        <ReportExportPanel reports={reports} municipalities={municipalities} />
      </StandardPageLayout>
    </AppShell>
  );
}
