"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { submitApplicationAction } from "@/lib/actions/application-actions";
import { Button } from "@/components/ui/button";
import { ApplicationStatus, ApplicationType } from "@prisma/client";

function canSubmitApplication(type: ApplicationType, status: ApplicationStatus): boolean {
  if (type === ApplicationType.MODERNIZATION) {
    return (
      status === ApplicationStatus.PENDING_OWNER_SUBMISSION ||
      status === ApplicationStatus.RETURNED
    );
  }
  return status === ApplicationStatus.DRAFT || status === ApplicationStatus.RETURNED;
}

const CORRECTION_SUBMIT_HELP =
  "Kërkesa regjistrohet me korrigjimet dhe arsyet që specifikuat. Vetëdeklarimi bëhet me konfirmimin më poshtë. Certifikata aktive referohet automatikisht nga regjistri - nuk kërkohet ngarkim skedari.";

const CORRECTION_CONFIRMATION =
  "Konfirmoj se korrigjimet e paraqitura janë të sakta, mbaj përgjegjësi për parashtrimin (Udhëzim p.13.a–b) dhe pranoj që certifikata aktive CR referohet nga regjistri (p.13.c).";

export function LifecycleSubmitPanel({
  applicationId,
  type,
  status,
  blockSubmit,
  variant = "default",
}: {
  applicationId: string;
  type: ApplicationType;
  status: ApplicationStatus;
  blockSubmit?: string | null;
  variant?: "default" | "footer";
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const isCorrection = type === ApplicationType.DATA_CORRECTION;
  const needsConfirmation = isCorrection;

  if (!canSubmitApplication(type, status)) {
    if (status === ApplicationStatus.SUBMITTED || status === ApplicationStatus.UNDER_REVIEW) {
      return (
        <p className="workflow-notice workflow-notice-waiting">
          Aplikimi juaj po shqyrtohet. Nuk duhet të bëni asgjë tani.
        </p>
      );
    }
    if (status === ApplicationStatus.PENDING_CHIEF_INSPECTOR) {
      return (
        <p className="workflow-notice workflow-notice-waiting">
          Aplikimi është në fazën e miratimit final.
        </p>
      );
    }
    if (status === ApplicationStatus.APPROVED) {
      return (
        <p className="workflow-notice workflow-notice-done">
          Aplikimi u miratua me sukses.
        </p>
      );
    }
    return null;
  }

  async function submit() {
    if (needsConfirmation && !confirmed) return;
    setLoading(true);
    setError(null);
    const result = await submitApplicationAction(applicationId);
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const inFooter = variant === "footer";
  const helpText = isCorrection
    ? CORRECTION_SUBMIT_HELP
    : "Kontrolloni që të gjitha fushat dhe dokumentet janë në rregull, pastaj parashtrojeni.";

  return (
    <div className={inFooter ? "space-y-4" : "space-y-4"}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gov-primary/10 text-gov-primary">
          <Send className="h-4 w-4" aria-hidden />
        </div>
        <div>
          <p className="font-semibold text-foreground">Gati për parashtrim</p>
          <p className="workflow-help-text mt-1">{helpText}</p>
        </div>
      </div>

      {needsConfirmation && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span>{CORRECTION_CONFIRMATION}</span>
        </label>
      )}

      {blockSubmit && (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          {blockSubmit}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        className={
          inFooter
            ? "h-12 w-full rounded-xl bg-gov-primary text-base font-semibold shadow-md shadow-gov-primary/15 sm:w-auto"
            : "rounded-xl bg-gov-primary font-semibold shadow-md shadow-gov-primary/15"
        }
        size={inFooter ? "lg" : "default"}
        onClick={submit}
        disabled={loading || Boolean(blockSubmit) || (needsConfirmation && !confirmed)}
      >
        {loading ? "Duke parashtruar…" : "Parashtro aplikimin"}
      </Button>
    </div>
  );
}
