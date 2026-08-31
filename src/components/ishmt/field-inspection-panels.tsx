"use client";

import Link from "next/link";
import { formatDateSq } from "@/lib/format-date";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useMemo, useState } from "react";
import { FieldInspectionAssignmentStatus } from "@prisma/client";
import {
  Ban,
  CheckCircle2,
  Download,
  FileText,
  MapPin,
  Search,
} from "lucide-react";
import {
  assignFieldInspectionAction,
  cancelFieldInspectionAction,
  completeFieldInspectionAction,
  lookupElevatorForFieldInspectionAction,
  startFieldInspectionAction,
} from "@/lib/actions/field-inspection-actions";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { MetricCard } from "@/components/shared/metric-card";
import {
  OfficialTableFooter,
  PortalTabBar,
  RegistryNumber,
  SectionCard,
} from "@/components/shared/institutional";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FIELD_INSPECTION_STATUS_LABELS,
  FIELD_INSPECTION_STATUS_TONE,
  INSPECTION_RESULT_LABELS,
} from "@/lib/ishmt/field-inspection-labels";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import type { FieldInspectorOption } from "@/lib/services/ishmt-field-inspection-service";
import type { StatusTone } from "@/lib/registration/status-presentation";
import { isChiefLockedFieldVerification } from "@/lib/services/application-field-verification";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import { uploadEntityDocumentClient } from "@/lib/documents/upload-entity-document-client";
import { COMPLIANCE_DOCUMENT_ACCEPT, COMPLIANCE_DOCUMENT_HINT } from "@/lib/constants/document-upload";

export type FieldInspectionAssignmentRow = {
  id: string;
  scheduledDate: Date;
  status: FieldInspectionAssignmentStatus;
  instructions: string | null;
  application: {
    id: string;
    applicationNumber: string;
    inspectorAssignmentLockedBy?: string | null;
    fieldVerificationRequestedBy?: string | null;
    data: {
      buildingAddress: string | null;
      municipality: { nameSq: string } | null;
    } | null;
  } | null;
  elevator: {
    id: string;
    registryNumber: string;
    buildingAddress: string | null;
    municipality: { nameSq: string } | null;
  } | null;
  assignee: { id: string; firstName: string; lastName: string };
  assignedBy: { firstName: string; lastName: string };
  inspection: {
    id: string;
    result: string | null;
    conductedDate: Date | null;
    findings: string | null;
    reportDocumentId: string | null;
    reportDocument: { id: string; originalFilename: string } | null;
  } | null;
  reportDocument?: { id: string; originalFilename: string } | null;
  verificationResult?: string | null;
  verificationFindings?: string | null;
  conductedDate?: Date | null;
};

function assignmentLabel(a: FieldInspectionAssignmentRow) {
  if (a.elevator) return a.elevator.registryNumber;
  if (a.application) return a.application.applicationNumber;
  return "-";
}

function assignmentAddress(a: FieldInspectionAssignmentRow) {
  const address = a.elevator?.buildingAddress ?? a.application?.data?.buildingAddress ?? "-";
  const municipality =
    a.elevator?.municipality?.nameSq ?? a.application?.data?.municipality?.nameSq ?? "-";
  return `${address} · ${municipality}`;
}

function assignmentDetailHref(a: FieldInspectionAssignmentRow) {
  if (a.elevator) return `/ishmt/elevators/${a.elevator.id}`;
  if (a.application) return `/ishmt/review/${a.application.id}`;
  return null;
}

function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      {error}
    </p>
  );
}

function StatusBadge({ status }: { status: FieldInspectionAssignmentStatus }) {
  return (
    <WorkflowStatusChip
      label={FIELD_INSPECTION_STATUS_LABELS[status]}
      tone={FIELD_INSPECTION_STATUS_TONE[status]}
    />
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="reg-wizard-subsection">
      <p className="reg-wizard-subsection-title">{title}</p>
      {children}
    </div>
  );
}

