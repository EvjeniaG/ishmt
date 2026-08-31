"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { submitRegistrationToIshmtAction } from "@/lib/actions/registration-actions";
import { ApplicationDossier } from "@/components/registration/application-dossier";
import { ApplicationDocuments } from "@/components/applications/application-documents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DossierSection } from "@/lib/registration/build-dossier";

type DocumentRow = {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: string;
  classification: string;
  storagePending: boolean;
  uploadedAt: string;
  uploadedBy: string | null;
};

export function RegistrationFinalReview({
  applicationId,
  checklist,
  sections,
  workflow,
  documents,
}: {
  applicationId: string;
  checklist: { key: string; label: string; ok: boolean }[];
  sections: DossierSection[];
  workflow: { id: string; label: string; at: string }[];
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const allOk = checklist.every((c) => c.ok);

  async function submit() {
    setError(null);
    const result = await submitRegistrationToIshmtAction(applicationId, confirmed);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/portal/applications/${applicationId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ApplicationDossier sections={sections} workflow={workflow} />

      <Card>
        <CardHeader className="border-b bg-muted/20 py-4">
          <CardTitle className="text-base font-semibold text-gov-primary">H. Dokumentet e ngarkuara</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <ApplicationDocuments applicationId={applicationId} documents={documents} canUpload={false} embedded />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b bg-muted/20 py-4">
          <CardTitle className="text-base font-semibold text-gov-primary">I. Kontrolli para parashtrimit</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-5">
          {checklist.map((item) => (
            <div key={item.key} className="flex items-center gap-3 text-sm">
              {item.ok ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-gov-success" aria-hidden />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-gov-danger" aria-hidden />
              )}
              <span className={item.ok ? "text-foreground" : "text-gov-danger"}>{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
            Konfirmoj se të dhënat e paraqitura në këtë aplikim janë të sakta dhe mbaj përgjegjësi për dorëzimin e tyre pranë IQMT-së.
          </label>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        className="bg-gov-primary hover:bg-gov-secondary"
        disabled={!confirmed || !allOk}
        onClick={submit}
      >
        Dërgo aplikimin tek IQMT
      </Button>
    </div>
  );
}
