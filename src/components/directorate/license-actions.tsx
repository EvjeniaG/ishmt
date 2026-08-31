"use client";

import { OrgStatus } from "@prisma/client";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Ban, RotateCcw, ShieldOff, X } from "lucide-react";
import {
  suspendLicenseAction,
  revokeLicenseAction,
  reinstateLicenseAction,
} from "@/lib/actions/organization-actions";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import type { StatusTone } from "@/lib/registration/status-presentation";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_REASON_LENGTH = 15;

type EnforcementAction = "suspend" | "revoke" | "reinstate";

const ACTION_COPY: Record<
  EnforcementAction,
  {
    title: string;
    description: string;
    confirmLabel: string;
    phrase: string;
    destructive: boolean;
    notice: "warning" | "success";
  }
> = {
  suspend: {
    title: "Pezullo licencën",
    description:
      "Kompania humb funksionin për këtë licencë. Nëse mbetet pa licencë aktive, pezullohet automatikisht.",
    confirmLabel: "Konfirmo pezullimin",
    phrase: "PEZULLO",
    destructive: false,
    notice: "warning",
  },
  revoke: {
    title: "Revoko licencën",
    description:
      "Licenca shënohet si e revokuar. Nëse mbetet pa licencë aktive, kompania pezullohet automatikisht.",
    confirmLabel: "Konfirmo revokimin",
    phrase: "REVOKO",
    destructive: true,
    notice: "warning",
  },
  reinstate: {
    title: "Riaktivizo licencën",
    description:
      "Licenca kthehet aktive dhe kompania rifit funksionin për këtë lloj shërbimi. Nëse kompania ishte pezulluar, riaktivizohet automatikisht.",
    confirmLabel: "Konfirmo riaktivizimin",
    phrase: "RIAKTIVIZO",
    destructive: false,
    notice: "success",
  },
};

function LicenseEnforcementModal({
  licenseNumber,
  action,
  onClose,
  onConfirm,
}: {
  licenseNumber: string;
  action: EnforcementAction;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<{ success: boolean; error?: string }>;
}) {
  const copy = ACTION_COPY[action];
  const [reason, setReason] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;
  const phraseValid = confirmPhrase.trim().toUpperCase() === copy.phrase;
  const canSubmit = reasonValid && phraseValid;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [loading, onClose]);

  async function handleSubmit() {
    if (!canSubmit) {
      setError(`Plotësoni arsyetimin (min. ${MIN_REASON_LENGTH} karaktere) dhe shkruani ${copy.phrase}.`);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await onConfirm(reason.trim());
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Veprimi dështoi.");
    }
  }

  const noticeClass =
    copy.notice === "success"
      ? "portal-institutional-notice-success"
      : "portal-institutional-notice-warning";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-enforcement-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-label="Mbyll"
        disabled={loading}
        onClick={onClose}
      />
      <div className="portal-surface relative w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border/80 bg-gradient-to-r from-gov-surface/90 to-transparent px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Veprim administrativ
            </p>
            <h2 id="license-enforcement-title" className="mt-1 text-lg font-semibold text-gov-primary">
              {copy.title}
            </h2>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">{licenseNumber}</p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled={loading} onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className={`portal-institutional-notice ${noticeClass} !rounded-xl !p-3.5`}>
            <div className="portal-institutional-notice-icon !h-9 !w-9" aria-hidden>
              {copy.notice === "success" ? (
                <RotateCcw className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
            <p className="portal-institutional-notice-body !mt-0 text-xs leading-relaxed">{copy.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license-enforcement-reason">Arsyetimi i vendimit</Label>
            <textarea
              id="license-enforcement-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Përshkruani qartë arsyen e vendimit…"
              className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary/20"
            />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Minimumi {MIN_REASON_LENGTH} karaktere</span>
              <span className={reasonValid ? "font-medium text-emerald-700" : ""}>
                {reason.trim().length}/{MIN_REASON_LENGTH}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license-enforcement-phrase">
              Konfirmoni duke shkruar{" "}
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold">{copy.phrase}</span>
            </Label>
            <Input
              id="license-enforcement-phrase"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              autoComplete="off"
              placeholder={copy.phrase}
              className="max-w-xs font-mono uppercase tracking-wider"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/80 bg-gov-surface/40 px-5 py-4 sm:px-6">
          <Button type="button" variant="ghost" disabled={loading} onClick={onClose}>
            Anulo
          </Button>
          <Button
            type="button"
            variant={copy.destructive ? "destructive" : "default"}
            disabled={loading || !canSubmit}
            onClick={handleSubmit}
          >
            {loading ? "Duke u kryer…" : copy.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function LicenseRowActions({
  licenseId,
  licenseNumber,
  status,
  expiryDate,
}: {
  licenseId: string;
  licenseNumber: string;
  status: OrgStatus;
  expiryDate: Date;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<EnforcementAction | null>(null);
  const notExpired = expiryDate >= new Date();

  if (status === OrgStatus.REVOKED) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  const canSuspend = status === OrgStatus.ACTIVE && notExpired;
  const canReinstate = status === OrgStatus.SUSPENDED && notExpired;
  const canRevoke = (status === OrgStatus.ACTIVE || status === OrgStatus.SUSPENDED) && notExpired;

  if (!canSuspend && !canReinstate && !canRevoke) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  async function onConfirm(action: EnforcementAction, reason: string) {
    const handlers = {
      suspend: suspendLicenseAction,
      revoke: revokeLicenseAction,
      reinstate: reinstateLicenseAction,
    } as const;
    const result = await handlers[action](licenseId, reason);
    if (!result.success) {
      return { success: false, error: result.error };
    }
    setModal(null);
    router.refresh();
    return { success: true };
  }

  return (
    <>
      <div className="inline-flex items-center rounded-lg border border-border/70 bg-gov-surface/50 p-0.5">
        {canReinstate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-md px-2.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900"
            onClick={() => setModal("reinstate")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Riaktivizo
          </Button>
        )}
        {canSuspend && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-md px-2.5 text-xs font-medium text-amber-800 hover:bg-amber-50 hover:text-amber-900"
            onClick={() => setModal("suspend")}
          >
            <Ban className="h-3.5 w-3.5" />
            Pezullo
          </Button>
        )}
        {(canReinstate || canSuspend) && canRevoke && <span className="h-4 w-px bg-border/80" aria-hidden />}
        {canRevoke && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-md px-2.5 text-xs font-medium text-destructive hover:bg-destructive/5 hover:text-destructive"
            onClick={() => setModal("revoke")}
          >
            <ShieldOff className="h-3.5 w-3.5" />
            Revoko
          </Button>
        )}
      </div>

      {modal && (
        <LicenseEnforcementModal
          licenseNumber={licenseNumber}
          action={modal}
          onClose={() => setModal(null)}
          onConfirm={(reason) => onConfirm(modal, reason)}
        />
      )}
    </>
  );
}

export function LicenseStatusBadge({ status }: { status: OrgStatus }) {
  const tone: StatusTone =
    status === OrgStatus.ACTIVE
      ? "done"
      : status === OrgStatus.SUSPENDED
        ? "waiting"
        : status === OrgStatus.REVOKED
          ? "danger"
          : "waiting";

  return (
    <WorkflowStatusChip label={ORG_STATUS_LABELS[status] ?? status} tone={tone} />
  );
}
