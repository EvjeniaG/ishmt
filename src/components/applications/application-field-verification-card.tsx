"use client";

import { FieldInspectionAssignmentStatus, InspectionResult } from "@prisma/client";
import { roleLabelSq } from "@/lib/permissions/ishmt-roles";
import type { RoleCode } from "@/lib/constants/roles";
import { FIELD_INSPECTION_STATUS_LABELS, INSPECTION_RESULT_LABELS } from "@/lib/ishmt/field-inspection-labels";
import { formatDateSq } from "@/lib/format-date";
import Link from "next/link";

export function ApplicationFieldVerificationCard({
  status,
  tasksHref,
}: {
  status: {
    required: boolean;
    requestedBy: string | null;
    canApprove: boolean;
    requiredInspectorCount?: number;
    completedCount?: number;
    completedPassCount?: number;
    assignments: {
      id: string;
      status: FieldInspectionAssignmentStatus;
      assigneeName: string;
      result: InspectionResult | null;
      conductedDate: Date | null;
      pendingAssignment?: boolean;
    }[];
  };
  tasksHref?: string | null;
}) {
  if (!status.required) return null;

  const requestedBy = status.requestedBy ? roleLabelSq(status.requestedBy as RoleCode) : null;
  const requiredCount = status.requiredInspectorCount ?? status.assignments.length;
  const completedCount = status.completedCount ?? 0;

  return (
    <section className="workflow-section">
      <div className="workflow-section-header">
        <h2 className="workflow-section-title">Verifikim në terren</h2>
        {requestedBy ? (
          <p className="workflow-section-desc">Kërkuar nga {requestedBy}.</p>
        ) : null}
        {requiredCount > 0 ? (
          <p className="workflow-section-desc mt-1">
            Çdo inspektor i caktuar duhet të përfundojë verifikimin në terren ({completedCount}/
            {requiredCount}). Kryeinspektori shqyrton rezultatet dhe mund ta kthejë aplikimin nëse
            nuk janë konforme.
          </p>
        ) : null}
      </div>
      <div className="workflow-section-body">
        {status.assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Në pritje të caktimit të inspektorëve për verifikimin në terren.
          </p>
        ) : (
          <ul className="space-y-2">
            {status.assignments.map((a) => (
              <li key={a.id} className="workflow-data-cell">
                <p className="workflow-data-label">{a.assigneeName}</p>
                <p className="workflow-data-value">
                  {a.pendingAssignment
                    ? "Pa caktim"
                    : FIELD_INSPECTION_STATUS_LABELS[a.status]}
                  {!a.pendingAssignment && a.result
                    ? ` · ${INSPECTION_RESULT_LABELS[a.result] ?? a.result}`
                    : ""}
                  {a.conductedDate ? ` · ${formatDateSq(a.conductedDate)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}

        {tasksHref ? (
          <p className="mt-4 text-sm">
            <Link href={tasksHref} className="text-gov-primary hover:underline">
              Detyrat e inspektimit në terren →
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
