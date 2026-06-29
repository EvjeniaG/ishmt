import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { OmiInspectionHistoryList } from "@/components/certifier/omi-inspection-history-list";
import {
  PeriodicInspectionForm,
  type InspectionElevatorOption,
} from "@/components/maintenance/periodic-inspection-form";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function CertifierPeriodicInspectionPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.CERTIFIER) redirect("/unauthorized");

  const ctx = await requireAuthForPage();
  const [elevators, inspections, pending] = await Promise.all([
    CertifierInspectionService.listAssignedElevators(ctx),
    CertifierInspectionService.listInspections(ctx),
    CertifierInspectionService.listPendingContracts(ctx),
  ]);

  const options: InspectionElevatorOption[] = elevators.map((e) => ({
    id: e.elevatorId,
    registryNumber: e.registryNumber,
    address: e.address,
    intervalMonths: e.intervalMonths,
    nextDue: e.nextDue.toISOString(),
    daysRemaining: e.daysRemaining,
    overdue: e.inspectionOverdue,
  }));

  return (
    <AppShell title="Inspektimi periodik (OMI)">
      <StandardPageLayout
        eyebrow="Portali · Certifikues"
        title="Inspektimet periodike"
        description="Regjistroni inspektime periodike për ashensorët me kontratë aktive OMI"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {pending.length > 0 && (
              <Link
                href="/portal/omi/kontratat"
                className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800 hover:bg-amber-200"
              >
                {pending.length} kontratë në pritje →
              </Link>
            )}
            <Link href="/portal/dashboard" className="text-gov-primary hover:underline">
              ← Kthehu te paneli
            </Link>
          </div>
        }
      >
        <SectionCard title="Regjistro inspektim periodik" padded>
          <PeriodicInspectionForm elevators={options} />
        </SectionCard>

        <SectionCard
          title="Historiku i inspektimeve"
          meta={
            <span className="portal-badge-neutral tabular-nums">{inspections.length} regjistrime</span>
          }
        >
          <OmiInspectionHistoryList
            items={inspections.map((i) => ({
              id: i.id,
              registryNumber: i.elevator.registryNumber,
              buildingAddress: i.elevator.buildingAddress,
              conductedDate: i.conductedDate,
              result: i.result,
              approvedBodyNumber: i.approvedBodyNumber,
              examinationType: i.examinationType,
              reportDocument: i.reportDocument,
            }))}
          />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
