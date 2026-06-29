import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { MonthlyReportForm } from "@/components/maintenance/monthly-report-form";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { MaintenanceWorkService } from "@/lib/services/maintenance-work-service";
import { ROLE_CODES } from "@/lib/constants/roles";

const MONTHS = [
  "Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor",
  "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor",
];

export default async function MonthlyReportPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.MAINTENANCE) redirect("/unauthorized");

  const ctx = await requireAuthForPage();
  const [elevators, reports] = await Promise.all([
    MaintenanceWorkService.listAssignedElevators(ctx),
    MaintenanceWorkService.listMonthlyReports(ctx),
  ]);

  const options = elevators.map((e) => ({
    id: e.elevatorId,
    registryNumber: e.registryNumber,
    address: e.address,
  }));

  return (
    <AppShell title="Raporte mujore mirëmbajtjeje">
      <StandardPageLayout
        eyebrow="Portali · Mirëmbajtje"
        title="Raporte mujore mirëmbajtjeje"
        description="Ngarkoni dhe shikoni raportet mujore të shërbimit"
        actions={
          <Link href="/portal/dashboard" className="text-sm text-gov-primary hover:underline">
            ← Kthehu te paneli
          </Link>
        }
      >
        <SectionCard title="Ngarko raport mujor" padded>
          <MonthlyReportForm elevators={options} />
        </SectionCard>

        <SectionCard
          title="Historiku i raporteve"
          meta={
            <span className="portal-badge-neutral tabular-nums">{reports.length} regjistrime</span>
          }
          padded
        >
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nuk ka raporte të ngarkuara.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Periudha</th>
                    <th>Ashensori</th>
                    <th>Dokumenti</th>
                    <th>Statusi</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const d = new Date(r.performedDate);
                    return (
                      <tr key={r.id} className="border-b">
                        <td className="py-2">
                          {MONTHS[d.getMonth()]} {d.getFullYear()}
                        </td>
                        <td>{r.elevator.registryNumber}</td>
                        <td>
                          {r.document ? (
                            <a
                              href={`/api/documents/${r.document.id}/download`}
                              className="text-gov-primary hover:underline"
                            >
                              {r.document.originalFilename}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            Ngarkuar
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
