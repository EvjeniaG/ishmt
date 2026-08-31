"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useState } from "react";
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
  approveInstallerTechnicalReviewAction,
  requestInstallerTechnicalCorrectionsAction,
  resubmitInstallerTechnicalReviewAction,
  delegateToDirectorAction,
  delegateToSectorHeadAction,
  forwardToChiefAction,
  forwardToDirectorAction,
  rejectApplicationAction,
  returnApplicationAction,
  submitFieldReportAction,
  chiefUpdatePlannedInspectorsAction,
} from "@/lib/actions/application-actions";
import { InspectorAssignedList, InspectorSelectionList } from "@/components/applications/inspector-selection-list";
import type { FieldInspectorOptionWithWorkload } from "@/lib/ishmt/field-inspector-options";
import { normalizeInspectorOptions } from "@/lib/ishmt/field-inspector-options";
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
import { fieldVerificationRequestedByLabel } from "@/lib/services/application-field-verification";
import { chiefShowsInspectorReassignPanel } from "@/lib/ishmt/review-actions-visibility";
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
  "reg-wizard-panel flex w-full min-w-0 max-h-[calc(100dvh-5rem)] flex-col overflow-hidden rounded-xl border-border/70 shadow-sm lg:max-h-[calc(100dvh-4rem)]";

const REVIEW_ACTIONS_HEADER_CLASS =
  "shrink-0 space-y-1 border-b border-border/60 bg-muted/20 !p-4 sm:!px-6 sm:!py-4";

const REVIEW_ACTIONS_SCROLL_CLASS =
  "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]";

type ReviewDecisionMode = "approve" | "reject" | "return";

