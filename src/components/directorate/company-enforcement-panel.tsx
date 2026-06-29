"use client";

import { OrgStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  rejectCompanyAction,
  reinstateCompanyAction,
  revokeCompanyAction,
  suspendCompanyAction,
} from "@/lib/actions/organization-actions";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type ActionKind = "suspend" | "revoke" | "reinstate" | "reject";

const ACTION_LABELS: Record<ActionKind, string> = {
  suspend: "Pezullo kompaninë",
  revoke: "Revoko kompaninë dhe licencat",
  reinstate: "Riaktivizo kompaninë",
  reject: "Refuzo kompaninë",
};

const ACTION_DESCRIPTIONS: Record<ActionKind, string> = {
  suspend:
    "Kompania nuk do të shfaqet më në zgjedhje për aplikime të reja. Licencat mbeten të regjistruara.",
  revoke:
    "Të gjitha licencat aktive revokohen dhe kompania bllokohet plotësisht nga sistemi.",
  reinstate:
    "Kompania kthehet si aktive nëse ka licencë të vlefshme, përndryshe si e autorizuar.",
  reject: "Kompania shënohet si e refuzuar (p.sh. gjatë validimit fillestar).",
};

export function CompanyEnforcementPanel({
  companyId,
  status,
}: {
  companyId: string;
  status: OrgStatus;
}) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<ActionKind | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suspendable: OrgStatus[] = [
    OrgStatus.ACTIVE,
    OrgStatus.ACTIVE_AUTHORIZED,
    OrgStatus.PENDING_VALIDATION,
  ];
  const reinstatable: OrgStatus[] = [
    OrgStatus.SUSPENDED,
    OrgStatus.REVOKED,
    OrgStatus.EXPIRED,
    OrgStatus.INACTIVE,
  ];
  const rejectable: OrgStatus[] = [OrgStatus.PENDING_VALIDATION, OrgStatus.ACTIVE_AUTHORIZED];

  const canSuspend = suspendable.includes(status);
  const canRevoke = status !== OrgStatus.REVOKED;
  const canReinstate = reinstatable.includes(status);
  const canReject = rejectable.includes(status);

  async function execute(action: ActionKind) {
    if (!reason.trim()) {
      setError("Shkruani arsyen e vendimit.");
      return;
    }

    setLoading(true);
    setError(null);

    const handlers = {
      suspend: suspendCompanyAction,
      revoke: revokeCompanyAction,
      reinstate: reinstateCompanyAction,
      reject: rejectCompanyAction,
    } as const;

    const result = await handlers[action](companyId, reason.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setActiveAction(null);
    setReason("");
    router.refresh();
  }

  return (
    <Card className="border-amber-200/80">
      <CardHeader>
        <CardTitle>Veprime administrative</CardTitle>
        <CardDescription>
          Statusi aktual: <strong>{ORG_STATUS_LABELS[status] ?? status}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {canSuspend && (
            <Button type="button" variant="outline" onClick={() => setActiveAction("suspend")}>
              Pezullo
            </Button>
          )}
          {canRevoke && (
            <Button type="button" variant="destructive" onClick={() => setActiveAction("revoke")}>
              Revoko
            </Button>
          )}
          {canReinstate && (
            <Button type="button" variant="secondary" onClick={() => setActiveAction("reinstate")}>
              Riaktivizo
            </Button>
          )}
          {canReject && (
            <Button type="button" variant="outline" onClick={() => setActiveAction("reject")}>
              Refuzo
            </Button>
          )}
        </div>

        {activeAction && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
            <div>
              <p className="font-medium">{ACTION_LABELS[activeAction]}</p>
              <p className="text-sm text-muted-foreground">{ACTION_DESCRIPTIONS[activeAction]}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enforcement-reason">Arsyeja *</Label>
              <textarea
                id="enforcement-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="P.sh. shkelje e licencës, dokumentacion i paplotë, kërkesë e autoritetit..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={activeAction === "revoke" ? "destructive" : "default"}
                disabled={loading}
                onClick={() => execute(activeAction)}
              >
                {loading ? "Duke u kryer..." : "Konfirmo"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => {
                  setActiveAction(null);
                  setReason("");
                  setError(null);
                }}
              >
                Anulo
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
