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
  assignFieldInspectorsAction,
  assignInstallerAction,
  cancelApplicationAction,
  completeCertifierAction,
  completeInstallerAction,
  submitApplicationAction,
  updateLocationAction,
  approveApplicationAction,
  delegateToDirectorAction,
  delegateToSectorHeadAction,
  forwardToChiefAction,
  forwardToDirectorAction,
  rejectApplicationAction,
  returnApplicationAction,
  submitFieldReportAction,
} from "@/lib/actions/application-actions";
import type { RoleCode } from "@/lib/constants/roles";
import { ROLE_CODES } from "@/lib/constants/roles";
import {
  canApproveApplications,
  canChiefHandleApplications,
  canDirectApplications,
  canReviewApplications,
  isFieldInspectorRole,
} from "@/lib/permissions/ishmt-roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DemoStepFillButton } from "@/components/demo/demo-step-fill-button";
import { FormDocumentsSection } from "@/components/applications/form-documents-section";
import { RETURN_TARGET_LABELS } from "@/lib/workflows/return-targets";
import type { ReturnTargetRole } from "@prisma/client";

const REVIEW_TEXTAREA_CLASS =
  "flex min-h-[3.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

const REVIEW_ACTIONS_CARD_CLASS =
  "flex w-full min-w-0 max-h-[calc(100dvh-5rem)] flex-col overflow-hidden shadow-md lg:max-h-[calc(100dvh-4rem)]";

const REVIEW_ACTIONS_SCROLL_CLASS =
  "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]";

type ReviewDecisionMode = "approve" | "reject" | "return";

