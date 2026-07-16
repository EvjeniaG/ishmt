import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractResponseButtons } from "@/components/maintenance/contract-response-buttons";
import { InterventionForm } from "@/components/maintenance/intervention-form";
import { MonthlyReportForm } from "@/components/maintenance/monthly-report-form";
import { Button } from "@/components/ui/button";
import { fmtDateSq } from "@/components/elevators/registry-shared";

type PendingContract = {
  id: string;
  contractNumber: string | null;
  startDate: Date;
  endDate: Date | null;
  documentId: string | null;
};

export function MaintenanceDossierActions({
  elevatorId,
  registryNumber,
  pendingContract,
  showServiceLinks = true,
  showInterventionForm = false,
  showMonthlyReportForm = false,
  hasActiveMaintenanceContract = false,
}: {
  elevatorId: string;
  registryNumber: string;
  pendingContract: PendingContract | null;
  /** Fsheh lidhjet e ndërhyrjeve/raporteve (p.sh. për OMI që vetëm pranon kontratën). */
  showServiceLinks?: boolean;
  /** Shfaq formularin e ndërhyrjes direkt në dosje. */
  showInterventionForm?: boolean;
  /** Shfaq formularin e kontrollit periodik mujor. */
  showMonthlyReportForm?: boolean;
  hasActiveMaintenanceContract?: boolean;
}) {
  return (
    <div className="space-y-4">
      {pendingContract && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">Kontrata e mirëmbajtjes - në pritje të pranimit</CardTitle>
            <p className="text-sm text-muted-foreground">
              Personi përgjegjës i ashensorit ju ka caktuar si kompani mirëmbajtjeje. Ngarkoni kontratën e nënshkruar dhe pranoni ftesën.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted-foreground">Nr. kontratës:</span>{" "}
              <span className="font-mono font-medium">{pendingContract.contractNumber ?? "-"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Periudha:</span>{" "}
              {fmtDateSq(pendingContract.startDate.toISOString())} –{" "}
              {fmtDateSq(pendingContract.endDate?.toISOString() ?? null)}
            </p>
            <ContractResponseButtons
              contractId={pendingContract.id}
              elevatorId={elevatorId}
              mode="maintenance"
            />
          </CardContent>
        </Card>
      )}

      {showInterventionForm && hasActiveMaintenanceContract && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regjistro ndërhyrje mirëmbajtjeje</CardTitle>
            <p className="text-sm text-muted-foreground">
              Dokumentoni ndërhyrjen për ashensorin {registryNumber}.
            </p>
          </CardHeader>
          <CardContent>
            <InterventionForm
              fixedElevatorId={elevatorId}
              elevators={[{ id: elevatorId, registryNumber, address: "" }]}
            />
          </CardContent>
        </Card>
      )}

      {showMonthlyReportForm && hasActiveMaintenanceContract && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kontroll periodik mujor</CardTitle>
            <p className="text-sm text-muted-foreground">
              Plotësoni fushat e kontrollit për ashensorin {registryNumber} — detyrim çdo 30 ditë.
            </p>
          </CardHeader>
          <CardContent>
            <MonthlyReportForm
              fixedElevatorId={elevatorId}
              elevators={[{ id: elevatorId, registryNumber, address: "" }]}
            />
          </CardContent>
        </Card>
      )}

      {showServiceLinks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shërbimet e mirëmbajtjes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Regjistroni ndërhyrjet dhe kontrollet periodike mujore për këtë ashensor.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/portal/sherbimi/nderhyrje">Ndërhyrjet</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/portal/sherbimi/raport-mujor">Kontrolli periodik mujor</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
