"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { respondOwnershipTransferAction } from "@/lib/actions/ownership-transfer-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OwnershipTransferResponse({
  applicationId,
  applicationNumber,
  senderName,
  elevatorLabel,
  elevatorAddress,
}: {
  applicationId: string;
  applicationNumber: string;
  senderName: string;
  elevatorLabel: string;
  elevatorAddress?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function respond(accept: boolean) {
    setLoading(true);
    setError(null);
    const result = await respondOwnershipTransferAction(applicationId, accept);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="border-gov-primary/40">
      <CardHeader>
        <CardTitle>Ftesë transferimi pronësie</CardTitle>
        <p className="text-sm text-muted-foreground">
          {senderName} kërkon t&apos;ju kalojë kartelën e ashensorit. Përgjigjja juaj është e nevojshme para se aplikimi të shkojë te ISHMT.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="rounded-md border bg-muted/30 p-3">
          <p><strong>Ashensori:</strong> {elevatorLabel}</p>
          {elevatorAddress && <p className="mt-1"><strong>Adresa:</strong> {elevatorAddress}</p>}
          <p className="mt-1"><strong>Nga:</strong> {senderName}</p>
          <p className="mt-1"><strong>Aplikimi:</strong> {applicationNumber}</p>
        </div>
        <p className="text-muted-foreground">
          Nëse <strong>pranoni</strong>, personi përgjegjës aktual i ashensorit mund ta parashtrojë te ISHMT. Pas miratimit të ISHMT-së, kartela kalon te ju.
          Nëse <strong>refuzoni</strong>, transferimi ndalet - personi përgjegjës i ashensorit duhet të zgjedhë marrës tjetër.
        </p>
        {error && <p className="text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => respond(true)} disabled={loading}>
            Prano transferimin
          </Button>
          <Button variant="outline" onClick={() => respond(false)} disabled={loading}>
            Refuzo transferimin
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
