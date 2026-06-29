"use client";

import Link from "next/link";
import { formatDateSq } from "@/lib/format-date";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { FieldInspectionAssignmentStatus } from "@prisma/client";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardCheck,
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
  DataSheet,
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
import { cn } from "@/lib/utils";
import { uploadElevatorDocumentClient } from "@/lib/documents/upload-elevator-document-client";
import { COMPLIANCE_DOCUMENT_ACCEPT, COMPLIANCE_DOCUMENT_HINT } from "@/lib/constants/document-upload";

export type FieldInspectionAssignmentRow = {
  id: string;
  scheduledDate: Date;
  status: FieldInspectionAssignmentStatus;
  instructions: string | null;
  elevator: {
    id: string;
    registryNumber: string;
    buildingAddress: string | null;
    municipality: { nameSq: string } | null;
  };
  assignee: { id: string; firstName: string; lastName: string };
  assignedBy: { firstName: string; lastName: string };
  inspection: { id: string; result: string | null; conductedDate: Date | null } | null;
};

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
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function FormDivider() {
  return <div className="border-t border-border/60" role="presentation" />;
}

function selectClassName() {
  return "flex h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary/30";
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

export function FieldInspectionAssignmentsTable({
  assignments,
  canCancel,
}: {
  assignments: FieldInspectionAssignmentRow[];
  canCancel?: boolean;
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
                <Link href={`/ishmt/elevators/${a.elevator.id}`} className="portal-table-link">
                  <RegistryNumber>{a.elevator.registryNumber}</RegistryNumber>
                </Link>
                <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                  {a.elevator.buildingAddress ?? "-"} · {a.elevator.municipality?.nameSq ?? "-"}
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
                  <span className="text-sm font-semibold">
                    {INSPECTION_RESULT_LABELS[a.inspection.result] ?? a.inspection.result}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="text-right">
                {canCancel &&
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
  const [result, setResult] = useState<"PASS" | "FAIL" | "CONDITIONAL">("PASS");
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
      const reportDocumentId = await uploadElevatorDocumentClient(reportFile, assignment.elevator.id, {
        classification: "INSPECTION_REPORT",
        purpose: "EXTRAORDINARY_INSPECTION",
      });
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
    <div className="space-y-5 border-t border-border/80 bg-gradient-to-b from-gov-surface/40 to-card p-5 sm:p-6">
      <DataSheet
        columns={4}
        items={[
          {
            label: "Numri i regjistrit",
            value: assignment.elevator.registryNumber,
            mono: true,
          },
          { label: "Adresa e objektit", value: assignment.elevator.buildingAddress ?? "-" },
          { label: "Bashkia", value: assignment.elevator.municipality?.nameSq ?? "-" },
          {
            label: "Data e planifikuar",
            value: formatDateSq(assignment.scheduledDate),
          },
        ]}
      />

      {assignment.instructions && (
        <div className="portal-institutional-notice portal-institutional-notice-info">
          <div className="portal-institutional-notice-icon">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <p className="portal-institutional-notice-title">Udhëzime operative</p>
            <p className="portal-institutional-notice-body">{assignment.instructions}</p>
          </div>
        </div>
      )}

      {assignment.status === FieldInspectionAssignmentStatus.COMPLETED && assignment.inspection && (
        <div className="portal-institutional-notice portal-institutional-notice-success">
          <div className="portal-institutional-notice-icon">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <p className="portal-institutional-notice-title">Inspektimi u regjistrua</p>
            <p className="portal-institutional-notice-body">
              Rezultati:{" "}
              <strong>{INSPECTION_RESULT_LABELS[assignment.inspection.result ?? ""] ?? assignment.inspection.result}</strong>
              {assignment.inspection.conductedDate && (
                <> · Data: {formatDateSq(assignment.inspection.conductedDate)}</>
              )}
            </p>
          </div>
        </div>
      )}

      {canConduct && (
        <SectionCard title="Regjistrimi i rezultatit" subtitle="Faza 3: dokumentimi i verifikimit fizik" padded>
          <div className="space-y-5">
            {assignment.status === FieldInspectionAssignmentStatus.SCHEDULED && (
              <div className="portal-institutional-notice portal-institutional-notice-warning">
                <div className="portal-institutional-notice-icon">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                  <p className="portal-institutional-notice-body !mt-0 text-foreground">
                    Konfirmoni nisjen e detyrës para se të shkoni në objekt.
                  </p>
                  <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => void start()}>
                    Konfirmo nisjen në terren
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data e inspektimit në objekt</Label>
                <Input
                  type="date"
                  value={conductedDate}
                  onChange={(e) => setConductedDate(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Rezultati i verifikimit</Label>
                <select
                  className={selectClassName()}
                  value={result}
                  onChange={(e) => setResult(e.target.value as "PASS" | "FAIL" | "CONDITIONAL")}
                >
                  <option value="PASS">Konform</option>
                  <option value="CONDITIONAL">Me kushte</option>
                  <option value="FAIL">Jo konform</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gjetjet dhe vërejtimet</Label>
              <textarea
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-sm"
                placeholder="Përshkrim i gjendjes në objekt, mosputhje, kushte ose rekomandime…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`report-${assignment.id}`}>Raporti i inspektimit *</Label>
              <Input
                id={`report-${assignment.id}`}
                type="file"
                accept={COMPLIANCE_DOCUMENT_ACCEPT}
                onChange={(event) => setReportFile(event.target.files?.[0] ?? null)}
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">{COMPLIANCE_DOCUMENT_HINT}</p>
              {reportFile && (
                <p className="text-xs text-muted-foreground">Skedari: {reportFile.name}</p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
              <span>
                Konfirmoj se të dhënat e regjistruara pasqyrojnë gjendjen reale të verifikuar në terren dhe mbaj
                përgjegjësi për regjistrimin.
              </span>
            </label>

            <FormError error={error} />
            <Button
              type="button"
              disabled={submitting}
              className="rounded-xl font-semibold shadow-md shadow-gov-primary/15"
              onClick={() => void complete()}
            >
              {submitting ? "Duke ruajtur…" : "Ruaj rezultatin e inspektimit"}
            </Button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

export function MyFieldInspectionsList({ assignments }: { assignments: FieldInspectionAssignmentRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");

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
    if (filter === "all") return assignments;
    if (filter === "completed") {
      return assignments.filter(
        (a) =>
          a.status === FieldInspectionAssignmentStatus.COMPLETED ||
          a.status === FieldInspectionAssignmentStatus.CANCELLED,
      );
    }
    return assignments.filter(
      (a) =>
        a.status === FieldInspectionAssignmentStatus.SCHEDULED ||
        a.status === FieldInspectionAssignmentStatus.IN_PROGRESS,
    );
  }, [assignments, filter]);

  if (assignments.length === 0) {
    return (
      <PortalEmptyState>
        Nuk keni detyra të caktuara. Caktimet bëhen nga shefi i sektorit, drejtori ose kryeinspektori ISHMT.
      </PortalEmptyState>
    );
  }

  const tabs = [
    { id: "active" as const, label: "Aktive" },
    { id: "completed" as const, label: "Përfunduar / anuluar" },
    { id: "all" as const, label: "Të gjitha" },
  ];

  return (
    <div className="space-y-4">
      <PortalTabBar tabs={tabs} active={filter} onChange={setFilter} counts={counts} />

      {filtered.length === 0 ? (
        <PortalEmptyState>Nuk ka detyra në këtë kategori.</PortalEmptyState>
      ) : (
        <div className="portal-surface overflow-hidden">
          <PortalTableWrap>
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>Regjistri</th>
                <th>Vendndodhja</th>
                <th>Data</th>
                <th>Statusi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, index) => (
                <Fragment key={a.id}>
                  <tr>
                    <td className="tabular-nums text-muted-foreground">{index + 1}</td>
                    <td>
                      <Link href={`/ishmt/elevators/${a.elevator.id}`} className="portal-table-link">
                        <RegistryNumber>{a.elevator.registryNumber}</RegistryNumber>
                      </Link>
                    </td>
                    <td className="max-w-[14rem] text-muted-foreground">
                      <span className="line-clamp-2">
                        {a.elevator.buildingAddress ?? "-"} · {a.elevator.municipality?.nameSq ?? "-"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap tabular-nums">
                      {formatDateSq(a.scheduledDate)}
                    </td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="text-right">
                      <Button
                        type="button"
                        variant={expandedId === a.id ? "default" : "outline"}
                        size="sm"
                        className={cn("rounded-lg text-xs", expandedId === a.id && "shadow-sm")}
                        onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      >
                        {expandedId === a.id ? "Mbyll dosjen" : "Hap dosjen"}
                      </Button>
                    </td>
                  </tr>
                  {expandedId === a.id && (
                    <tr>
                      <td colSpan={6} className="!p-0">
                        <ConductInspectionPanel assignment={a} onDone={() => setExpandedId(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </PortalTableWrap>
          <OfficialTableFooter total={filtered.length} label="detyra" />
        </div>
      )}
    </div>
  );
}