function ReviewDecisionTabs({
  mode,
  onChange,
}: {
  mode: ReviewDecisionMode;
  onChange: (mode: ReviewDecisionMode) => void;
}) {
  const tabs: { id: ReviewDecisionMode; label: string }[] = [
    { id: "approve", label: "Mirato" },
    { id: "reject", label: "Refuzo" },
    { id: "return", label: "Kthe" },
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
            "rounded-lg px-2 py-2 text-sm font-medium transition-all",
            mode === tab.id
              ? "bg-background text-foreground shadow-sm ring-1 ring-border"
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
    <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
      <p className="font-semibold text-foreground">Rekomandimi i inspektorit</p>
      <p className="mt-1 text-foreground">
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
  priorDocumentsSlot,
  documentsSlot,
  summaryData,
  orgs,
  uploadedPurposes = [],
  applicationType = ApplicationType.NEW_REGISTRATION,
}: {
  applicationId: string;
  certifiers: Company[];
  hideCertifierAssignment?: boolean;
  defaults?: Record<string, string | number | undefined>;
  priorDocumentsSlot?: React.ReactNode;
  documentsSlot?: React.ReactNode;
  summaryData?: ApplicationSummaryData | null;
  orgs?: { owner?: string | null; installer?: string | null; certifier?: string | null };
  uploadedPurposes?: string[];
  applicationType?: ApplicationType;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const missingInstallerDocs = getMissingRequiredApplicationDocumentsForPhases({
    type: applicationType,
    data: summaryData ?? undefined,
    uploadedPurposes,
    phases: ["installer"],
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (missingInstallerDocs.length > 0) {
      setError(
        `Dokumentacioni i paplotë: ${missingInstallerDocs.map((d: ApplicationDocumentSpec) => `Mungon ${d.label}`).join("; ")}`,
      );
      return;
    }
    const result = await completeInstallerAction(applicationId, new FormData(e.currentTarget));
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
          title="Të dhënat e aplikimit (lexim)"
          hideTechnical
          hideCertification
        />
      )}

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
              <Label>Kompania certifikuese / OM</Label>
              <select name="certifierOrgId" required className="flex h-10 w-full rounded-md border px-3 text-sm">
                <option value="">Zgjidhni</option>
                {certifiers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {priorDocumentsSlot && (
            <div className="md:col-span-2">{priorDocumentsSlot}</div>
          )}
          {documentsSlot && (
            <div className="md:col-span-2">
              <FormDocumentsSection
                title="Dokumentet tuaja"
                description="Ngarkoni dokumentet e detyrueshme (*). Të tjerat janë opsionale sipas llojit të ashensorit (i ri / ekzistues)."
              >
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
    </div>
  );
}

export function CertifierTechnicalReviewForm({
  applicationId,
  certifierNotes,
  installerResponse,
  reviewStatus,
  priorDocumentsSlot,
  summaryData,
  orgs,
}: {
  applicationId: string;
  certifierNotes?: string | null;
  installerResponse?: string | null;
  reviewStatus: "PENDING_REVIEW" | "CORRECTIONS_REQUESTED" | "APPROVED";
  priorDocumentsSlot?: React.ReactNode;
  summaryData?: ApplicationSummaryData | null;
  orgs?: { owner?: string | null; installer?: string | null; certifier?: string | null };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "corrections" | null>(null);

  async function onApprove() {
    setBusy("approve");
    setError(null);
    const result = await approveInstallerTechnicalReviewAction(applicationId);
    setBusy(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onRequestCorrections(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("corrections");
    setError(null);
    const result = await requestInstallerTechnicalCorrectionsAction(applicationId, new FormData(e.currentTarget));
    setBusy(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      {summaryData && (
        <ApplicationDataSummary
          data={summaryData}
          orgs={orgs}
          title="Të dhënat teknike të instaluesit"
          hideCertification
          hideLocation
        />
      )}

      {priorDocumentsSlot ? (
        <div className="min-w-0 max-w-full overflow-hidden">{priorDocumentsSlot}</div>
      ) : null}

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Rakordimi me instaluesin</CardTitle>
          <CardDescription>
            Verifikoni të dhënat dhe dokumentet e instaluesit. Miratoni për të vazhduar me certifikimin,
            ose ktheni korrigjime nëse diçka nuk është në rregull.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {reviewStatus === "CORRECTIONS_REQUESTED" && certifierNotes && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <p className="font-medium">Në pritje të përgjigjes së instaluesit</p>
              <p className="mt-1 whitespace-pre-wrap">{certifierNotes}</p>
            </div>
          )}

          {reviewStatus === "PENDING_REVIEW" && installerResponse && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              <p className="font-medium">Përgjigja e instaluesit</p>
              <p className="mt-1 whitespace-pre-wrap">{installerResponse}</p>
            </div>
          )}

          {reviewStatus === "PENDING_REVIEW" && certifierNotes && installerResponse && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Kërkesa e mëparshme</p>
              <p className="mt-1 whitespace-pre-wrap">{certifierNotes}</p>
            </div>
          )}

          {reviewStatus === "PENDING_REVIEW" && (
            <form onSubmit={onRequestCorrections} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="certifierNotes">Kërkesat për korrigjim</Label>
                <textarea
                  id="certifierNotes"
                  name="certifierNotes"
                  required
                  minLength={10}
                  rows={4}
                  defaultValue=""
                  className={cn(REVIEW_TEXTAREA_CLASS, "break-words")}
                  placeholder="P.sh. numri serial nuk përputhet me deklaratën CE; plotësoni kapacitetin në kg..."
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button type="submit" variant="outline" disabled={busy != null} className="w-full sm:w-auto">
                  {busy === "corrections" ? "Duke dërguar..." : "Kërko korrigime te instaluesi"}
                </Button>
                <Button type="button" disabled={busy != null} onClick={onApprove} className="w-full sm:w-auto">
                  {busy === "approve" ? "Duke miratuar..." : "Mirato të dhënat teknike"}
                </Button>
              </div>
              <FormError error={error} />
            </form>
          )}

          {reviewStatus === "CORRECTIONS_REQUESTED" && (
            <p className="text-sm text-muted-foreground">
              Instaluesi po përgjigjet ndaj kërkesave. Do të njoftoheni kur të dërgojë korrigjimet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function InstallerTechnicalReconciliationForm({
  applicationId,
  certifierNotes,
  installerResponse,
  defaults,
  priorDocumentsSlot,
  documentsSlot,
  summaryData,
  orgs,
  uploadedPurposes = [],
  applicationType = ApplicationType.NEW_REGISTRATION,
}: {
  applicationId: string;
  certifierNotes?: string | null;
  installerResponse?: string | null;
  defaults?: Record<string, string | number | undefined>;
  priorDocumentsSlot?: React.ReactNode;
  documentsSlot?: React.ReactNode;
  summaryData?: ApplicationSummaryData | null;
  orgs?: { owner?: string | null; installer?: string | null; certifier?: string | null };
  uploadedPurposes?: string[];
  applicationType?: ApplicationType;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const missingInstallerDocs = getMissingRequiredApplicationDocumentsForPhases({
    type: applicationType,
    data: summaryData ?? undefined,
    uploadedPurposes,
    phases: ["installer"],
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (missingInstallerDocs.length > 0) {
      setError(
        `Dokumentacioni i paplotë: ${missingInstallerDocs.map((d: ApplicationDocumentSpec) => `Mungon ${d.label}`).join("; ")}`,
      );
      return;
    }
    const result = await resubmitInstallerTechnicalReviewAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {certifierNotes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">Kërkesat e certifikuesit</p>
          <p className="mt-1 whitespace-pre-wrap">{certifierNotes}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Korrigjimi i të dhënave teknike</CardTitle>
          <CardDescription>
            Përditësoni fushat e nevojshme dhe shpjegoni ndryshimet para se t&apos;i ridërgoni certifikuesit.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="space-y-1 md:col-span-2">
              <Label>Përgjigja ndaj kërkesave të certifikuesit</Label>
              <textarea
                name="installerResponse"
                required
                minLength={10}
                rows={4}
                defaultValue={installerResponse ?? ""}
                className={cn(REVIEW_TEXTAREA_CLASS, "break-words")}
                placeholder="Shpjegoni çfarë ndryshuat dhe si i adresuat kërkesat..."
              />
            </div>
            {priorDocumentsSlot && (
              <div className="md:col-span-2">{priorDocumentsSlot}</div>
            )}
            {documentsSlot && (
              <div className="md:col-span-2">
                <FormDocumentsSection
                  title="Dokumentet tuaja"
                  description="Përditësoni dokumentet nëse certifikuesi kërkoi ndryshime."
                >
                  {documentsSlot}
                </FormDocumentsSection>
              </div>
            )}
            <div className="md:col-span-2">
              <FormError error={error} />
              <Button type="submit">Dërgo korrigjimet te certifikuesi</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function CertifierForm({
  applicationId,
  defaults,
  priorDocumentsSlot,
  documentsSlot,
  summaryData,
  orgs,
  uploadedPurposes = [],
  applicationType = ApplicationType.NEW_REGISTRATION,
  showApplicationSummary = true,
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
  priorDocumentsSlot?: React.ReactNode;
  documentsSlot?: React.ReactNode;
  summaryData?: ApplicationSummaryData | null;
  orgs?: { owner?: string | null; installer?: string | null; certifier?: string | null };
  uploadedPurposes?: string[];
  applicationType?: ApplicationType;
  showApplicationSummary?: boolean;
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
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      {showApplicationSummary && summaryData && (
        <ApplicationDataSummary
          data={summaryData}
          orgs={orgs}
          title="Të dhënat e aplikimit"
          hideCertification
          hideLocation
        />
      )}

      <Card className="min-w-0 max-w-full overflow-hidden">
        <CardHeader>
          <CardTitle>Certifikimi i instalimit</CardTitle>
          <p className="text-sm text-muted-foreground">
            Verifikoni të dhënat e mësipërme, plotësoni certifikimin dhe ngarkoni raportin OM.
          </p>
        </CardHeader>
        <CardContent>
          <DemoStepFillButton applicationId={applicationId} step="certifier-certification" className="mb-4" />
          <form key={formKey} onSubmit={onSubmit} className="grid min-w-0 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Numri i certifikatës *</Label>
              <Input name="installationCertificateNumber" required defaultValue={defaults?.installationCertificateNumber} />
            </div>
            <div className="space-y-1">
              <Label>Data e certifikatës *</Label>
              <Input name="installationCertificateDate" type="date" required defaultValue={defaults?.installationCertificateDate} />
            </div>
            <div className="space-y-1">
              <Label>Numri OM</Label>
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
            {priorDocumentsSlot ? (
              <div key="prior-documents" className="min-w-0 md:col-span-2">
                {priorDocumentsSlot}
              </div>
            ) : null}

            {documentsSlot && (
              <div className="min-w-0 md:col-span-2">
                <FormDocumentsSection
                  title="Dokumentet tuaja"
                  description="Ngarkoni raportin OM dhe dokumentet e detyrueshme (*). Dokumentet e instaluesit duhet të jenë ngarkuar më parë."
                >
                  {documentsSlot}
                </FormDocumentsSection>
              </div>
            )}

            {missingOwnerDocs.length > 0 && (
              <p className="text-sm text-muted-foreground md:col-span-2">
                Dokumente të personit përgjegjës që mungojnë:{" "}
                {missingOwnerDocs.map((d) => d.label).join("; ")}
              </p>
            )}

            {missingCertifierDocs.length > 0 && (
              <p className="text-sm text-muted-foreground md:col-span-2">
                Dokumentacioni i paplotë:{" "}
                {missingCertifierDocs.map((d) => `Mungon ${d.label}`).join("; ")}
              </p>
            )}

            <div className="md:col-span-2">
              <FormError error={error} />
              <Button type="submit" disabled={missingCertifierDocs.length > 0}>
                Përfundo certifikimin
              </Button>
            </div>
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
      {blockSubmit && <p className="mb-2 text-sm text-muted-foreground">{blockSubmit}</p>}
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
  fieldVerificationRequestedBy,
  fieldVerificationCanApprove,
}: {
  applicationId: string;
  status: ApplicationStatus;
  roleCode: string;
  requiredInspectorCount?: number | null;
  plannedInspectorIds?: string[] | null;
  inspectorAssignmentLockedBy?: string | null;
  initialRequiresFieldVerification?: boolean;
  fieldVerificationRequestedBy?: string | null;
  fieldVerificationCanApprove?: boolean;
  fieldReviewAssignments?: {
    id: string;
    inspectorId: string;
    status: string;
    reportText?: string | null;
    inspector: { firstName: string; lastName: string };
  }[];
  myFieldReviewAssignmentId?: string | null;
  availableInspectors?: FieldInspectorOptionWithWorkload[];
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

  if (
    chiefShowsInspectorReassignPanel({
      status,
      roleCode,
      inspectorAssignmentLockedBy,
      plannedInspectorIds,
    })
  ) {
    return (
      <ChiefReassignInspectorsActions
        applicationId={applicationId}
        plannedInspectorIds={plannedInspectorIds}
        availableInspectors={availableInspectors ?? []}
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
          fieldVerificationRequestedBy={fieldVerificationRequestedBy}
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
          inspectorAssignmentLockedBy={inspectorAssignmentLockedBy}
          availableInspectors={availableInspectors ?? []}
          initialRequiresFieldVerification={initialRequiresFieldVerification}
          fieldVerificationRequestedBy={fieldVerificationRequestedBy}
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
    const myAssignment = fieldReviewAssignments?.find((a) => a.id === myFieldReviewAssignmentId);
    return (
      <FieldInspectorReportActions
        assignmentId={myFieldReviewAssignmentId}
        initialReportText={myAssignment?.reportText ?? ""}
        requiresFieldVerification={initialRequiresFieldVerification}
      />
    );
  }

  return null;
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

function ReviewInfoBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3.5 text-sm leading-relaxed text-muted-foreground">
      {children}
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
    <div className="space-y-2">
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
      className={`flex items-start gap-4 rounded-lg border border-border/60 bg-muted/20 px-4 py-3.5 text-sm ${disabled ? "opacity-70" : "cursor-pointer"}`}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="text-sm font-medium text-foreground">Kërko verifikim në terren</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          Inspektori viziton objektin para miratimit final.
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
  availableInspectors?: FieldInspectorOptionWithWorkload[];
  initialRequiresFieldVerification?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [requiresFieldVerification, setRequiresFieldVerification] = useState(initialRequiresFieldVerification);
  const inspectors = normalizeInspectorOptions(availableInspectors);

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
      <CardHeader className={REVIEW_ACTIONS_HEADER_CLASS}>
        <CardTitle className="workflow-section-title !text-base font-semibold leading-tight tracking-tight">Kryeinspektor</CardTitle>
        <CardDescription className="workflow-section-desc mt-1">
          Delegoni te drejtori i drejtorisë.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("reg-wizard-body", REVIEW_ACTIONS_SCROLL_CLASS)}>
        <form onSubmit={onSubmit} className="space-y-4">
          <OptionalNoteTextarea
            id="chief-note"
            label="Shënim ose udhëzim"
            value={noteText}
            onChange={setNoteText}
          />
          {inspectors.length > 0 ? (
            <InspectorSelectionList
              inspectors={inspectors}
              selected={selected}
              onToggle={toggle}
              title="Inspektorët (opsional)"
            />
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
  fieldVerificationRequestedBy,
}: {
  applicationId: string;
  plannedInspectorIds?: string[] | null;
  inspectorAssignmentLockedBy?: string | null;
  availableInspectors?: FieldInspectorOptionWithWorkload[];
  initialRequiresFieldVerification?: boolean;
  fieldVerificationRequestedBy?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const inherited = plannedInspectorIds ?? [];
  const locked = Boolean(inspectorAssignmentLockedBy && inherited.length);
  const chiefLockedVerification =
    initialRequiresFieldVerification &&
    fieldVerificationRequestedBy === ROLE_CODES.CHIEF_INSPECTOR;
  const [selected, setSelected] = useState<string[]>(inherited);
  const [requiresFieldVerification, setRequiresFieldVerification] = useState(initialRequiresFieldVerification);
  const verificationRequestedByLabel = fieldVerificationRequestedByLabel(fieldVerificationRequestedBy ?? null);
  const inspectors = normalizeInspectorOptions(availableInspectors);

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

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className={REVIEW_ACTIONS_HEADER_CLASS}>
        <CardTitle className="workflow-section-title !text-base font-semibold leading-tight tracking-tight">
          Drejtor i drejtorisë
        </CardTitle>
        <CardDescription className="workflow-section-desc mt-0">
          Delegoni te përgjegjësi i sektorit.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("reg-wizard-body !pt-6", REVIEW_ACTIONS_SCROLL_CLASS)}>
        <form onSubmit={onSubmit} className="space-y-6">
          {locked && inherited.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Caktuar nga kryeinspektori
              </p>
              <InspectorAssignedList inspectors={inspectors} assignedIds={inherited} showTitle={false} />
            </div>
          ) : null}
          {!locked && inspectors.length > 0 ? (
            <InspectorSelectionList
              inspectors={inspectors}
              selected={selected}
              onToggle={toggle}
              disabled={locked}
              title="Cakto inspektorë (opsional)"
            />
          ) : null}
          {chiefLockedVerification ? (
            <ReviewInfoBlock>
              Verifikimi në terren është i detyrueshëm (kërkuar nga{" "}
              {verificationRequestedByLabel ?? "kryeinspektori"}).
            </ReviewInfoBlock>
          ) : (
            <FieldVerificationCheckbox
              id="director-field-verification"
              checked={requiresFieldVerification}
              onChange={setRequiresFieldVerification}
            />
          )}
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
      <CardHeader className={REVIEW_ACTIONS_HEADER_CLASS}>
        <CardTitle className="workflow-section-title !text-base font-semibold leading-tight tracking-tight">Drejtor i drejtorisë - dërgim</CardTitle>
      </CardHeader>
      <CardContent className={cn("reg-wizard-body", REVIEW_ACTIONS_SCROLL_CLASS)}>
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

function ChiefReassignInspectorsActions({
  applicationId,
  plannedInspectorIds,
  availableInspectors = [],
}: {
  applicationId: string;
  plannedInspectorIds?: string[] | null;
  availableInspectors?: FieldInspectorOptionWithWorkload[];
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const inherited = plannedInspectorIds ?? [];
  const [selected, setSelected] = useState<string[]>(inherited);
  const inspectors = normalizeInspectorOptions(availableInspectors);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function startEditing() {
    setSelected(inherited);
    setNoteText("");
    setError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setSelected(inherited);
    setNoteText("");
    setError(null);
    setIsEditing(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      setError("Zgjidhni të paktën një inspektor.");
      return;
    }
    const result = await chiefUpdatePlannedInspectorsAction(applicationId, {
      inspectorIds: selected,
      noteText,
    });
    if (!result.success) {
      setError(result.error);
      return;
    }
    setIsEditing(false);
    router.refresh();
  }

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className={REVIEW_ACTIONS_HEADER_CLASS}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="workflow-section-title !text-base font-semibold leading-tight tracking-tight">
              Caktimi i inspektorëve
            </CardTitle>
            <CardDescription className="workflow-section-desc mt-0">
              {isEditing
                ? "Zgjidhni inspektorët dhe ruajeni ndryshimin."
                : "Inspektorët që do të shqyrtojnë këtë dosje."}
            </CardDescription>
          </div>
          {!isEditing ? (
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={startEditing}>
              Ndrysho
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={cancelEditing}>
              Anulo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn("reg-wizard-body !pt-6", REVIEW_ACTIONS_SCROLL_CLASS)}>
        {!isEditing ? (
          <InspectorAssignedList inspectors={inspectors} assignedIds={inherited} showTitle={false} />
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <InspectorSelectionList
              inspectors={inspectors}
              selected={selected}
              onToggle={toggle}
              title={`${selected.length} të zgjedhur`}
            />
            <OptionalNoteTextarea
              id="chief-reassign-note"
              label="Shënim (opsional)"
              value={noteText}
              onChange={setNoteText}
            />
            <Button type="submit" className="w-full" disabled={selected.length === 0}>
              Ruaj ndryshimin
            </Button>
            <FormError error={error} />
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function SectorHeadAssignActions({
  applicationId,
  requiredInspectorCount,
  plannedInspectorIds,
  inspectorAssignmentLockedBy,
  availableInspectors,
  initialRequiresFieldVerification = false,
  fieldVerificationRequestedBy,
}: {
  applicationId: string;
  requiredInspectorCount?: number | null;
  plannedInspectorIds?: string[] | null;
  inspectorAssignmentLockedBy?: string | null;
  availableInspectors: FieldInspectorOptionWithWorkload[];
  initialRequiresFieldVerification?: boolean;
  fieldVerificationRequestedBy?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const inherited = plannedInspectorIds ?? [];
  const chiefLockedInspectors = inspectorAssignmentLockedBy === ROLE_CODES.CHIEF_INSPECTOR && inherited.length > 0;
  const chiefLockedVerification =
    initialRequiresFieldVerification &&
    fieldVerificationRequestedBy === ROLE_CODES.CHIEF_INSPECTOR;
  const [selected, setSelected] = useState<string[]>(inherited);
  const inspectors = normalizeInspectorOptions(availableInspectors);

  function toggle(id: string) {
    if (inherited.length > 0) return;
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
    });
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  const targetCount = inherited.length || selected.length || requiredInspectorCount;
  const verificationRequestedByLabel = fieldVerificationRequestedByLabel(fieldVerificationRequestedBy ?? null);

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className={REVIEW_ACTIONS_HEADER_CLASS}>
        <CardTitle className="workflow-section-title !text-base font-semibold leading-tight tracking-tight">Përgjegjës sektori te inspektorët</CardTitle>
        <CardDescription className="workflow-section-desc mt-1">
          {chiefLockedInspectors
            ? "Konfirmoni delegimin te inspektorët e caktuar."
            : "Zgjidhni inspektorët dhe delegoni dosjen."}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("reg-wizard-body", REVIEW_ACTIONS_SCROLL_CLASS)}>
        <form onSubmit={onSubmit} className="space-y-4">
          {chiefLockedVerification ? (
            <p className="text-sm text-muted-foreground">
              Verifikimi në terren është i detyrueshëm (kërkuar nga{" "}
              {verificationRequestedByLabel ?? "kryeinspektori"}).
            </p>
          ) : null}

          <OptionalNoteTextarea
            id="sector-note"
            label="Shënim ose udhëzim"
            value={noteText}
            onChange={setNoteText}
          />
          <InspectorSelectionList
            inspectors={inspectors}
            selected={inherited.length ? inherited : selected}
            onToggle={toggle}
            disabled={inherited.length > 0}
            lockedIds={inherited}
            title={`Inspektorët (${inherited.length || selected.length}${targetCount ? ` / ${targetCount}` : ""})`}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={!inherited.length && selected.length < 1}
          >
            {chiefLockedInspectors ? "Delego te inspektorët e caktuar" : "Delego te inspektorët"}
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
      <CardHeader className={REVIEW_ACTIONS_HEADER_CLASS}>
        <CardTitle className="workflow-section-title !text-base font-semibold leading-tight tracking-tight">
          Progresi i shqyrtimit
        </CardTitle>
        <CardDescription className="workflow-section-desc mt-0">
          {completed} nga {active.length} raporte të përfunduara
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("reg-wizard-body !pt-6", REVIEW_ACTIONS_SCROLL_CLASS)}>
        <ul className="space-y-3">
          {active.map((a) => {
            const name = `${a.inspector.firstName} ${a.inspector.lastName}`.trim();
            const done = a.status === "COMPLETED";
            return (
              <li
                key={a.id}
                className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3.5"
              >
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {done ? "Raporti u dorëzua" : "Në pritje të raportit"}
                </p>
              </li>
            );
          })}
        </ul>
        {completed === active.length && active.length > 0 ? (
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
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
      <CardHeader className={REVIEW_ACTIONS_HEADER_CLASS}>
        <CardTitle className="workflow-section-title !text-base font-semibold leading-tight tracking-tight">Përgjegjës sektori - raport</CardTitle>
        <CardDescription className="workflow-section-desc mt-1">Plotësoni raportin tuaj dhe delegoni dosjen te drejtori.</CardDescription>
      </CardHeader>
      <CardContent className={cn("reg-wizard-body", REVIEW_ACTIONS_SCROLL_CLASS)}>
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

function FieldInspectorReportActions({
  assignmentId,
  initialReportText = "",
  requiresFieldVerification = false,
}: {
  assignmentId: string;
  initialReportText?: string;
  requiresFieldVerification?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reportText, setReportText] = useState(initialReportText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReportText(initialReportText);
  }, [initialReportText]);

  async function saveDraft() {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await submitFieldReportAction(assignmentId, reportText, { submit: false });
    setSaving(false);
    if (!result.success) setError(result.error);
    else {
      setSaved(true);
      router.refresh();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await submitFieldReportAction(assignmentId, reportText, { submit: true });
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <Card className={REVIEW_ACTIONS_CARD_CLASS}>
      <CardHeader className={REVIEW_ACTIONS_HEADER_CLASS}>
        <CardTitle className="workflow-section-title !text-base font-semibold leading-tight tracking-tight">Inspektor - raport i detajuar</CardTitle>
        <CardDescription className="workflow-section-desc mt-1">
          Shqyrtoni të gjithë dokumentacionin e aplikimit (të dhënat dhe skedarët më poshtë).
          {requiresFieldVerification
            ? " Pas shqyrtimit të dosjes, kryeni edhe verifikimin në terren te «Detyrat e mia» nëse është caktuar."
            : ""}{" "}
          Më pas përgatisni raportin e detajuar dhe dërgojeni te përgjegjësi i sektorit.
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("reg-wizard-body", REVIEW_ACTIONS_SCROLL_CLASS)}>
        <form onSubmit={onSubmit} className="space-y-4">
          <ReportTextarea
            id="field-report"
            label="Raporti i detajuar i shqyrtimit *"
            value={reportText}
            onChange={(value) => {
              setReportText(value);
              setSaved(false);
            }}
          />
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" onClick={() => void saveDraft()} disabled={saving}>
              {saving ? "Duke ruajtur…" : "Ruaj si draft"}
            </Button>
            {saved ? (
              <p className="text-sm text-gov-success">Drafti u ruajt.</p>
            ) : null}
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
      <CardHeader className={cn(REVIEW_ACTIONS_HEADER_CLASS, "space-y-3 !pb-0")}>
        <div className="space-y-2">
          <CardTitle className="workflow-section-title !text-base font-semibold leading-tight tracking-tight">Vendimi final</CardTitle>
          <CardDescription className="workflow-section-desc mt-1">
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
      <CardContent className={cn("reg-wizard-body", REVIEW_ACTIONS_SCROLL_CLASS, "pt-4")}>
        {mode === "approve" && (
          <div role="tabpanel" className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Pas miratimit gjenerohen numri i regjistrit dhe certifikata.
            </p>
            {!fieldVerificationCanApprove ? (
              <p className="text-sm text-muted-foreground">
                Miratimi është bllokuar deri sa të gjithë inspektorët të përfundojnë verifikimin në terren me
                rezultat konform (PASS).
              </p>
            ) : null}
            <Button
              onClick={approve}
              disabled={!fieldVerificationCanApprove}
              className="w-full"
            >
              Mirato aplikimin
            </Button>
          </div>
        )}

        {mode === "reject" && (
          <form role="tabpanel" onSubmit={reject} className="space-y-3">
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
            <Button type="submit" variant="destructive" className="w-full">
              Refuzo aplikimin
            </Button>
          </form>
        )}

        {mode === "return" && (
          <form role="tabpanel" onSubmit={returnApp} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Dosja kthehet për korrigjim te rolet e zgjedhura.
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
            <Button type="submit" variant="outline" className="w-full">
              Kthe për korrigjim
            </Button>
          </form>
        )}

        <FormError error={error} />
        {success && <p className="text-sm text-muted-foreground">{success}</p>}
      </CardContent>
    </Card>
  );
}
