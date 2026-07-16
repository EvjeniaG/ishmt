import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { MonthlyReportForm } from "@/components/maintenance/monthly-report-form";
import { MonthlyControlDetails } from "@/components/maintenance/monthly-control-details";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { MaintenanceWorkService } from "@/lib/services/maintenance-work-service";
import { ROLE_CODES } from "@/lib/constants/roles";
import { fmtDateSq } from "@/components/elevators/registry-shared";
import {
  formatMonthlyControlSummary,
  parseMonthlyControlPayload,
} from "@/lib/maintenance/monthly-control-payload";

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
    <AppShell title="Kontrollet periodike mujore">
      <StandardPageLayout
        eyebrow="Portali · Mirëmbajtje"
        title="Kontrolli periodik mujor"
        actions={
          <Link href="/portal/dashboard" className="text-sm text-gov-primary hover:underline">
            ← Kthehu te paneli
          </Link>
        }
      >
        <SectionCard title="Regjistro kontrollin periodik" padded>
          <MonthlyReportForm elevators={options} />
        </SectionCard>

        <SectionCard
          title="Historiku i kontrolleve"
          meta={
            <span className="portal-badge-neutral tabular-nums">{reports.length} regjistrime</span>
          }
          padded
        >
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nuk ka kontrolle të regjistruara.</p>
          ) : (
            <div className="space-y-4">
              {reports.map((r) => {
                const payload = parseMonthlyControlPayload(r.findings);
                const d = new Date(r.performedDate);
                return (
                  <div key={r.id} className="rounded-lg border border-border/70 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {r.elevator.registryNumber} · {MONTHS[d.getMonth()]} {d.getFullYear()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDateSq(d.toISOString())}
                          {r.technicianName ? ` · ${r.technicianName}` : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          payload?.result === "FAIL"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {payload?.result === "FAIL" ? "JO KALUES" : payload ? "KALUES" : "Regjistruar"}
                      </span>
                    </div>
                    {payload ? (
                      <MonthlyControlDetails findings={r.findings} />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {formatMonthlyControlSummary(r.findings) ?? r.description ?? "Regjistrim legacy"}
                      </p>
                    )}
                    {r.document && (
                      <a
                        href={`/api/documents/${r.document.id}/download`}
                        className="mt-3 inline-block text-sm text-gov-primary hover:underline"
                      >
                        {r.document.originalFilename}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