function FormDivider() {
  return <div className="border-t border-border/60" role="presentation" />;
}

function selectClassName() {
  return "reg-wizard-select";
}

function inspectionResultTone(result: string | null | undefined): StatusTone {
  if (result === "PASS") return "done";
  if (result === "FAIL") return "danger";
  if (result === "CONDITIONAL") return "waiting";
  return "neutral";
}

function AssignmentStatusCell({ assignment }: { assignment: FieldInspectionAssignmentRow }) {
  const result =
    assignment.inspection?.result ??
    assignment.verificationResult ??
    null;
  if (
    assignment.status === FieldInspectionAssignmentStatus.COMPLETED &&
    result
  ) {
    const resultLabel = INSPECTION_RESULT_LABELS[result] ?? result;
    return (
      <WorkflowStatusChip label={resultLabel} tone={inspectionResultTone(result)} />
    );
  }
  return <StatusBadge status={assignment.status} />;
}

function assignmentDisplayDate(assignment: FieldInspectionAssignmentRow) {
  if (
    assignment.status === FieldInspectionAssignmentStatus.COMPLETED &&
    (assignment.inspection?.conductedDate || assignment.conductedDate)
  ) {
    return formatDateSq(assignment.inspection?.conductedDate ?? assignment.conductedDate!);
  }
  return formatDateSq(assignment.scheduledDate);
}

