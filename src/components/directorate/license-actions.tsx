"use client";

import { OrgStatus } from "@prisma/client";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import type { StatusTone } from "@/lib/registration/status-presentation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeLicenseAction } from "@/lib/actions/organization-actions";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";
import { Button } from "@/components/ui/button";

export function LicenseRevokeButton({
  licenseId,
  licenseNumber,
  status,
}: {
  licenseId: string;
  licenseNumber: string;
  status: OrgStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (status === OrgStatus.REVOKED) {
    return <span className="text-xs text-muted-foreground">E revokuar</span>;
  }

  async function onConfirm() {
    if (!reason.trim()) {
      setError("Shkruani arsyen e revokimit.");
      return;
    }

    setLoading(true);
    setError(null);
    const result = await revokeLicenseAction(licenseId, reason.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setOpen(false);
    setReason("");
    router.refresh();
  }

  return (
    <div className="mt-3 border-t pt-3">
      {!open ? (
        <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
          Heq / revoko licencën
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Revokimi i licencës <strong>{licenseNumber}</strong>. Nëse mbetet pa licencë aktive, kompania
            pezullohet automatikisht.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Arsyeja e revokimit..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="destructive" size="sm" disabled={loading} onClick={onConfirm}>
              {loading ? "..." : "Konfirmo revokimin"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loading}
              onClick={() => {
                setOpen(false);
                setReason("");
                setError(null);
              }}
            >
              Anulo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LicenseStatusBadge({ status }: { status: OrgStatus }) {
  const tone: StatusTone =
    status === OrgStatus.ACTIVE
      ? "done"
      : status === OrgStatus.REVOKED
        ? "danger"
        : "waiting";

  return (
    <WorkflowStatusChip label={ORG_STATUS_LABELS[status] ?? status} tone={tone} />
  );
}
