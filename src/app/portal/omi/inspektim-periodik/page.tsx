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
import { requireServiceCapabilityForPage } from "@/lib/auth/page-guards";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";
import {
  PERIODIC_INSPECTION_HISTORY_LABEL,
  PERIODIC_INSPECTION_LABEL,
  PERIODIC_INSPECTIONS_LABEL,
} from "@/lib/constants/periodic-inspection-labels";
import {
  PERIODIC_INSPECTION_ALARM_DAYS_BEFORE,
  PERIODIC_INSPECTION_LOG_WINDOW_DAYS,
} from "@/lib/elevators/periodic-inspection-window";
import { db } from "@/lib/db";

export default async function CertifierPeriodicInspectionPage() {
  const ctx = await requireServiceCapabilityForPage("om");
  const [elevators, inspections, pending, orgApprovedBody] = await Promise.all([
    CertifierInspectionService.listAssignedElevators(ctx),
    CertifierInspectionService.listInspections(ctx),
    CertifierInspectionService.listPendingContracts(ctx),
    CertifierInspectionService.resolveApprovedBodyNumber(ctx.activeOrgId),
  ]);

  const options: InspectionElevatorOption[] = elevators
    .filter((e) => e.canLogNow)
    .map((e) => ({
      id: e.elevatorId,
      registryNumber: e.registryNumber,
      address: e.address,
      intervalMonths: e.intervalMonths,
      nextDue: e.nextDue.toISOString(),
      daysRemaining: e.daysRemaining,
      overdue: e.inspectionOverdue,
    }));

  const lastInspection = await db.inspection.findFirst({
    where: {
      inspector: {
        memberships: {
          some: {
            organizationId: ctx.activeOrgId,
            deactivatedAt: null,
          },
        },
      },
      approvedBodyNumber: { not: null },
    },
    orderBy: { conductedDate: "desc" },
    select: { approvedBodyNumber: true },
  });

  const defaultApprovedBodyNumber = orgApprovedBody ?? lastInspection?.approvedBodyNumber ?? undefined;
  const approvedBodyReadOnly = Boolean(orgApprovedBody);
  const defaultConductedDate = new Date().toISOString().slice(0, 10);

  return (
    <AppShell title={`${PERIODIC_INSPECTION_LABEL} (OM)`}>
      <StandardPageLayout
        eyebrow="Portali · Certifikues"
        title={PERIODIC_INSPECTIONS_LABEL}
        description="Regjistroni inspektime periodike vetëm për ashensorët me kontratë aktive OM"
        actions={
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {pending.length > 0 && (
              <Link
                href="/portal/omi/kontratat-kontrolli"
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
        <SectionCard title={`Regjistro ${PERIODIC_INSPECTION_LABEL.toLowerCase()}`} padded>
          {options.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Asnjë ashensor nuk ka afat inspektimi brenda {PERIODIC_INSPECTION_LOG_WINDOW_DAYS} ditëve.
              Regjistrimi hapet automatikisht {PERIODIC_INSPECTION_LOG_WINDOW_DAYS} ditë para afatit;{" "}
              {PERIODIC_INSPECTION_ALARM_DAYS_BEFORE} ditë para afatit vjen alarm për personin përgjegjës,
              OM-n dhe IQMT-n.
            </p>
          ) : (
            <PeriodicInspectionForm
              elevators={options}
              defaultConductedDate={defaultConductedDate}
              defaultApprovedBodyNumber={defaultApprovedBodyNumber}
              approvedBodyReadOnly={approvedBodyReadOnly}
            />
          )}
        </SectionCard>

        <SectionCard
          title={PERIODIC_INSPECTION_HISTORY_LABEL}
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
