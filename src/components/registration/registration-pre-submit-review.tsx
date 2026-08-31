"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navigation/use-app-router";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { ApplicationStatus } from "@prisma/client";
import { submitApplicationAction } from "@/lib/actions/application-actions";
import { RegistrationDossierView } from "@/components/registration/registration-dossier-view";
import { DemoStepFillButton } from "@/components/demo/demo-step-fill-button";
import type { DossierSection } from "@/lib/registration/build-dossier";
import { Button } from "@/components/ui/button";

export function RegistrationPreSubmitReview({
  applicationId,
  status,
  sections,
  ownerDocsSlot,
  installerDocsSlot,
  certifierDocsSlot,
  checklist,
  blockSubmit,
  canUploadOwnerDocs = false,
  canEditOwnerData = false,
  ownerDataEditForm,
}: {
  applicationId: string;
  status: ApplicationStatus;
  sections: DossierSection[];
  ownerDocsSlot?: React.ReactNode;
  installerDocsSlot?: React.ReactNode;
  certifierDocsSlot?: React.ReactNode;
  checklist: { key: string; label: string; ok: boolean }[];
  blockSubmit?: string | null;
  canUploadOwnerDocs?: boolean;
  canEditOwnerData?: boolean;
  ownerDataEditForm?: React.ReactNode;
}) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [showOwnerDataEdit, setShowOwnerDataEdit] = useState(false);
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

  return (
    <div className="space-y-6">
      <DemoStepFillButton applicationId={applicationId} step="owner-pre-submit" />

      {canEditOwnerData && ownerDataEditForm ? (
        <div className="reg-wizard-subsection">
          {!showOwnerDataEdit ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Mund të ndryshoni të dhënat që plotësuat në fillim (adresa, godina, planvendosja, etj.).
              </p>
              <Button
                type="button"
                variant="outline"
                className="rounded-lg"
                onClick={() => setShowOwnerDataEdit(true)}
              >
                Ndrysho të dhënat e aplikimit
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">Ndrysho të dhënat e aplikimit</h3>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-lg"
                  onClick={() => setShowOwnerDataEdit(false)}
                >
                  Mbyll
                </Button>
              </div>
              {ownerDataEditForm}
            </div>
          )}
        </div>
      ) : null}

      <RegistrationDossierView
        sections={sections}
        ownerDocsSlot={ownerDocsSlot}
        installerDocsSlot={installerDocsSlot}
        certifierDocsSlot={certifierDocsSlot}
        canUploadOwnerDocs={canUploadOwnerDocs}
      />

      <div className="rounded-xl border border-gov-primary/20 bg-gov-primary/[0.03] p-4 sm:p-5">
        {allOk ? (
          <p className="mb-4 flex items-center gap-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            Aplikimi është gati për parashtrim te IQMT.
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
              {submitting ? "Duke parashtruar…" : "Parashtro te IQMT"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
