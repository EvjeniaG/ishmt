"use client";

import Link from "next/link";
import { ClipboardCheck, ClipboardList, MapPin } from "lucide-react";
import { ApplicationFieldReviewAssignmentStatus, FieldInspectionAssignmentStatus } from "@prisma/client";
import { WorkflowSection } from "@/components/applications/workflow-section";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import {
  FIELD_INSPECTION_STATUS_LABELS,
  INSPECTION_RESULT_LABELS,
} from "@/lib/ishmt/field-inspection-labels";
import { formatDateSq } from "@/lib/format-date";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function TaskCard({
  icon: Icon,
  title,
  description,
  statusLabel,
  statusTone,
  meta,
  action,
  highlight = false,
}: {
  icon: typeof ClipboardList;
  title: string;
  description: string;
  statusLabel: string;
  statusTone: "done" | "waiting" | "danger" | "neutral";
  meta?: string;
  action?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-4 sm:px-5 sm:py-5",
        highlight
          ? "border-gov-primary/25 bg-gov-primary/[0.04]"
          : "border-border/70 bg-muted/15",
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-gov-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <WorkflowStatusChip label={statusLabel} tone={statusTone} />
          </div>
          {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
          {action ? <div className="pt-1">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function InspectorDossierTasksPanel({
  applicationId,
  requiresFieldVerification,
  documentReview,
  fieldInspection,
}: {
  applicationId: string;
  requiresFieldVerification: boolean;
  documentReview: {
    assignmentId: string;
    status: ApplicationFieldReviewAssignmentStatus;
    completedAt: Date | null;
  } | null;
  fieldInspection: {
    id: string;
    status: FieldInspectionAssignmentStatus;
    scheduledDate: Date;
    verificationResult: string | null;
  } | null;
}) {
  if (!documentReview && !fieldInspection && !requiresFieldVerification) {
    return null;
  }

  const documentPending =
    documentReview?.status === ApplicationFieldReviewAssignmentStatus.PENDING;
  const documentDone =
    documentReview?.status === ApplicationFieldReviewAssignmentStatus.COMPLETED;
  const fieldPending =
    fieldInspection &&
    (fieldInspection.status === FieldInspectionAssignmentStatus.SCHEDULED ||
      fieldInspection.status === FieldInspectionAssignmentStatus.IN_PROGRESS);
  const fieldDone = fieldInspection?.status === FieldInspectionAssignmentStatus.COMPLETED;

  return (
    <WorkflowSection
      title="Detyrat tuaja në këtë dosje"
      description="Shqyrtoni dokumentacionin dhe kryeni verifikimin në terren nëse kërkohet."
    >
      <div className="space-y-3">
        {documentReview ? (
          <TaskCard
            icon={ClipboardList}
            title="Shqyrtim i dokumentacionit"
            description="Verifikoni përputhjen e të dhënave dhe përgatisni raportin e detajuar."
            statusLabel={documentPending ? "Në pritje" : "Përfunduar"}
            statusTone={documentPending ? "waiting" : "done"}
            meta={
              documentDone && documentReview.completedAt
                ? `Raporti u dorëzua më ${formatDateSq(documentReview.completedAt)}`
                : undefined
            }
            highlight={documentPending}
            action={
              documentPending ? (
                <p className="text-xs text-muted-foreground">
                  Plotësoni raportin nga paneli i veprimit në të djathtë.
                </p>
              ) : null
            }
          />
        ) : null}

        {requiresFieldVerification ? (
          fieldInspection ? (
            <TaskCard
              icon={MapPin}
              title="Verifikim në terren"
              description="Vizitoni objektin, verifikoni gjendjen reale dhe ngarkoni raportin e inspektimit."
              statusLabel={
                fieldDone && fieldInspection.verificationResult
                  ? INSPECTION_RESULT_LABELS[fieldInspection.verificationResult] ??
                    fieldInspection.verificationResult
                  : FIELD_INSPECTION_STATUS_LABELS[fieldInspection.status]
              }
              statusTone={
                fieldDone
                  ? fieldInspection.verificationResult === "PASS"
                    ? "done"
                    : fieldInspection.verificationResult === "FAIL"
                      ? "danger"
                      : "waiting"
                  : fieldInspection.status === FieldInspectionAssignmentStatus.IN_PROGRESS
                    ? "waiting"
                    : "neutral"
              }
              meta={`Afati i planifikuar: ${formatDateSq(fieldInspection.scheduledDate)}`}
              highlight={Boolean(fieldPending)}
              action={
                fieldPending ? (
                  <Button asChild size="sm" variant="outline" className="h-9 rounded-lg">
                    <Link href={`/ishmt/my-field-inspections?applicationId=${applicationId}`}>
                      <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden />
                      Hap detyrën në terren
                    </Link>
                  </Button>
                ) : null
              }
            />
          ) : (
            <TaskCard
              icon={MapPin}
              title="Verifikim në terren"
              description="Kjo dosje kërkon verifikim në objekt. Detyra do të shfaqet te «Detyrat e mia në terren» pas caktimit."
              statusLabel="Në pritje"
              statusTone="waiting"
            />
          )
        ) : null}
      </div>
    </WorkflowSection>
  );
}
