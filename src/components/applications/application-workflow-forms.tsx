"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApplicationStatus, ApplicationType } from "@prisma/client";
import { ApplicationDataSummary, type ApplicationSummaryData } from "@/components/applications/application-data-summary";
import {
  CERTIFIER_COMPLETION_DOC_PHASES,
  getMissingRequiredApplicationDocumentsForPhases,
  type ApplicationDocumentSpec,
} from "@/lib/documents/application-document-checklist";
import {
  assignInstallerAction,
  cancelApplicationAction,
  completeCertifierAction,
  completeInstallerAction,
  submitApplicationAction,
  updateLocationAction,
  approveApplicationAction,
  forwardToAdminAction,
  pickupReviewAction,
  recommendRejectionAction,
  rejectApplicationAction,
  returnApplicationAction,
} from "@/lib/actions/application-actions";
import type { RoleCode } from "@/lib/constants/roles";
import {
  canApproveApplications,
  canReviewApplications,
} from "@/lib/permissions/ishmt-roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoStepFillButton } from "@/components/demo/demo-step-fill-button";
import { FormDocumentsSection } from "@/components/applications/form-documents-section";
import { RETURN_TARGET_LABELS } from "@/lib/workflows/return-targets";
import type { ReturnTargetRole } from "@prisma/client";

type Company = { id: string; name: string };
type Municipality = { id: string; nameSq: string };

const ELEVATOR_TYPES = [
  { value: "PASSENGER", label: "Pasagjerësh" },
  { value: "FREIGHT", label: "Ngarkesash" },
  { value: "SERVICE", label: "Shërbimi" },
  { value: "HANDICAPPED", label: "Persona me aftësi të kufizuara" },
  { value: "ESCALATOR", label: "Shpërndarës" },
  { value: "MOVING_WALK", label: "Rrip lëvizës" },
];

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="text-sm text-red-600">{error}</p>;
}

const RETURN_TO_ROLE_OPTIONS: ReturnTargetRole[] = ["OWNER", "INSTALLER", "CERTIFIER"];

