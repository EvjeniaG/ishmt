import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { InterventionForm } from "@/components/maintenance/intervention-form";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { MaintenanceWorkService } from "@/lib/services/maintenance-work-service";
import { ROLE_CODES } from "@/lib/constants/roles";

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("sq-AL") : "-";
}

export default async function InterventionPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.MAINTENANCE) redirect("/unauthorized");

  const ctx = await requireAuthForPage();
  const [elevators, interventions] = await Promise.all([
    MaintenanceWorkService.listAssignedElevators(ctx),
    MaintenanceWorkService.listInterventions(ctx),
  ]);

  const options = elevators.map((e) => ({
    id: e.elevatorId,
    registryNumber: e.registryNumber,
    address: e.address,
  }));

  return (
    <AppShell title="Ndërhyrjet e mirëmbajtjes">
      <StandardPageLayout
        eyebrow="Portali · Mirëmbajtje"
        title="Ndërhyrjet e mirëmbajtjes"
        description="Regjistroni ndërhyrjet dhe shikoni historikun"
        actions={
          <Link href="/portal/dashboard" className="text-sm text-gov-primary hover:underline">
            ← Kthehu te paneli
          </Link>
        }
      >
        <SectionCard title="Regjistro ndërhyrje të re" padded>
          <InterventionForm elevators={options} />
        </SectionCard>

        <SectionCard
          title="Historiku i ndërhyrjeve"
          meta={
            <span className="portal-badge-neutral tabular-nums">{interventions.length} regjistrime</span>
          }
          padded
        >
          {interventions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nuk ka ndërhyrje të regjistruara.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Data</th>
                    <th>Ashensori</th>
                    <th>Lloji</th>
                    <th>Tekniku</th>
                    <th>Kohëzgjatja</th>
                  </tr>
                </thead>
                <tbody>
                  {interventions.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2">{fmtDate(r.performedDate)}</td>
                      <td>{r.elevator.registryNumber}</td>
                      <td>{r.interventionType ?? r.type}</td>
                      <td>{r.technicianName ?? "-"}</td>
                      <td>
                        {r.durationMinutes != null
                          ? `${Math.floor(r.durationMinutes / 60)}h ${r.durationMinutes % 60}min`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
