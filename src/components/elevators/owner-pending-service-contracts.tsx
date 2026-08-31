"use client";

import { MAINTENANCE_SERVICE_TYPE_LABELS } from "@/lib/constants/lifecycle-labels";
import { revokePendingMaintenanceContractAction } from "@/lib/actions/delegation-actions";
import { RevokeDelegationForm } from "@/components/delegation/revoke-delegation-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateSq } from "@/components/elevators/registry-shared";

type PendingContract = {
  id: string;
  serviceType: string;
  contractNumber: string | null;
  startDate: Date;
  endDate: Date | null;
  maintenanceOrg: { name: string; nipt: string | null };
};

export function OwnerPendingServiceContracts({
  elevatorId,
  contracts,
}: {
  elevatorId: string;
  contracts: PendingContract[];
}) {
  if (contracts.length === 0) return null;

  return (
    <div className="space-y-3">
      {contracts.map((contract) => (
        <Card key={contract.id} className="border-amber-200 bg-amber-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {MAINTENANCE_SERVICE_TYPE_LABELS[contract.serviceType as keyof typeof MAINTENANCE_SERVICE_TYPE_LABELS] ??
                contract.serviceType}{" "}
              - në pritje
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ftesa u dërgua te <strong className="text-foreground">{contract.maintenanceOrg.name}</strong>
              {contract.maintenanceOrg.nipt ? ` (${contract.maintenanceOrg.nipt})` : ""}.
            </p>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Nr. kontratës:</span>{" "}
              <span className="font-mono font-medium">{contract.contractNumber ?? "-"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Periudha:</span>{" "}
              {fmtDateSq(contract.startDate.toISOString())} – {fmtDateSq(contract.endDate?.toISOString() ?? null)}
            </p>
            <RevokeDelegationForm
              label="Arsyeja e tërheqjes së ftesës"
              hint="Pas tërheqjes mund të caktoni kompani tjetër."
              onRevoke={(reason) =>
                revokePendingMaintenanceContractAction(contract.id, elevatorId, reason)
              }
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
