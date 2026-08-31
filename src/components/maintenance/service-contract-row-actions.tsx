"use client";

import Link from "next/link";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { terminateMaintenanceContractAction } from "@/lib/actions/maintenance-work-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MIN_REASON_LENGTH = 10;

function TerminateContractModal({
  contractId,
  onClose,
}: {
  contractId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedLength = reason.trim().length;
  const reasonReady = trimmedLength >= MIN_REASON_LENGTH;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [busy, onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!reasonReady) {
      setError(`Shkruani të paktën ${MIN_REASON_LENGTH} karaktere.`);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await terminateMaintenanceContractAction(contractId, reason.trim());
    setBusy(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terminate-contract-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label="Mbyll"
        disabled={busy}
        onClick={onClose}
      />
      <form
        onSubmit={(event) => void submit(event)}
        className="portal-surface relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/80 bg-gradient-to-r from-red-50/80 to-transparent px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Kontratë mirëmbajtjeje
              </p>
              <h2 id="terminate-contract-title" className="mt-1 text-lg font-semibold text-foreground">
                Ndërprerja e kontratës
              </h2>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled={busy} onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Personi përgjegjës i ashensorit do të njoftohet. Pas ndërprerjes nuk mund të regjistroni ndërhyrje
            për këtë ashensor pa kontratë të re.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="terminate-contract-reason" className="text-sm font-medium">
              Arsyeja e ndërprerjes <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="terminate-contract-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={4}
              autoFocus
              className="w-full resize-y rounded-lg border border-border/80 bg-background px-3 py-2.5 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary/30"
              placeholder="P.sh. mbarimi i afatit pa rinovim, mospërputhje me kushtet, kalim te kompani tjetër…"
              required
              minLength={MIN_REASON_LENGTH}
            />
            <p
              className={cn(
                "text-xs tabular-nums",
                reasonReady ? "text-muted-foreground" : "text-amber-800",
              )}
            >
              {reasonReady
                ? "Arsyeja ruhet në historikun e kontratës."
                : `Shkruani të paktën ${MIN_REASON_LENGTH} karaktere (${trimmedLength}/${MIN_REASON_LENGTH}).`}
            </p>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/80 bg-muted/20 px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" className="rounded-lg" disabled={busy} onClick={onClose}>
            Anulo
          </Button>
          <Button type="submit" variant="destructive" className="rounded-lg px-5" disabled={busy || !reasonReady}>
            {busy ? "Duke ndërprerë…" : "Konfirmo ndërprerjen"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ServiceContractRowActions({
  contractId,
  elevatorId,
  documentId,
  effectiveStatus,
  serviceType,
  dossierLabel = "Dosja e plotë",
}: {
  contractId: string;
  elevatorId: string;
  documentId?: string | null;
  effectiveStatus: string;
  serviceType: string;
  dossierLabel?: string;
}) {
  const [showTerminateModal, setShowTerminateModal] = useState(false);

  const dossierTab = serviceType === "PERIODIC_INSPECTION" ? "inspections" : "maintenance";
  const canTerminate = serviceType === "MAINTENANCE" && effectiveStatus === "ACTIVE";

  return (
    <>
      <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-sm">
        <Link
          href={`/portal/elevators/${elevatorId}?tab=${dossierTab}`}
          className="font-medium text-gov-primary hover:underline"
        >
          {dossierLabel}
        </Link>
        {documentId ? (
          <a
            href={`/api/documents/${documentId}/download`}
            className="font-medium text-gov-primary hover:underline"
          >
            Shkarko kontratën
          </a>
        ) : null}
        {canTerminate ? (
          <button
            type="button"
            onClick={() => setShowTerminateModal(true)}
            className="font-medium text-destructive hover:underline"
          >
            Ndërpre kontratën
          </button>
        ) : null}
      </div>

      {showTerminateModal ? (
        <TerminateContractModal contractId={contractId} onClose={() => setShowTerminateModal(false)} />
      ) : null}
    </>
  );
}
