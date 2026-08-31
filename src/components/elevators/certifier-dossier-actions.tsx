import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractResponseButtons } from "@/components/maintenance/contract-response-buttons";
import { Button } from "@/components/ui/button";
import { fmtDateSq } from "@/components/elevators/registry-shared";
import {
  PERIODIC_INSPECTION_CONTRACT_LABEL,
  PERIODIC_INSPECTION_LABEL,
  PERIODIC_INSPECTIONS_LABEL,
  REGISTER_PERIODIC_INSPECTION_LABEL,
} from "@/lib/constants/periodic-inspection-labels";

type PendingContract = {
  id: string;
  contractNumber: string | null;
  startDate: Date;
  endDate: Date | null;
  documentId: string | null;
};

export function CertifierDossierActions({
  elevatorId,
  registryNumber,
  pendingContract,
  canLogPeriodicInspection = false,
}: {
  elevatorId: string;
  registryNumber: string;
  pendingContract: PendingContract | null;
  /** Vetëm OM me kontratë aktive të inspektimit periodik. */
  canLogPeriodicInspection?: boolean;
}) {
  return (
    <div className="space-y-4">
      {pendingContract && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">
              {PERIODIC_INSPECTION_CONTRACT_LABEL} - në pritje të pranimit
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Personi përgjegjës i ashensorit ju ka caktuar si OM. Ngarkoni kontratën e nënshkruar dhe pranoni ftesën.
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
              mode="certifier"
            />
          </CardContent>
        </Card>
      )}

      {canLogPeriodicInspection && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{PERIODIC_INSPECTION_LABEL} (OM)</CardTitle>
            <p className="text-sm text-muted-foreground">
              {PERIODIC_INSPECTIONS_LABEL} regjistrohen vetëm nga OM pas kontratës aktive të inspektimit periodik.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/portal/omi/inspektim-periodik">{REGISTER_PERIODIC_INSPECTION_LABEL} →</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
