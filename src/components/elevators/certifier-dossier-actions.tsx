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
}: {
  elevatorId: string;
  registryNumber: string;
  pendingContract: PendingContract | null;
}) {
  return (
    <div className="space-y-4">
      {pendingContract && (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">Kontrata e inspektimit - në pritje të pranimit</CardTitle>
            <p className="text-sm text-muted-foreground">
              Personi përgjegjës i ashensorit ju ka caktuar si OMI. Ngarkoni kontratën e nënshkruar dhe pranoni ftesën.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inspektimi periodik</CardTitle>
          <p className="text-sm text-muted-foreground">
            Regjistroni inspektimin në terren për ashensorin {registryNumber}.
          </p>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/portal/omi/inspektim-periodik">Hap formularin e inspektimit →</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