function ReturnToRolesField() {
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Kthe te (mund të zgjidhni më shumë se një)</legend>
      {RETURN_TO_ROLE_OPTIONS.map((role) => (
        <label key={role} className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" name="returnToRoles" value={role} className="mt-0.5" />
          <span>{RETURN_TARGET_LABELS[role]}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function OwnerLocationForm({
  applicationId,
  municipalities,
  defaults,
}: {
  applicationId: string;
  municipalities: Municipality[];
  defaults?: { buildingAddress?: string; municipalityId?: string; buildingName?: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await updateLocationAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Vendndodhja e ndërtesës</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor="buildingAddress">Adresa</Label>
            <Input id="buildingAddress" name="buildingAddress" required defaultValue={defaults?.buildingAddress} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="municipalityId">Bashkia</Label>
            <select id="municipalityId" name="municipalityId" required defaultValue={defaults?.municipalityId} className="flex h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Zgjidhni</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>{m.nameSq}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="buildingName">Emri i ndërtesës</Label>
            <Input id="buildingName" name="buildingName" defaultValue={defaults?.buildingName} />
          </div>
          <FormError error={error} />
          <Button type="submit">Ruaj vendndodhjen</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AssignInstallerForm({
  applicationId,
  installers,
}: {
  applicationId: string;
  installers: Company[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await assignInstallerAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Cakto kompaninë e instalimit</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          <select name="installerOrgId" required className="flex h-10 w-full rounded-md border px-3 text-sm">
            <option value="">Zgjidhni instaluesin</option>
            {installers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <FormError error={error} />
          <Button type="submit">Cakto instaluesin</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function InstallerTechnicalForm({
  applicationId,
  certifiers,
  defaults,
  hideCertifierAssignment = true,
  documentsSlot,
}: {
  applicationId: string;
  certifiers: Company[];
  hideCertifierAssignment?: boolean;
  defaults?: Record<string, string | number | undefined>;
  documentsSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await completeInstallerAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>{hideCertifierAssignment ? "Të dhënat teknike" : "Të dhënat teknike dhe certifikuesi"}</CardTitle></CardHeader>
      <CardContent>
        <DemoStepFillButton applicationId={applicationId} step="installer-technical" className="mb-4" />
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1 md:col-span-2">
            <Label>Lloji i ashensorit</Label>
            <select name="elevatorType" required defaultValue={defaults?.elevatorType as string} className="flex h-10 w-full rounded-md border px-3 text-sm">
              {ELEVATOR_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Prodhuesi</Label>
            <Input name="manufacturer" required defaultValue={defaults?.manufacturer as string} />
          </div>
          <div className="space-y-1">
            <Label>Modeli</Label>
            <Input name="model" defaultValue={defaults?.model as string} />
          </div>
          <div className="space-y-1">
            <Label>Numri serial</Label>
            <Input name="serialNumber" required defaultValue={defaults?.serialNumber as string} />
          </div>
          <div className="space-y-1">
            <Label>Viti i prodhimit</Label>
            <Input name="manufacturingYear" type="number" defaultValue={defaults?.manufacturingYear as number} />
          </div>
          <div className="space-y-1">
            <Label>Kapaciteti (kg)</Label>
            <Input name="capacityKg" type="number" defaultValue={defaults?.capacityKg as number} />
          </div>
          <div className="space-y-1">
            <Label>Kapaciteti (persona)</Label>
            <Input name="capacityPersons" type="number" defaultValue={defaults?.capacityPersons as number} />
          </div>
          <div className="space-y-1">
            <Label>Shpejtësia (m/s)</Label>
            <Input name="speedMs" type="number" step="0.01" defaultValue={defaults?.speedMs as number} />
          </div>
          <div className="space-y-1">
            <Label>Katet e shërbyer</Label>
            <Input name="floorsServed" type="number" required defaultValue={defaults?.floorsServed as number} />
          </div>
          {!hideCertifierAssignment && (
            <div className="space-y-1 md:col-span-2">
              <Label>Kompania certifikuese / OMI</Label>
              <select name="certifierOrgId" required className="flex h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Zgjidhni</option>
                {certifiers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {documentsSlot && (
            <div className="md:col-span-2">
              <FormDocumentsSection title="Dokumentet teknike">
                {documentsSlot}
              </FormDocumentsSection>
            </div>
          )}
          <div className="md:col-span-2">
            <FormError error={error} />
            <Button type="submit">Përfundo hapin e instaluesit</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function CertifierForm({
  applicationId,
  defaults,
  documentsSlot,
  summaryData,
  orgs,
  uploadedPurposes = [],
  applicationType = ApplicationType.NEW_REGISTRATION,
}: {
  applicationId: string;
  defaults?: {
    installationCertificateNumber?: string;
    installationCertificateDate?: string;
    certifierNotes?: string;
    omiNumber?: string;
    examinationType?: string;
    examinationDate?: string;
    conformityResult?: string;
    certificateReference?: string;
    certifierTechnicalNotes?: string;
  };
  documentsSlot?: React.ReactNode;
  summaryData?: ApplicationSummaryData | null;
  orgs?: { owner?: string | null; installer?: string | null; certifier?: string | null };
  uploadedPurposes?: string[];
  applicationType?: ApplicationType;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const missingCertifierDocs = getMissingRequiredApplicationDocumentsForPhases({
    type: applicationType,
    data: summaryData ?? undefined,
    uploadedPurposes,
    phases: CERTIFIER_COMPLETION_DOC_PHASES,
  });

  const missingOwnerDocs = getMissingRequiredApplicationDocumentsForPhases({
    type: applicationType,
    data: summaryData ?? undefined,
    uploadedPurposes,
    phases: ["owner"],
  });

  const formKey = [
    defaults?.installationCertificateNumber,
    defaults?.conformityResult,
    defaults?.omiNumber,
    defaults?.examinationDate,
  ].join("|");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (missingCertifierDocs.length > 0) {
      setError(
        `Dokumentacioni i paplotë: ${missingCertifierDocs.map((d: ApplicationDocumentSpec) => `Mungon ${d.label}`).join("; ")}`,
      );
      return;
    }
    const fd = new FormData(e.currentTarget);
    if (!fd.get("conformityResult")) {
      setError("Zgjidhni rezultatin e përputhshmërisë.");
      return;
    }
    const result = await completeCertifierAction(applicationId, fd);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {summaryData && (
        <ApplicationDataSummary
          data={summaryData}
          orgs={orgs}
          title="Të dhënat e ashensorit (lexim)"
          hideCertification
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Certifikimi i instalimit</CardTitle>
          <p className="text-sm text-muted-foreground">
            Verifikoni të dhënat e mësipërme, plotësoni certifikimin dhe ngarkoni raportin OMI.
          </p>
        </CardHeader>
        <CardContent>
          <DemoStepFillButton applicationId={applicationId} step="certifier-certification" className="mb-4" />
          <form key={formKey} onSubmit={onSubmit} className="grid gap-3">
            <div className="space-y-1">
              <Label>Numri i certifikatës *</Label>
              <Input name="installationCertificateNumber" required defaultValue={defaults?.installationCertificateNumber} />
            </div>
            <div className="space-y-1">
              <Label>Data e certifikatës *</Label>
              <Input name="installationCertificateDate" type="date" required defaultValue={defaults?.installationCertificateDate} />
            </div>
            <div className="space-y-1">
              <Label>Numri OMI</Label>
              <Input name="omiNumber" defaultValue={defaults?.omiNumber} />
            </div>
            <div className="space-y-1">
              <Label>Lloji i ekzaminimit</Label>
              <Input name="examinationType" defaultValue={defaults?.examinationType} />
            </div>
            <div className="space-y-1">
              <Label>Data e ekzaminimit</Label>
              <Input name="examinationDate" type="date" defaultValue={defaults?.examinationDate} />
            </div>
            <div className="space-y-1">
              <Label>Rezultati i përputhshmërisë *</Label>
              <select
                name="conformityResult"
                required
                defaultValue={defaults?.conformityResult ?? ""}
                className="flex h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="" disabled>
                  Zgjidhni rezultatin
                </option>
                <option value="CONFORM">Në përputhje</option>
                <option value="NON_CONFORM">Jo në përputhje</option>
                <option value="CONDITIONAL">Me kushte</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Referenca e certifikatës</Label>
              <Input name="certificateReference" defaultValue={defaults?.certificateReference} />
            </div>
            <div className="space-y-1">
              <Label>Shënime certifikuese</Label>
              <Input name="certifierNotes" defaultValue={defaults?.certifierNotes} />
            </div>
            <div className="space-y-1">
              <Label>Shënime teknike të certifikuesit</Label>
              <Input name="certifierTechnicalNotes" defaultValue={defaults?.certifierTechnicalNotes} />
            </div>
            {documentsSlot && (
              <FormDocumentsSection title="Dokumentet e certifikimit">
                {documentsSlot}
              </FormDocumentsSection>
            )}

            {missingOwnerDocs.length > 0 && (
              <p className="rounded-xl border border-sky-200/80 bg-sky-50/50 px-4 py-3 text-sm text-sky-950">
                Dokumente të personit përgjegjës që mungojnë (ngarkohen nga personi përgjegjës i ashensorit para parashtrimit te ISHMT):{" "}
                {missingOwnerDocs.map((d) => d.label).join("; ")}
              </p>
            )}

            {missingCertifierDocs.length > 0 && (
              <p className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm text-amber-950">
                Dokumentacioni i paplotë:{" "}
                {missingCertifierDocs.map((d) => `Mungon ${d.label}`).join("; ")}
              </p>
            )}

            <FormError error={error} />
            <Button type="submit" disabled={missingCertifierDocs.length > 0}>
              Përfundo certifikimin
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SubmitApplicationButton({
  applicationId,
  blockSubmit,
}: {
  applicationId: string;
  blockSubmit?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    const result = await submitApplicationAction(applicationId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {blockSubmit && <p className="mb-2 text-sm text-amber-800">{blockSubmit}</p>}
      <Button onClick={onClick} disabled={Boolean(blockSubmit)}>Parashtro te ISHMT</Button>
      <FormError error={error} />
    </div>
  );
}

export function CancelApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!confirm("Jeni të sigurt që doni ta anuloni aplikimin?")) return;
    const result = await cancelApplicationAction(applicationId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button variant="outline" onClick={onClick}>Anulo aplikimin</Button>
      <FormError error={error} />
    </div>
  );
}

export function IshmtReviewActions({
  applicationId,
  status,
  roleCode,
  inspectorReview,
}: {
  applicationId: string;
  status: ApplicationStatus;
  roleCode: string;
  inspectorReview?: {
    recommendation: "APPROVE" | "REJECT";
    requiresPhysicalInspection: boolean;
    comment: string | null;
  };
}) {
  const role = roleCode as RoleCode;
  if (canApproveApplications(role)) {
    return (
      <AdminReviewActions
        applicationId={applicationId}
        status={status}
        inspectorReview={inspectorReview}
      />
    );
  }
  if (canReviewApplications(role)) {
    return <InspectorReviewActions applicationId={applicationId} status={status} />;
  }
  return null;
}

export function InspectorReviewActions({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requiresPhysical, setRequiresPhysical] = useState(false);
  const [comment, setComment] = useState("");

  async function pickup() {
    const result = await pickupReviewAction(applicationId);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function forward() {
    if (!confirm("Konfirmo dërgimin e dosjes te kryeinspektori për miratim final?")) return;
    const result = await forwardToAdminAction(applicationId, {
      requiresPhysicalInspection: requiresPhysical,
      comment: comment.trim() || undefined,
    });
    if (!result.success) setError(result.error);
    else {
      setSuccess("Dosja u dërgua te administratori për miratim.");
      router.refresh();
    }
  }

  async function recommendReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = new FormData(e.currentTarget).get("reason");
    if (typeof reason !== "string" || !reason.trim()) {
      setError("Arsyeja e rekomandimit është e detyrueshme.");
      return;
    }
    if (!confirm("Konfirmo rekomandimin e refuzimit te administratori? Vendimi final bëhet nga admini.")) return;
    const result = await recommendRejectionAction(applicationId, {
      reason: reason.trim(),
      requiresPhysicalInspection: requiresPhysical,
    });
    if (!result.success) setError(result.error);
    else {
      setSuccess("Refuzimi u rekomandua te administratori për vendim final.");
      router.refresh();
    }
  }

  async function returnApp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await returnApplicationAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <Card className="flex max-h-[min(680px,calc(100dvh-5rem))] flex-col">
      <CardHeader className="shrink-0 pb-3">
        <CardTitle>Veprimet e inspektorit</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
        {status === ApplicationStatus.SUBMITTED && (
          <Button onClick={pickup}>Merr në shqyrtim</Button>
        )}
        {status === ApplicationStatus.UNDER_REVIEW && (
          <>
            <p className="text-sm text-muted-foreground">
              Pas shqyrtimit, dërgoni dosjen te administratori për miratim final, rekomandoni refuzimin,
              kërkoni verifikim fizik, ose ktheni për korrigjim. Inspektori nuk merr vendim final.
            </p>

            <section className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Rekomandim miratimi</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={requiresPhysical}
                  onChange={(e) => setRequiresPhysical(e.target.checked)}
                />
                Kërkohet verifikim fizik në terren
              </label>
              <div className="space-y-1">
                <Label>Shënim për administratorin (opsional)</Label>
                <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Rekomandim / vërejtje" />
              </div>
              <Button onClick={forward} className="w-full bg-green-700 hover:bg-green-800">
                Dërgo për miratim (rekomandim)
              </Button>
            </section>

            <form onSubmit={recommendReject} className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Rekomandim refuzimi</p>
              <Label>Arsye rekomandimi refuzimi</Label>
              <Input name="reason" required />
              <Button type="submit" variant="outline" className="w-full">
                Rekomando refuzimin te kryeinspektori
              </Button>
            </form>

            <form onSubmit={returnApp} className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Kthim për korrigjim</p>
              <Label>Arsye kthimi</Label>
              <Input name="reason" required />
              <Label>Korrigjimi i kërkuar</Label>
              <Input name="requiredCorrection" required placeholder="P.sh. Plotësoni numrin OMI" />
              <ReturnToRolesField />
              <Button type="submit" variant="outline" className="w-full">
                Kthe për korrigjim
              </Button>
            </form>
          </>
        )}
        {status === ApplicationStatus.PENDING_CHIEF_INSPECTOR && (
          <p className="text-sm text-muted-foreground">
            Dosja është dërguar te kryeinspektori - në pritje të miratimit final.
          </p>
        )}
        <FormError error={error} />
        {success && <p className="text-sm text-green-700">{success}</p>}
      </CardContent>
    </Card>
  );
}

export function AdminReviewActions({
  applicationId,
  status,
  inspectorReview,
}: {
  applicationId: string;
  status: ApplicationStatus;
  inspectorReview?: {
    recommendation: "APPROVE" | "REJECT";
    requiresPhysicalInspection: boolean;
    comment: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function approve() {
    if (!confirm("Konfirmo miratimin final të aplikimit?")) return;
    const result = await approveApplicationAction(applicationId);
    if (!result.success) setError(result.error);
    else {
      setSuccess(
        result.registryNumber
          ? `Aplikimi u miratua. Numri i regjistrit: ${result.registryNumber}`
          : "Aplikimi u miratua. Kartela e ashensorit u përditësua.",
      );
      router.refresh();
    }
  }

  async function reject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await rejectApplicationAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function returnApp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await returnApplicationAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  if (status !== ApplicationStatus.PENDING_CHIEF_INSPECTOR) {
    return null;
  }

  return (
    <Card className="flex max-h-[min(680px,calc(100dvh-5rem))] flex-col">
      <CardHeader className="shrink-0 pb-3">
        <CardTitle>Miratimi final (kryeinspektor)</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
        <p className="text-sm text-muted-foreground">
          Inspektori ka përfunduar shqyrtimin. Miratoni, refuzoni ose ktheni dosjen për korrigjim (vendim final).
        </p>
        {inspectorReview && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium">Rekomandimi i inspektorit</p>
            <p>
              {inspectorReview.recommendation === "REJECT"
                ? "Rekomandon REFUZIM"
                : "Rekomandon MIRATIM"}
              {inspectorReview.requiresPhysicalInspection ? " · Kërkohet verifikim fizik" : ""}
            </p>
            {inspectorReview.comment && (
              <p className="mt-1 text-muted-foreground">{inspectorReview.comment}</p>
            )}
          </div>
        )}
        <Button onClick={approve} className="bg-green-700 hover:bg-green-800">
          Mirato aplikimin
        </Button>
        <form onSubmit={reject} className="grid gap-2 border-t pt-4">
          <Label>Arsye refuzimi</Label>
          <Input name="reason" required />
          <Button type="submit" variant="outline">Refuzo dhe njofto personin përgjegjës të ashensorit</Button>
        </form>
        <form onSubmit={returnApp} className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Kthim për korrigjim</p>
          <Label>Arsye kthimi</Label>
          <Input name="reason" required />
          <Label>Korrigjimi i kërkuar</Label>
          <Input name="requiredCorrection" required placeholder="P.sh. Plotësoni dokumentacionin" />
          <ReturnToRolesField />
          <Button type="submit" variant="outline" className="w-full">
            Kthe për korrigjim
          </Button>
        </form>
        <FormError error={error} />
        {success && <p className="text-sm text-green-700">{success}</p>}
      </CardContent>
    </Card>
  );
}