function ReviewDecisionTabs({
  mode,
  onChange,
}: {
  mode: ReviewDecisionMode;
  onChange: (mode: ReviewDecisionMode) => void;
}) {
  const tabs: { id: ReviewDecisionMode; label: string; activeClass: string }[] = [
    { id: "approve", label: "Mirato", activeClass: "text-green-800 ring-green-200" },
    { id: "reject", label: "Refuzo", activeClass: "text-destructive ring-destructive/30" },
    { id: "return", label: "Kthe", activeClass: "text-amber-900 ring-amber-200" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Lloji i vendimit"
      className="grid grid-cols-3 gap-1 rounded-xl border bg-muted/40 p-1"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={mode === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-lg px-2 py-2.5 text-sm font-medium transition-all",
            mode === tab.id
              ? cn("bg-background shadow-sm ring-1", tab.activeClass)
              : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function InspectorRecommendationBanner({
  inspectorReview,
}: {
  inspectorReview: {
    recommendation: "APPROVE" | "REJECT";
    requiresPhysicalInspection: boolean;
    comment: string | null;
  };
}) {
  const recommendsReject = inspectorReview.recommendation === "REJECT";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 text-sm",
        recommendsReject
          ? "border-destructive/30 bg-destructive/5"
          : "border-green-200 bg-green-50/80",
      )}
    >
      <p className="font-semibold text-foreground">Rekomandimi i inspektorit</p>
      <p className={cn("mt-1", recommendsReject ? "text-destructive" : "text-green-800")}>
        {recommendsReject ? "Rekomandon refuzim" : "Rekomandon miratim"}
        {inspectorReview.requiresPhysicalInspection ? " · Kërkohet verifikim fizik" : ""}
      </p>
      {inspectorReview.comment && (
        <p className="mt-2 text-muted-foreground leading-relaxed">{inspectorReview.comment}</p>
      )}
    </div>
  );
}

function ReturnToRolesField() {
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">Kthe te (mund të zgjidhni më shumë se një)</legend>
      {RETURN_TO_ROLE_OPTIONS.map((role) => (
        <label key={role} className="flex cursor-pointer items-start gap-2 text-sm leading-snug">
          <input type="checkbox" name="returnToRoles" value={role} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{RETURN_TARGET_LABELS[role]}</span>
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
      <Button onClick={onClick} disabled={Boolean(blockSubmit)}>Dërgo aplikimin për rregjistrim</Button>
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
  requiredInspectorCount,
  plannedInspectorIds,
  inspectorAssignmentLockedBy,
  fieldReviewAssignments,
  availableInspectors,
  directorReview,
  myFieldReviewAssignmentId,
  initialRequiresFieldVerification,
  fieldVerificationCanApprove,
}: {
  applicationId: string;
  status: ApplicationStatus;
  roleCode: string;
  requiredInspectorCount?: number | null;
  plannedInspectorIds?: string[] | null;
  inspectorAssignmentLockedBy?: string | null;
  initialRequiresFieldVerification?: boolean;
  fieldVerificationCanApprove?: boolean;
  fieldReviewAssignments?: {
    id: string;
    inspectorId: string;
    status: string;
    inspector: { firstName: string; lastName: string };
  }[];
  myFieldReviewAssignmentId?: string | null;
  availableInspectors?: { id: string; label: string }[];
  directorReview?: {
    comment: string | null;
  };
}) {
  const role = roleCode as RoleCode;

  if (canApproveApplications(role) && status === ApplicationStatus.PENDING_CHIEF_INSPECTOR) {
    return (
      <AdminReviewActions
        applicationId={applicationId}
        status={status}
        upstreamReview={directorReview}
        fieldVerificationCanApprove={fieldVerificationCanApprove ?? true}
      />
    );
  }

  if (canChiefHandleApplications(role) && status === ApplicationStatus.SUBMITTED) {
    return (
      <ChiefDelegateActions
        applicationId={applicationId}
        availableInspectors={availableInspectors ?? []}
        initialRequiresFieldVerification={initialRequiresFieldVerification}
      />
    );
  }

  if (canDirectApplications(role)) {
    if (status === ApplicationStatus.PENDING_DIRECTOR) {
      return (
        <DirectorDelegateActions
          applicationId={applicationId}
          plannedInspectorIds={plannedInspectorIds}
          inspectorAssignmentLockedBy={inspectorAssignmentLockedBy}
          availableInspectors={availableInspectors ?? []}
          initialRequiresFieldVerification={initialRequiresFieldVerification}
        />
      );
    }
    if (status === ApplicationStatus.PENDING_DIRECTOR_REPORT) {
      return <DirectorForwardActions applicationId={applicationId} />;
    }
  }

  if (canReviewApplications(role)) {
    if (status === ApplicationStatus.PENDING_SECTOR_HEAD || status === ApplicationStatus.RETURNED_TO_INSPECTORS) {
      return (
        <SectorHeadAssignActions
          applicationId={applicationId}
          requiredInspectorCount={requiredInspectorCount}
          plannedInspectorIds={plannedInspectorIds}
          availableInspectors={availableInspectors ?? []}
          initialRequiresFieldVerification={initialRequiresFieldVerification}
        />
      );
    }
    if (status === ApplicationStatus.PENDING_FIELD_REVIEW) {
      return (
        <FieldReviewProgressCard assignments={fieldReviewAssignments ?? []} />
      );
    }
    if (
      status === ApplicationStatus.PENDING_SECTOR_HEAD_REPORT ||
      status === ApplicationStatus.RETURNED_TO_SECTOR_HEAD
    ) {
      return <SectorHeadReportActions applicationId={applicationId} />;
    }
  }

  if (isFieldInspectorRole(role) && status === ApplicationStatus.PENDING_FIELD_REVIEW && myFieldReviewAssignmentId) {
    return <FieldInspectorReportActions assignmentId={myFieldReviewAssignmentId} />;
  }

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          Nuk ka veprime të disponueshme për rolin dhe statusin aktual.
        </p>
      </CardContent>
    </Card>
  );
}

function ReportTextarea({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        required
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={REVIEW_TEXTAREA_CLASS}
        placeholder="Shkruani raportin tuaj..."
      />
    </div>
  );
}

function OptionalNoteTextarea({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={REVIEW_TEXTAREA_CLASS}
        placeholder="Shënim ose udhëzim opsional..."
      />
    </div>
  );
}

function FieldVerificationCheckbox({
  id,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-2 rounded-md border border-amber-200/80 bg-amber-50/50 p-3 text-sm ${disabled ? "opacity-70" : ""}`}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="font-medium text-foreground">Kërko verifikim në terren</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Inspektori viziton objektin para miratimit final. Miratimi bllokohet deri sa verifikimi të përfundojë me
          rezultat pozitiv (PASS).
        </span>
      </span>
    </label>
  );
}

function ChiefDelegateActions({
  applicationId,
  availableInspectors = [],
  initialRequiresFieldVerification = false,
}: {
  applicationId: string;
  availableInspectors?: { id: string; label: string }[];
  initialRequiresFieldVerification?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [requiresFieldVerification, setRequiresFieldVerification] = useState(initialRequiresFieldVerification);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await delegateToDirectorAction(applicationId, {
      noteText,
      inspectorIds: selected.length ? selected : undefined,
      requiredInspectorCount: selected.length || undefined,
      requiresFieldVerification,
    });
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-lg">Kryeinspektor — delegim</CardTitle>
        <CardDescription>
          Delegoni Aplikimin për Registrim te drejtori i drejtorisë. Inspektorët mund të caktohen tani ose më vonë.
        </CardDescription>
      </CardHeader>
      <CardContent className={REVIEW_ACTIONS_SCROLL_CLASS}>
        <form onSubmit={onSubmit} className="space-y-4">
          <OptionalNoteTextarea
            id="chief-note"
            label="Shënim ose udhëzim"
            value={noteText}
            onChange={setNoteText}
          />
          {availableInspectors.length > 0 ? (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Cakto inspektorë (opsional)</p>
              {availableInspectors.map((inspector) => (
                <label key={inspector.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(inspector.id)}
                    onChange={() => toggle(inspector.id)}
                  />
                  {inspector.label}
                </label>
              ))}
            </div>
          ) : null}
          <FieldVerificationCheckbox
            id="chief-field-verification"
            checked={requiresFieldVerification}
            onChange={setRequiresFieldVerification}
          />
          <Button type="submit" className="w-full">
            Delego te drejtori i drejtorisë
          </Button>
          <FormError error={error} />
        </form>
      </CardContent>
    </Card>
  );
}

function DirectorDelegateActions({
  applicationId,
  plannedInspectorIds,
  inspectorAssignmentLockedBy,
  availableInspectors = [],
  initialRequiresFieldVerification = false,
}: {
  applicationId: string;
  plannedInspectorIds?: string[] | null;
  inspectorAssignmentLockedBy?: string | null;
  availableInspectors?: { id: string; label: string }[];
  initialRequiresFieldVerification?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const inherited = plannedInspectorIds ?? [];
  const locked = Boolean(inspectorAssignmentLockedBy && inherited.length);
  const [selected, setSelected] = useState<string[]>(inherited);
  const [requiresFieldVerification, setRequiresFieldVerification] = useState(initialRequiresFieldVerification);

  function toggle(id: string) {
    if (locked) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await delegateToSectorHeadAction(applicationId, {
      noteText,
      inspectorIds: !locked && selected.length ? selected : undefined,
      requiresFieldVerification,
    });
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  const plannedLabels = inherited
    .map((id) => availableInspectors.find((i) => i.id === id)?.label)
    .filter(Boolean);

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-lg">Drejtor i drejtorisë — delegim</CardTitle>
        <CardDescription>
          Delegoni te përgjegjësi i sektorit. Inspektorët e planifikuar nga hallka e sipërme shfaqen më poshtë.
        </CardDescription>
      </CardHeader>
      <CardContent className={REVIEW_ACTIONS_SCROLL_CLASS}>
        <form onSubmit={onSubmit} className="space-y-4">
          {locked && plannedLabels.length > 0 ? (
            <div className="rounded-md border border-dashed p-3 text-sm">
              <p className="font-medium">Inspektorët e caktuar nga Kryeinspektori</p>
              <p className="mt-1 text-muted-foreground">{plannedLabels.join(", ")}</p>
            </div>
          ) : null}
          {!locked && availableInspectors.length > 0 ? (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Cakto inspektorë (opsional)</p>
              {availableInspectors.map((inspector) => (
                <label key={inspector.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(inspector.id)}
                    onChange={() => toggle(inspector.id)}
                  />
                  {inspector.label}
                </label>
              ))}
            </div>
          ) : null}
          <FieldVerificationCheckbox
            id="director-field-verification"
            checked={requiresFieldVerification}
            onChange={setRequiresFieldVerification}
          />
          <OptionalNoteTextarea
            id="director-note"
            label="Shënim ose udhëzim"
            value={noteText}
            onChange={setNoteText}
          />
          <Button type="submit" className="w-full">
            Delego te përgjegjësi i sektorit
          </Button>
          <FormError error={error} />
        </form>
      </CardContent>
    </Card>
  );
}

function DirectorForwardActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await forwardToChiefAction(applicationId, reportText);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-lg">Drejtor i drejtorisë — dërgim</CardTitle>
      </CardHeader>
      <CardContent className={REVIEW_ACTIONS_SCROLL_CLASS}>
        <form onSubmit={onSubmit} className="space-y-4">
          <ReportTextarea
            id="director-forward-report"
            label="Raporti i drejtorit *"
            value={reportText}
            onChange={setReportText}
          />
          <Button type="submit" className="w-full">
            Dërgo te kryeinspektori për miratim
          </Button>
          <FormError error={error} />
        </form>
      </CardContent>
    </Card>
  );
}

function SectorHeadAssignActions({
  applicationId,
  requiredInspectorCount,
  plannedInspectorIds,
  availableInspectors,
  initialRequiresFieldVerification = false,
}: {
  applicationId: string;
  requiredInspectorCount?: number | null;
  plannedInspectorIds?: string[] | null;
  availableInspectors: { id: string; label: string }[];
  initialRequiresFieldVerification?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const inherited = plannedInspectorIds ?? [];
  const [selected, setSelected] = useState<string[]>(inherited);
  const [requiresFieldVerification, setRequiresFieldVerification] = useState(initialRequiresFieldVerification);

  function toggle(id: string) {
    if (inherited.length) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const inspectorIds = inherited.length ? inherited : selected;
    const result = await assignFieldInspectorsAction(applicationId, {
      inspectorIds,
      noteText,
      requiresFieldVerification,
    });
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  const targetCount = inherited.length || selected.length || requiredInspectorCount;

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-lg">Përgjegjës sektori — delegim te inspektorët</CardTitle>
        <CardDescription>
          {inherited.length
            ? "Inspektorët janë caktuar nga hallka e sipërme. Konfirmoni delegimin."
            : "Zgjidhni inspektorët dhe delegoni dosjen për shqyrtim teknik."}
        </CardDescription>
      </CardHeader>
      <CardContent className={REVIEW_ACTIONS_SCROLL_CLASS}>
        <form onSubmit={onSubmit} className="space-y-4">
          <OptionalNoteTextarea
            id="sector-note"
            label="Shënim ose udhëzim"
            value={noteText}
            onChange={setNoteText}
          />
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">
              Inspektorët ({inherited.length || selected.length}
              {targetCount ? ` / ${targetCount}` : ""})
            </p>
            {availableInspectors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nuk u gjetën inspektorë në organizatë.</p>
            ) : (
              availableInspectors.map((inspector) => (
                <label key={inspector.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(inherited.length ? inherited : selected).includes(inspector.id)}
                    onChange={() => toggle(inspector.id)}
                    disabled={inherited.length > 0}
                  />
                  {inspector.label}
                </label>
              ))
            )}
          </div>
          <FieldVerificationCheckbox
            id="sector-field-verification"
            checked={requiresFieldVerification}
            onChange={setRequiresFieldVerification}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={!inherited.length && selected.length < 1}
          >
            Delego te inspektorët
          </Button>
          <FormError error={error} />
        </form>
      </CardContent>
    </Card>
  );
}

function FieldReviewProgressCard({
  assignments,
}: {
  assignments: { id: string; status: string; inspector: { firstName: string; lastName: string } }[];
}) {
  const active = assignments.filter((a) => a.status !== "REPLACED");
  const completed = active.filter((a) => a.status === "COMPLETED").length;

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-lg">Progresi i shqyrtimit</CardTitle>
        <CardDescription>
          {completed} nga {active.length} raporte të përfunduara
        </CardDescription>
      </CardHeader>
      <CardContent className={REVIEW_ACTIONS_SCROLL_CLASS}>
        <div className="space-y-1 text-sm">
          {active.map((a) => (
            <p key={a.id}>
              {a.inspector.firstName} {a.inspector.lastName}:{" "}
              {a.status === "COMPLETED" ? "Raporti u dorëzua" : "Në pritje të raportit"}
            </p>
          ))}
        </div>
        {completed === active.length && active.length > 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Të gjithë inspektorët kanë përfunduar. Dosja kalon automatikisht te ju për raportin e Përgjegjësit.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SectorHeadReportActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await forwardToDirectorAction(applicationId, reportText);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-lg">Përgjegjës sektori — raport</CardTitle>
        <CardDescription>Plotësoni raportin tuaj dhe delegoni dosjen te drejtori.</CardDescription>
      </CardHeader>
      <CardContent className={REVIEW_ACTIONS_SCROLL_CLASS}>
        <form onSubmit={onSubmit} className="space-y-4">
          <ReportTextarea
            id="sector-forward-report"
            label="Raporti i përgjegjësit të sektorit *"
            value={reportText}
            onChange={setReportText}
          />
          <Button type="submit" className="w-full">
            Dërgo te drejtori i drejtorisë
          </Button>
          <FormError error={error} />
        </form>
      </CardContent>
    </Card>
  );
}

function FieldInspectorReportActions({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reportText, setReportText] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveDraft() {
    setSaving(true);
    const result = await submitFieldReportAction(assignmentId, reportText, { submit: false });
    setSaving(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await submitFieldReportAction(assignmentId, reportText, { submit: true });
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="text-lg">Inspektor — raport shqyrtimi</CardTitle>
      </CardHeader>
      <CardContent className={REVIEW_ACTIONS_SCROLL_CLASS}>
        <form onSubmit={onSubmit} className="space-y-4">
          <ReportTextarea
            id="field-report"
            label="Raporti i inspektorit *"
            value={reportText}
            onChange={setReportText}
          />
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={saveDraft} disabled={saving}>
              Ruaj si draft
            </Button>
            <Button type="submit" className="w-full">
              Përfundo shqyrtimin dhe dërgo raportin
            </Button>
          </div>
          <FormError error={error} />
        </form>
      </CardContent>
    </Card>
  );
}

export function AdminReviewActions({
  applicationId,
  status,
  upstreamReview,
  fieldVerificationCanApprove = true,
}: {
  applicationId: string;
  status: ApplicationStatus;
  upstreamReview?: {
    comment: string | null;
  };
  fieldVerificationCanApprove?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<ReviewDecisionMode>("approve");

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
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className="shrink-0 space-y-3 pb-0">
        <div className="space-y-2">
          <CardTitle className="text-lg">Vendimi final</CardTitle>
          <CardDescription>
            Zinxhiri i shqyrtimit hierarkik u përfundua. Merrni vendimin final të miratimit, refuzimit ose kthimit.
          </CardDescription>
        </div>
        {upstreamReview?.comment && (
          <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            Raporti i drejtorit: {upstreamReview.comment}
          </p>
        )}
        <ReviewDecisionTabs mode={mode} onChange={setMode} />
      </CardHeader>
      <CardContent className={cn(REVIEW_ACTIONS_SCROLL_CLASS, "pt-4")}>
        {mode === "approve" && (
          <div
            role="tabpanel"
            className="space-y-4 rounded-xl border border-green-200 bg-green-50/50 p-4"
          >
            <p className="text-sm leading-relaxed text-green-950">
              Pas miratimit gjenerohen numri i regjistrit dhe certifikata. Vendimi njoftohet automatikisht
              personit përgjegjës të ashensorit.
            </p>
            {!fieldVerificationCanApprove ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                Miratimi është bllokuar: verifikimi në terren duhet të përfundojë me rezultat pozitiv (PASS).
              </p>
            ) : null}
            <Button
              onClick={approve}
              disabled={!fieldVerificationCanApprove}
              className="h-11 w-full bg-green-700 text-base font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              Mirato aplikimin
            </Button>
          </div>
        )}

        {mode === "reject" && (
          <form
            role="tabpanel"
            onSubmit={reject}
            className="space-y-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4"
          >
            <p className="text-sm text-muted-foreground">
              Refuzimi përfundon aplikimin. Arsyeja dërgohet te personi përgjegjës i ashensorit.
            </p>
            <div className="space-y-1">
              <Label htmlFor="reject-reason">Arsye refuzimi</Label>
              <textarea
                id="reject-reason"
                name="reason"
                required
                rows={4}
                className={`${REVIEW_TEXTAREA_CLASS} min-h-[5.5rem] bg-background`}
                placeholder="Shkruani arsyen e refuzimit..."
              />
            </div>
            <Button type="submit" variant="destructive" className="h-11 w-full">
              Refuzo aplikimin
            </Button>
          </form>
        )}

        {mode === "return" && (
          <form
            role="tabpanel"
            onSubmit={returnApp}
            className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4"
          >
            <p className="text-sm text-muted-foreground">
              Dosja kthehet për korrigjim te rolet e zgjedhura. Aplikimi vazhdon pas plotësimit.
            </p>
            <div className="space-y-1">
              <Label htmlFor="return-reason">Arsye kthimi</Label>
              <textarea
                id="return-reason"
                name="reason"
                required
                rows={2}
                className={`${REVIEW_TEXTAREA_CLASS} bg-background`}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="return-correction">Korrigjimi i kërkuar</Label>
              <textarea
                id="return-correction"
                name="requiredCorrection"
                required
                rows={2}
                className={`${REVIEW_TEXTAREA_CLASS} bg-background`}
                placeholder="P.sh. Plotësoni dokumentacionin"
              />
            </div>
            <ReturnToRolesField />
            <Button type="submit" variant="outline" className="h-11 w-full border-amber-300 bg-background">
              Kthe për korrigjim
            </Button>
          </form>
        )}

        <FormError error={error} />
        {success && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {success}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
