"use client";

import { OrgStatus } from "@prisma/client";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { reinstateCompanyAction, revokeCompanyAction } from "@/lib/actions/organization-actions";
import { OrgStatusBadge } from "@/components/directorate/org-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ActionKind = "revoke" | "reinstate";

const ACTION_LABELS: Record<ActionKind, string> = {
  revoke: "Revoko kompaninë dhe licencat",
  reinstate: "Riaktivizo kompaninë",
};

const ACTION_DESCRIPTIONS: Record<ActionKind, string> = {
  revoke:
    "Të gjitha licencat aktive revokohen dhe kompania bllokohet plotësisht nga sistemi.",
  reinstate:
    "Kompania kthehet si aktive nëse ka licencë të vlefshme, përndryshe si e autorizuar.",
};

const CONFIRM_PHRASES: Partial<Record<ActionKind, string>> = {
  revoke: "REVOKO",
};

const MIN_REASON_LENGTH = 15;

export function CompanyEnforcementPanel({
  companyId,
  companyName,
  status,
}: {
  companyId: string;
  companyName: string;
  status: OrgStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionKind | "">("");
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reinstatable: OrgStatus[] = [
    OrgStatus.SUSPENDED,
    OrgStatus.REVOKED,
    OrgStatus.EXPIRED,
    OrgStatus.INACTIVE,
  ];

  const availableActions: ActionKind[] = [
    ...(status !== OrgStatus.REVOKED ? (["revoke"] as const) : []),
    ...(reinstatable.includes(status) ? (["reinstate"] as const) : []),
  ];

  const selectedAction = activeAction || null;
  const needsPhraseConfirm = selectedAction ? selectedAction in CONFIRM_PHRASES : false;
  const expectedPhrase = selectedAction ? CONFIRM_PHRASES[selectedAction] : undefined;
  const reasonValid = reason.trim().length >= MIN_REASON_LENGTH;
  const nameValid = confirmName.trim() === companyName.trim();
  const phraseValid = !needsPhraseConfirm || confirmPhrase.trim().toUpperCase() === expectedPhrase;
  const canSubmit =
    selectedAction &&
    reasonValid &&
    nameValid &&
    phraseValid &&
    (selectedAction === "reinstate" || acknowledged);

  function resetForm() {
    setActiveAction("");
    setReason("");
    setConfirmName("");
    setConfirmPhrase("");
    setAcknowledged(false);
    setError(null);
  }

  function closePanel() {
    setOpen(false);
    resetForm();
  }

  async function execute(action: ActionKind) {
    if (!canSubmit) {
      setError("Plotësoni të gjitha fushat e konfirmimit.");
      return;
    }

    setLoading(true);
    setError(null);

    const handlers = {
      revoke: revokeCompanyAction,
      reinstate: reinstateCompanyAction,
    } as const;

    const result = await handlers[action](companyId, reason.trim());
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    closePanel();
    router.refresh();
  }

  if (availableActions.length === 0) return null;

  return (
    <div className="portal-institutional-notice portal-institutional-notice-warning">
      <div className="portal-institutional-notice-icon" aria-hidden>
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="portal-institutional-notice-title">Veprime administrative</p>
            <p className="portal-institutional-notice-body">
              Pezullimi i licencës bëhet te skeda Licencat. Këtu menaxhohen vetëm revokimi ose
              riaktivizimi i kompanisë.
            </p>
          </div>
          <OrgStatusBadge status={status} />
        </div>

        {!open ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Hap menaxhimin e statusit
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-[min(100%,16rem)] flex-1 space-y-2">
                <Label htmlFor="enforcement-action">Lloji i vendimit</Label>
                <select
                  id="enforcement-action"
                  value={activeAction}
                  onChange={(e) => {
                    setActiveAction(e.target.value as ActionKind | "");
                    setReason("");
                    setConfirmName("");
                    setConfirmPhrase("");
                    setAcknowledged(false);
                    setError(null);
                  }}
                  className="flex h-10 w-full max-w-md rounded-md border bg-background px-3 text-sm"
                >
                  <option value="">Zgjidhni veprimin…</option>
                  {availableActions.map((action) => (
                    <option key={action} value={action}>
                      {ACTION_LABELS[action]}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closePanel}>
                Mbyll
                <ChevronUp className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {selectedAction && (
              <div className="space-y-4 rounded-lg border border-amber-200/80 bg-background/80 p-4">
                <div>
                  <p className="font-medium">{ACTION_LABELS[selectedAction]}</p>
                  <p className="text-sm text-muted-foreground">{ACTION_DESCRIPTIONS[selectedAction]}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enforcement-reason">Arsyetimi i vendimit *</Label>
                  <textarea
                    id="enforcement-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Përshkruani qartë arsyen e vendimit administrativ…"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Minimumi {MIN_REASON_LENGTH} karaktere ({reason.trim().length}/{MIN_REASON_LENGTH})
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enforcement-confirm-name">
                    Konfirmoni duke shkruar emrin e kompanisë: <span className="font-medium">{companyName}</span>
                  </Label>
                  <Input
                    id="enforcement-confirm-name"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    autoComplete="off"
                    className="max-w-md"
                  />
                </div>

                {needsPhraseConfirm && expectedPhrase && (
                  <div className="space-y-2">
                    <Label htmlFor="enforcement-confirm-phrase">
                      Shkruani <span className="font-mono font-semibold">{expectedPhrase}</span> për të vazhduar
                    </Label>
                    <Input
                      id="enforcement-confirm-phrase"
                      value={confirmPhrase}
                      onChange={(e) => setConfirmPhrase(e.target.value)}
                      autoComplete="off"
                      className="max-w-xs font-mono uppercase"
                    />
                  </div>
                )}

                {selectedAction !== "reinstate" && (
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="mt-1"
                    />
                    <span>E kuptoj pasojat e këtij vendimi ndaj kompanisë dhe licencave të saj.</span>
                  </label>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedAction === "revoke" ? "destructive" : "default"}
                    size="sm"
                    disabled={loading || !canSubmit}
                    onClick={() => execute(selectedAction)}
                  >
                    {loading ? "Duke u kryer…" : "Konfirmo vendimin"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={resetForm}>
                    Kthehu
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
