"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitRegistrationCertificationAction } from "@/lib/actions/registration-actions";
import {
  CONFORMITY_RESULT_LABELS,
  EU_DECLARATION_LABELS,
  EXAMINATION_TYPE_LABELS,
} from "@/lib/registration/labels";
import {
  OPTIONAL_CERTIFICATION_DOCS,
  REQUIRED_CERTIFICATION_DOCS,
  type CertificationDocSpec,
} from "@/lib/registration/certification-documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CertificationUploadZone({
  applicationId,
  spec,
  required,
  uploaded,
  onUploaded,
}: {
  applicationId: string;
  spec: CertificationDocSpec;
  required: boolean;
  uploaded: boolean;
  onUploaded: (purpose: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    if (file.size > spec.maxMb * 1024 * 1024) {
      setErr(`Skedari kalon ${spec.maxMb}MB.`);
      return;
    }
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("entityType", "application");
    fd.append("entityId", applicationId);
    fd.append("classification", "CERTIFICATE");
    fd.append("purpose", spec.purpose);
    const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Ngarkimi dështoi.");
      return;
    }
    onUploaded(spec.purpose);
  }

  return (
    <div
      className={`rounded-md border-2 border-dashed p-3 text-sm ${
        uploaded ? "border-green-400 bg-green-50" : required ? "border-red-300 bg-red-50/40" : "border-muted"
      }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) upload(file);
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {uploaded ? "✓ " : "□ "}
          {spec.label}
          {required && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">E DETYRUESHME</span>}
        </span>
        <span className="text-xs text-muted-foreground">max {spec.maxMb}MB</span>
      </div>
      <input
        type="file"
        accept={spec.accept}
        disabled={busy}
        className="mt-2 block w-full text-xs"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />
      {busy && <p className="mt-1 text-xs text-muted-foreground">Duke ngarkuar…</p>}
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

export function RegistrationCertificationDataForm({
  applicationId,
  defaults,
  uploadedPurposes = [],
}: {
  applicationId: string;
  defaults: Record<string, unknown>;
  uploadedPurposes?: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<Set<string>>(new Set(uploadedPurposes));

  function markUploaded(purpose: string) {
    setUploaded((prev) => new Set(prev).add(purpose));
  }

  const missing = REQUIRED_CERTIFICATION_DOCS.filter((d) => !uploaded.has(d.purpose));
  const docsComplete = missing.length === 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!docsComplete) {
      setError(
        `⛔ Dokumentacioni i paplotë: ${missing.map((d) => `Mungon ${d.label}.`).join(" ")}`,
      );
      return;
    }
    const result = await submitRegistrationCertificationAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/portal/applications/${applicationId}/final-review`);
    router.refresh();
  }

  const examDate = defaults.examinationDate
    ? new Date(defaults.examinationDate as string).toISOString().slice(0, 10)
    : "";
  const certDate = defaults.installationCertificateDate
    ? new Date(defaults.installationCertificateDate as string).toISOString().slice(0, 10)
    : "";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Certifikimi - OMI / Certifikuesi</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><Label>Numri OMI *</Label><Input name="omiNumber" defaultValue={defaults.omiNumber as string ?? ""} placeholder="OM 013" required /></div>
          <div className="space-y-2"><Label>Personi përgjegjës nga OMI</Label><Input name="certifierResponsiblePerson" /></div>
          <div className="md:col-span-2 space-y-2">
            <Label>Lloji i ekzaminimit *</Label>
            {Object.entries(EXAMINATION_TYPE_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="examinationType" value={v} defaultChecked={defaults.examinationType === v} required /> {l}
              </label>
            ))}
          </div>
          <div className="space-y-2"><Label>Data e ekzaminimit *</Label><Input name="examinationDate" type="date" defaultValue={examDate} required /></div>
          <div className="md:col-span-2 space-y-2">
            <Label>Rezultati i konformitetit *</Label>
            {Object.entries(CONFORMITY_RESULT_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="conformityResultCode" value={v} required /> {l}
              </label>
            ))}
          </div>
          <div className="space-y-2"><Label>Nr. reference certifikate/raport *</Label><Input name="certificateReference" defaultValue={defaults.certificateReference as string ?? ""} required /></div>
          <div className="space-y-2"><Label>Nr. raporti teknik</Label><Input name="reportNumber" /></div>
          <div className="md:col-span-2 space-y-2">
            <Label>Deklarata EU e konformitetit *</Label>
            {Object.entries(EU_DECLARATION_LABELS).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-sm">
                <input type="radio" name="euDeclarationPresent" value={v} required /> {l}
              </label>
            ))}
          </div>
          <div className="space-y-2"><Label>Nr. deklaratës EU</Label><Input name="euDeclarationNumber" /></div>
          <div className="space-y-2"><Label>Nr. certifikate *</Label><Input name="installationCertificateNumber" defaultValue={defaults.installationCertificateNumber as string ?? ""} required /></div>
          <div className="space-y-2"><Label>Data certifikate *</Label><Input name="installationCertificateDate" type="date" defaultValue={certDate} required /></div>
          <div className="md:col-span-2 space-y-2">
            <Label>Shënime teknike</Label>
            <textarea name="certifierTechnicalNotes" defaultValue={defaults.certifierTechnicalNotes as string ?? ""} className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Dokumentacioni i certifikimit</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {REQUIRED_CERTIFICATION_DOCS.map((spec) => (
            <CertificationUploadZone
              key={spec.purpose}
              applicationId={applicationId}
              spec={spec}
              required
              uploaded={uploaded.has(spec.purpose)}
              onUploaded={markUploaded}
            />
          ))}
          {OPTIONAL_CERTIFICATION_DOCS.map((spec) => (
            <CertificationUploadZone
              key={spec.purpose}
              applicationId={applicationId}
              spec={spec}
              required={false}
              uploaded={uploaded.has(spec.purpose)}
              onUploaded={markUploaded}
            />
          ))}
          {!docsComplete && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              ⛔ Dokumentacioni i paplotë: {missing.map((d) => `Mungon ${d.label}.`).join(" ")}
            </div>
          )}
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="bg-gov-primary" disabled={!docsComplete}>
        Dërgo certifikimin
      </Button>
    </form>
  );
}
