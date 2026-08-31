import Link from "next/link";
import { redirect } from "next/navigation";
import { InspectionResult } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { PortalEmptyState } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { PERIODIC_INSPECTIONS_LABEL } from "@/lib/constants/periodic-inspection-labels";
import { ROLE_CODES } from "@/lib/constants/roles";

const RESULT_STYLES: Record<string, string> = {
  PASS: "bg-emerald-600 text-white",
  FAIL: "bg-red-600 text-white",
  CONDITIONAL: "bg-amber-500 text-white",
  PENDING: "bg-slate-400 text-white",
};

const TYPE_LABELS: Record<string, string> = {
  INITIAL: "Fillestar",
  PERIODIC: "Periodik",
  EXTRAORDINARY: "Jashtëzakonshme",
  RE_INSPECTION: "Rinspektim",
};

const RESULT_LABELS: Record<string, string> = {
  PASS: "Kalues",
  FAIL: "Jo kalues",
  CONDITIONAL: "Me kushte",
  PENDING: "Në pritje",
};

export default async function OwnerInspectionsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.OWNER) redirect("/unauthorized");

  const inspections = await OwnerPortalService.listInspections(session.user.activeOrgId);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title={PERIODIC_INSPECTIONS_LABEL}
        description="Historiku i inspektimeve periodike të regjistruara nga organizata OM/certifikuese."
      >
        {inspections.length === 0 ? (
          <PortalEmptyState>Nuk ka inspektime të regjistruara.</PortalEmptyState>
        ) : (
          <div className="grid gap-4">
            {inspections.map((insp) => {
              const resultKey = insp.result ?? InspectionResult.PENDING;
              return (
                <SectionCard
                  key={insp.id}
                  title={insp.elevator.registryNumber}
                  subtitle={TYPE_LABELS[insp.type] ?? insp.type}
                  actions={
                    <Link
                      href={`/portal/elevators/${insp.elevator.id}?tab=inspections`}
                      className="text-sm text-gov-primary hover:underline"
                    >
                      Hap dosjen →
                    </Link>
                  }
                  meta={
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${RESULT_STYLES[resultKey] ?? RESULT_STYLES.PENDING}`}
                    >
                      {RESULT_LABELS[resultKey] ?? resultKey}
                    </span>
                  }
                  padded
                >
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Data e kryerjes</p>
                      <p className="font-medium">
                        {insp.conductedDate
                          ? new Date(insp.conductedDate).toLocaleDateString("sq-AL")
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Inspektori</p>
                      <p className="font-medium">
                        {insp.inspector
                          ? `${insp.inspector.firstName} ${insp.inspector.lastName}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Inspektimi i radhës</p>
                      <p className="font-medium">
                        {insp.nextInspectionDate
                          ? new Date(insp.nextInspectionDate).toLocaleDateString("sq-AL")
                          : "-"}
                      </p>
                    </div>
                    <div className="flex items-end">
                      {insp.reportDocumentId && (
                        <Link
                          href={`/api/documents/${insp.reportDocumentId}/download`}
                          className="font-medium text-gov-primary hover:underline"
                        >
                          Shkarko raportin →
                        </Link>
                      )}
                    </div>
                  </div>
                </SectionCard>
              );
            })}
          </div>
        )}
      </StandardPageLayout>
    </AppShell>
  );
}