function CompletedInspectionSummary({
  inspection,
  assignment,
}: {
  inspection?: NonNullable<FieldInspectionAssignmentRow["inspection"]> | null;
  assignment?: FieldInspectionAssignmentRow;
}) {
  const findings = inspection?.findings ?? assignment?.verificationFindings ?? null;
  const reportDocument =
    inspection?.reportDocument ??
    assignment?.reportDocument ??
    null;
  const reportDocumentId = inspection?.reportDocumentId ?? assignment?.reportDocument?.id ?? null;

  return (
    <div className="reg-dossier-block">
      {findings && (
        <div className="reg-dossier-section">
          <p className="text-xs font-medium text-muted-foreground">Vërejtje</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground">{findings}</p>
        </div>
      )}

      <div className="reg-dossier-section flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <p className="truncate text-sm font-medium text-foreground">
            {reportDocument?.originalFilename ?? "Pa raport"}
          </p>
        </div>
        {reportDocumentId && (
          <Button asChild size="sm" variant="outline" className="h-9 shrink-0 rounded-lg px-3 text-xs">
            <a href={`/api/documents/${reportDocumentId}/download`}>
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Shkarko
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export function FieldInspectionSummaryCards({
  summary,
}: {
  summary: { total: number; scheduled: number; inProgress: number; completed: number; cancelled: number };
}) {
  return (
    <div className="portal-kpi-grid">
      <MetricCard label="Gjithsej" value={summary.total} accent="primary" />
      <MetricCard label="Të planifikuara" value={summary.scheduled} accent="primary" />
      <MetricCard label="Në terren" value={summary.inProgress} accent="warning" />
      <MetricCard label="Përfunduar" value={summary.completed} accent="success" />
    </div>
  );
}

export function FieldInspectionAssignForm({
  inspectors,
}: {
  inspectors: FieldInspectorOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [elevatorId, setElevatorId] = useState<string | null>(null);
  const [elevatorLabel, setElevatorLabel] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function lookup(registryNumber: string) {
    setLookingUp(true);
    setLookupError(null);
    const result = await lookupElevatorForFieldInspectionAction(registryNumber);
    setLookingUp(false);
    if (!result.success) {
      setLookupError(result.error);
      setElevatorId(null);
      setElevatorLabel(null);
      return;
    }
    if (!result.data) {
      setLookupError("Ashensori nuk u gjet në regjistrin kombëtar.");
      setElevatorId(null);
      setElevatorLabel(null);
      return;
    }
    setElevatorId(result.data.id);
    setElevatorLabel(
      `${result.data.registryNumber} · ${result.data.buildingAddress ?? "-"} · ${result.data.municipality?.nameSq ?? "-"}`,
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!elevatorId) {
      setError("Verifikoni ashensorin para caktimit.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData(form);
    const result = await assignFieldInspectionAction({
      elevatorId,
      assigneeId: String(fd.get("assigneeId")),
      scheduledDate: String(fd.get("scheduledDate")),
      instructions: String(fd.get("instructions") || ""),
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError(null);
    form.reset();
    setElevatorId(null);
    setElevatorLabel(null);
    router.refresh();
  }

  return (
    <SectionCard title="Caktim i ri" padded>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormSection title="Ashensori">
          <div className="space-y-2">
            <Label htmlFor="registryNumber">Numri i regjistrit</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="registryNumber"
                name="registryNumber"
                placeholder="000901 TR"
                className="h-10 rounded-lg border-border/80 font-mono"
                required
              />
              <Button
                type="button"
                variant="outline"
                disabled={lookingUp}
                className="h-10 shrink-0 rounded-lg px-4"
                onClick={() => {
                  const input = document.getElementById("registryNumber") as HTMLInputElement | null;
                  if (input?.value) void lookup(input.value);
                }}
              >
                <Search className="mr-2 h-4 w-4" />
                {lookingUp ? "Duke kërkuar…" : "Kërko"}
              </Button>
            </div>
            {elevatorLabel && (
              <div className="flex items-start gap-2 rounded-lg border border-gov-success/25 bg-gov-success/[0.04] px-3 py-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gov-success" />
                <span className="text-foreground">{elevatorLabel}</span>
              </div>
            )}
            <FormError error={lookupError} />
          </div>
        </FormSection>

        <FormDivider />

        <FormSection title="Caktimi">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assigneeId">Inspektor</Label>
              <select id="assigneeId" name="assigneeId" required className={selectClassName()} disabled={!elevatorId}>
                <option value="">Zgjidhni</option>
                {inspectors.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.firstName} {i.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledDate">Data</Label>
              <Input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                required
                disabled={!elevatorId}
                className="h-10 rounded-lg border-border/80"
              />
            </div>
          </div>
        </FormSection>

        <FormDivider />

        <FormSection title="Udhëzime">
          <textarea
            id="instructions"
            name="instructions"
            rows={3}
            disabled={!elevatorId}
            placeholder="Opsionale"
            className="w-full rounded-lg border border-border/80 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </FormSection>

        <div className="space-y-3 border-t border-border/60 pt-4">
          <FormError error={error} />
          <div className="flex justify-end">
            <Button type="submit" disabled={submitting || !elevatorId} className="h-10 rounded-lg px-5 font-semibold">
              {submitting ? "Duke caktuar…" : "Cakto"}
            </Button>
          </div>
        </div>
      </form>
    </SectionCard>
  );
}

function CancelAssignmentDialog({
  onConfirm,
  onClose,
}: {
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="portal-institutional-notice portal-institutional-notice-warning">
      <div className="portal-institutional-notice-icon">
        <Ban className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="portal-institutional-notice-title">Anulimi i caktimit</p>
          <p className="portal-institutional-notice-body">
            Veprimi regjistrohet në audit trail. Inspektori do të njoftohet me arsyen e anulimit.
          </p>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm"
          placeholder="Arsyeja e anulimit (e detyrueshme)"
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={onClose}>
            Mbyll
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="rounded-lg"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            Konfirmo anulimin
          </Button>
        </div>
      </div>
    </div>
  );
}

function canCancelFieldInspectionAssignment(
  assignment: FieldInspectionAssignmentRow,
  roleCode: RoleCode,
  globalCanCancel: boolean,
): boolean {
  if (!globalCanCancel) return false;
  if (assignment.application && isChiefLockedFieldVerification(assignment.application)) {
    return roleCode === ROLE_CODES.CHIEF_INSPECTOR || roleCode === ROLE_CODES.ADMIN;
  }
  return true;
}

export function FieldInspectionAssignmentsTable({
  assignments,
  canCancel,
  roleCode,
}: {
  assignments: FieldInspectionAssignmentRow[];
  canCancel?: boolean;
  roleCode: RoleCode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  async function cancel(id: string, reason: string) {
    const result = await cancelFieldInspectionAction(id, reason);
    if (!result.success) setError(result.error);
    else {
      setCancelId(null);
      router.refresh();
    }
  }

  if (assignments.length === 0) {
    return (
      <PortalEmptyState>Nuk ka caktimet.</PortalEmptyState>
    );
  }

  return (
    <div>
      <FormError error={error} />
      <PortalTableWrap>
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Regjistri / Vendndodhja</th>
            <th>Data</th>
            <th>Inspektori</th>
            <th>Statusi</th>
            <th>Caktuar nga</th>
            <th>Rezultati</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((a, index) => (
            <tr key={a.id}>
              <td className="tabular-nums text-muted-foreground">{index + 1}</td>
              <td>
                {assignmentDetailHref(a) ? (
                  <Link href={assignmentDetailHref(a)!} className="portal-table-link">
                    <RegistryNumber>{assignmentLabel(a)}</RegistryNumber>
                  </Link>
                ) : (
                  <RegistryNumber>{assignmentLabel(a)}</RegistryNumber>
                )}
                <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                  {assignmentAddress(a)}
                </p>
                {a.instructions && (
                  <p className="mt-1.5 rounded-lg bg-muted/40 px-2 py-1 text-xs italic text-muted-foreground">
                    {a.instructions}
                  </p>
                )}
              </td>
              <td className="whitespace-nowrap tabular-nums">
                {formatDateSq(a.scheduledDate)}
              </td>
              <td>
                {a.assignee.firstName} {a.assignee.lastName}
              </td>
              <td>
                <StatusBadge status={a.status} />
              </td>
              <td className="text-muted-foreground">
                {a.assignedBy.firstName} {a.assignedBy.lastName}
              </td>
              <td>
                {a.inspection?.result ? (
                  <div className="space-y-1">
                    <span className="text-sm font-semibold">
                      {INSPECTION_RESULT_LABELS[a.inspection.result] ?? a.inspection.result}
                    </span>
                    {a.inspection.reportDocumentId && (
                      <a
                        href={`/api/documents/${a.inspection.reportDocumentId}/download`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-gov-primary hover:underline"
                      >
                        <Download className="h-3 w-3 shrink-0" aria-hidden />
                        Raporti
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="text-right">
                {canCancelFieldInspectionAssignment(a, roleCode, Boolean(canCancel)) &&
                  (a.status === FieldInspectionAssignmentStatus.SCHEDULED ||
                    a.status === FieldInspectionAssignmentStatus.IN_PROGRESS) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => setCancelId(a.id)}
                    >
                      Anulo
                    </Button>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </PortalTableWrap>
      <OfficialTableFooter total={assignments.length} label="caktimet" />
      {cancelId && (
        <div className="border-t border-border/60 p-4 sm:p-5">
          <CancelAssignmentDialog
            onClose={() => setCancelId(null)}
            onConfirm={(reason) => void cancel(cancelId, reason)}
          />
        </div>
      )}
    </div>
  );
}

function FieldInspectionResultPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: "PASS" | "FAIL";
  onChange: (value: "PASS" | "FAIL") => void;
}) {
  const options: { value: "PASS" | "FAIL"; label: string; hint: string; tone: string }[] = [
    {
      value: "PASS",
      label: "Konform",
      hint: "Gjendja në objekt përputhet me dokumentacionin.",
      tone: "border-emerald-200/80 bg-emerald-50/40 hover:bg-emerald-50/70",
    },
    {
      value: "FAIL",
      label: "Jo konform",
      hint: "Mospërputhje ose mangësi që kërkojnë ndërhyrje.",
      tone: "border-red-200/80 bg-red-50/40 hover:bg-red-50/70",
    },
  ];

  return (
    <div className="space-y-2">
      <Label>Rezultati i verifikimit</Label>
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby={`${id}-label`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-xl border px-4 py-3.5 transition-all",
                selected
                  ? "border-gov-primary bg-gov-primary/[0.05] ring-1 ring-gov-primary/25 shadow-sm"
                  : cn("border-border/70 bg-muted/10", option.tone),
              )}
            >
              <input
                type="radio"
                name={id}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <p className="text-sm font-semibold text-foreground">{option.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.hint}</p>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ConductInspectionPanel({
  assignment,
  onDone,
}: {
  assignment: FieldInspectionAssignmentRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [conductedDate, setConductedDate] = useState("");
  const [result, setResult] = useState<"PASS" | "FAIL">("PASS");
  const [findings, setFindings] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function start() {
    const res = await startFieldInspectionAction(assignment.id);
    if (!res.success) setError(res.error);
    else router.refresh();
  }

  async function complete() {
    if (!conductedDate) {
      setError("Vendosni datën e inspektimit në terren.");
      return;
    }
    if (!confirmed) {
      setError("Konfirmoni saktësinë e të dhënave para ruajtjes.");
      return;
    }
    if (!reportFile) {
      setError("Ngarkoni raportin e inspektimit (PDF).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let reportDocumentId: string;
      if (assignment.elevator) {
        reportDocumentId = await uploadEntityDocumentClient(
          reportFile,
          "elevator",
          assignment.elevator.id,
          { classification: "INSPECTION_REPORT", purpose: "EXTRAORDINARY_INSPECTION" },
        );
      } else if (assignment.application) {
        reportDocumentId = await uploadEntityDocumentClient(
          reportFile,
          "application",
          assignment.application.id,
          { classification: "INSPECTION_REPORT", purpose: "FIELD_VERIFICATION_REPORT" },
        );
      } else {
        throw new Error("Caktimi nuk lidhet me ashensor ose aplikim.");
      }
      const res = await completeFieldInspectionAction(assignment.id, {
        conductedDate,
        result,
        findings,
        reportDocumentId,
      });
      if (!res.success) setError(res.error);
      else {
        onDone();
        router.refresh();
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Ngarkimi i dokumentit dështoi.");
    } finally {
      setSubmitting(false);
    }
  }

  const canConduct =
    assignment.status === FieldInspectionAssignmentStatus.SCHEDULED ||
    assignment.status === FieldInspectionAssignmentStatus.IN_PROGRESS;

  return (
    <div className="border-t border-border/60 bg-muted/5 px-4 py-5 sm:px-6 sm:py-6">
      {assignment.instructions && canConduct ? (
        <div className="mb-5 rounded-xl border border-amber-200/70 bg-amber-50/50 px-4 py-3.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/80">Udhëzime</p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {assignment.instructions}
          </p>
        </div>
      ) : null}

      {assignment.status === FieldInspectionAssignmentStatus.COMPLETED &&
        (assignment.inspection || assignment.verificationResult) && (
        <CompletedInspectionSummary inspection={assignment.inspection} assignment={assignment} />
      )}

      {canConduct ? (
        <div className="reg-wizard-panel overflow-hidden">
          <div className="border-b border-border/60 bg-muted/20 px-4 py-3.5 sm:px-5">
            <p className="text-sm font-semibold text-foreground">Regjistrimi i verifikimit</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Plotësoni të dhënat pas inspektimit në objekt.
            </p>
          </div>
          <div className="reg-wizard-body space-y-5">
            {assignment.status === FieldInspectionAssignmentStatus.SCHEDULED && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3.5">
                <p className="text-sm text-muted-foreground">
                  Konfirmoni nisjen para shkimit në objekt.
                </p>
                <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => void start()}>
                  Nis në terren
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`conducted-${assignment.id}`}>Data e inspektimit</Label>
              <Input
                id={`conducted-${assignment.id}`}
                type="date"
                value={conductedDate}
                onChange={(e) => setConductedDate(e.target.value)}
                className="h-10 max-w-xs rounded-lg"
              />
            </div>

            <FieldInspectionResultPicker
              id={`result-${assignment.id}`}
              value={result}
              onChange={setResult}
            />

            <div className="space-y-1.5">
              <Label htmlFor={`findings-${assignment.id}`}>Vërejtje</Label>
              <textarea
                id={`findings-${assignment.id}`}
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border/80 bg-background px-3 py-2.5 text-sm"
                placeholder="Gjendja në objekt, mospërputhje, rekomandime…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`report-${assignment.id}`}>
                Raporti i inspektimit <span className="text-destructive">*</span>
              </Label>
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-4">
                <Input
                  id={`report-${assignment.id}`}
                  type="file"
                  accept={COMPLIANCE_DOCUMENT_ACCEPT}
                  onChange={(event) => setReportFile(event.target.files?.[0] ?? null)}
                  className="h-10 rounded-lg border-0 bg-background text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gov-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                <p className="mt-2 text-xs text-muted-foreground">{COMPLIANCE_DOCUMENT_HINT}</p>
                {reportFile ? (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-gov-primary" aria-hidden />
                    {reportFile.name}
                  </p>
                ) : null}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-muted/15 px-4 py-3.5 text-sm">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span className="leading-relaxed text-muted-foreground">
                Konfirmoj saktësinë e të dhënave dhe mbaj përgjegjësi për regjistrimin.
              </span>
            </label>

            <FormError error={error} />
            <div className="flex justify-end border-t border-border/60 pt-4">
              <Button
                type="button"
                disabled={submitting || assignment.status === FieldInspectionAssignmentStatus.SCHEDULED}
                className="h-10 rounded-lg px-6 text-sm font-semibold"
                onClick={() => void complete()}
              >
                {submitting ? "Duke ruajtur…" : "Ruaj rezultatin"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MyFieldInspectionsList({
  assignments,
  highlightApplicationId = null,
}: {
  assignments: FieldInspectionAssignmentRow[];
  highlightApplicationId?: string | null;
}) {
  const highlightedAssignment = useMemo(() => {
    if (!highlightApplicationId) return null;
    return (
      assignments.find((a) => a.application?.id === highlightApplicationId) ?? null
    );
  }, [assignments, highlightApplicationId]);

  const [expandedId, setExpandedId] = useState<string | null>(highlightedAssignment?.id ?? null);
  const [filter, setFilter] = useState<"active" | "completed" | "all">(
    highlightedAssignment &&
      (highlightedAssignment.status === FieldInspectionAssignmentStatus.SCHEDULED ||
        highlightedAssignment.status === FieldInspectionAssignmentStatus.IN_PROGRESS)
      ? "active"
      : "active",
  );

  useEffect(() => {
    if (highlightedAssignment) {
      setExpandedId(highlightedAssignment.id);
    }
  }, [highlightedAssignment]);

  const counts = useMemo(
    () => ({
      active: assignments.filter(
        (a) =>
          a.status === FieldInspectionAssignmentStatus.SCHEDULED ||
          a.status === FieldInspectionAssignmentStatus.IN_PROGRESS,
      ).length,
      completed: assignments.filter(
        (a) =>
          a.status === FieldInspectionAssignmentStatus.COMPLETED ||
          a.status === FieldInspectionAssignmentStatus.CANCELLED,
      ).length,
      all: assignments.length,
    }),
    [assignments],
  );

  const filtered = useMemo(() => {
    let rows = assignments;
    if (filter === "completed") {
      rows = assignments.filter(
        (a) =>
          a.status === FieldInspectionAssignmentStatus.COMPLETED ||
          a.status === FieldInspectionAssignmentStatus.CANCELLED,
      );
    } else if (filter === "active") {
      rows = assignments.filter(
        (a) =>
          a.status === FieldInspectionAssignmentStatus.SCHEDULED ||
          a.status === FieldInspectionAssignmentStatus.IN_PROGRESS,
      );
    }
    if (highlightApplicationId) {
      const match = rows.filter((a) => a.application?.id === highlightApplicationId);
      if (match.length > 0) return match;
    }
    return rows;
  }, [assignments, filter, highlightApplicationId]);

  if (assignments.length === 0) {
    return (
      <div className="px-4 py-10 sm:px-6">
        <PortalEmptyState>
          Nuk keni detyra të caktuara. Caktimet bëhen nga shefi i sektorit, drejtori ose kryeinspektori IQMT.
        </PortalEmptyState>
      </div>
    );
  }

  const tabs = [
    { id: "active" as const, label: "Aktive" },
    { id: "completed" as const, label: "Përfunduar" },
    { id: "all" as const, label: "Të gjitha" },
  ];

  return (
    <div>
      <div className="border-b border-border/60 px-4 py-4 sm:px-6">
        <PortalTabBar tabs={tabs} active={filter} onChange={setFilter} counts={counts} />
      </div>

      {filtered.length === 0 ? (
        <div className="px-4 py-10 sm:px-6">
          <PortalEmptyState>Nuk ka detyra në këtë kategori.</PortalEmptyState>
        </div>
      ) : (
        <div className="space-y-3 px-4 py-4 sm:px-6">
          {filtered.map((assignment, index) => {
            const expanded = expandedId === assignment.id;
            const detailHref = assignmentDetailHref(assignment);
            const isActive =
              assignment.status === FieldInspectionAssignmentStatus.SCHEDULED ||
              assignment.status === FieldInspectionAssignmentStatus.IN_PROGRESS;

            return (
              <article
                key={assignment.id}
                className={cn(
                  "overflow-hidden rounded-xl border bg-card transition-all",
                  expanded
                    ? "border-gov-primary/30 shadow-sm ring-1 ring-gov-primary/10"
                    : "border-border/70 hover:border-border",
                )}
              >
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gov-primary/10 text-sm font-semibold tabular-nums text-gov-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {detailHref ? (
                          <Link href={detailHref} className="portal-table-link">
                            <RegistryNumber>{assignmentLabel(assignment)}</RegistryNumber>
                          </Link>
                        ) : (
                          <RegistryNumber>{assignmentLabel(assignment)}</RegistryNumber>
                        )}
                        <AssignmentStatusCell assignment={assignment} />
                      </div>
                      <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="line-clamp-2">{assignmentAddress(assignment)}</span>
                      </p>
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {assignment.status === FieldInspectionAssignmentStatus.COMPLETED
                          ? "Inspektuar"
                          : "Planifikuar"}
                        {": "}
                        {assignmentDisplayDate(assignment)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={expanded ? "secondary" : isActive ? "default" : "outline"}
                    size="sm"
                    className="h-9 shrink-0 rounded-lg px-4 text-xs font-semibold"
                    onClick={() => setExpandedId(expanded ? null : assignment.id)}
                  >
                    {expanded
                      ? "Mbyll"
                      : assignment.status === FieldInspectionAssignmentStatus.COMPLETED
                        ? "Shiko"
                        : "Hap detyrën"}
                  </Button>
                </div>
                {expanded ? (
                  <ConductInspectionPanel
                    assignment={assignment}
                    onDone={() => setExpandedId(null)}
                  />
                ) : null}
              </article>
            );
          })}
          <OfficialTableFooter total={filtered.length} label="detyra" />
        </div>
      )}
    </div>
  );
}
