import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContractResponseButtons } from "@/components/maintenance/contract-response-buttons";
import { Button } from "@/components/ui/button";
import { fmtDateSq } from "@/components/elevators/registry-shared";

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
  /** Vetëm OM me kontratë aktive të kontrollit periodik. */
  canLogPeriodicInspection?: boolean;
}) {
  return (
    <div className="space-y-4">
      {pendingContract && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">Kontrata e kontrollit periodik - në pritje të pranimit</CardTitle>
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
            <CardTitle className="text-base">Kontroll periodik (OM)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Kontrollet periodike regjistrohen vetëm nga OM pas kontratës aktive të kontrollit periodik.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/portal/omi/inspektim-periodik">Regjistro kontrollin periodik →</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
