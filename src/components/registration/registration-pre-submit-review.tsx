"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { ApplicationStatus } from "@prisma/client";
import { submitApplicationAction } from "@/lib/actions/application-actions";
import { ApplicationDossier } from "@/components/registration/application-dossier";
import { DemoStepFillButton } from "@/components/demo/demo-step-fill-button";
import type { DossierSection } from "@/lib/registration/build-dossier";
import { Button } from "@/components/ui/button";

export function RegistrationPreSubmitReview({
  applicationId,
  status,
  sections,
  installerDocsSlot,
  certifierDocsSlot,
  checklist,
  blockSubmit,
}: {
  applicationId: string;
  status: ApplicationStatus;
  sections: DossierSection[];
  installerDocsSlot?: React.ReactNode;
  certifierDocsSlot?: React.ReactNode;
  checklist: { key: string; label: string; ok: boolean }[];
  blockSubmit?: string | null;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const allOk = checklist.every((c) => c.ok);
  const failedItems = checklist.filter((c) => !c.ok);
  const hasCertificationIssues = status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES;

  async function submitToIshmt() {
    if (!confirmed) return;
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitApplicationAction(applicationId);
    setSubmitting(false);
    if (!result.success) {
      setSubmitError(result.error);
      return;
    }
    router.refresh();
  }

  const collapsibleSectionIds = new Set(["installer", "technical", "certifier", "certification"]);

  return (
    <div className="space-y-6">
      <DemoStepFillButton applicationId={applicationId} step="owner-pre-submit" />

      <div className="reg-wizard-subsection">
        <ApplicationDossier sections={sections} hideEmpty collapsibleSectionIds={collapsibleSectionIds} />
      </div>

      {installerDocsSlot && (
        <div className="reg-wizard-subsection">{installerDocsSlot}</div>
      )}

      {certifierDocsSlot && (
        <div className="reg-wizard-subsection">{certifierDocsSlot}</div>
      )}

      <div className="rounded-xl border border-gov-primary/20 bg-gov-primary/[0.03] p-4 sm:p-5">
        {allOk ? (
          <p className="mb-4 flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            Aplikimi është gati për parashtrim te ISHMT.
          </p>
        ) : (
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium text-foreground">Para parashtrimit, plotësoni:</p>
            <ul className="space-y-1.5">
              {failedItems.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-sm text-gov-danger">
                  <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasCertificationIssues ? (
          <p className="text-sm text-destructive">Parashtrimi nuk lejohet - kontaktoni certifikuesin.</p>
        ) : (
          <>
            <label className="mb-4 flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1"
                disabled={!allOk}
              />
              <span className="text-muted-foreground">
                Konfirmoj se të dhënat janë të sakta dhe mbaj përgjegjësi për dorëzimin e tyre.
              </span>
            </label>
            {blockSubmit && (
              <p className="mb-3 flex items-start gap-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {blockSubmit}
              </p>
            )}
            {submitError && <p className="mb-3 text-sm text-destructive">{submitError}</p>}
            <Button
              type="button"
              className="w-full rounded-lg bg-gov-primary font-semibold hover:bg-gov-secondary sm:w-auto"
              disabled={!confirmed || !allOk || submitting || Boolean(blockSubmit)}
              onClick={() => void submitToIshmt()}
            >
              {submitting ? "Duke parashtruar…" : "Parashtro te ISHMT"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
