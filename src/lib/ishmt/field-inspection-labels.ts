import { FieldInspectionAssignmentStatus } from "@prisma/client";
import type { StatusTone } from "@/lib/registration/status-presentation";

export const FIELD_INSPECTION_STATUS_LABELS: Record<FieldInspectionAssignmentStatus, string> = {
  SCHEDULED: "E planifikuar",
  IN_PROGRESS: "Në terren",
  COMPLETED: "Përfunduar",
  CANCELLED: "Anuluar",
};

export const FIELD_INSPECTION_STATUS_TONE: Record<FieldInspectionAssignmentStatus, StatusTone> = {
  SCHEDULED: "action",
  IN_PROGRESS: "waiting",
  COMPLETED: "done",
  CANCELLED: "danger",
};

/** @deprecated Përdorni FIELD_INSPECTION_STATUS_TONE me WorkflowStatusChip */
export const FIELD_INSPECTION_STATUS_BADGE: Record<FieldInspectionAssignmentStatus, string> = {
  SCHEDULED: "workflow-status-action",
  IN_PROGRESS: "workflow-status-waiting",
  COMPLETED: "workflow-status-done",
  CANCELLED: "workflow-status-danger",
};

export const INSPECTION_RESULT_LABELS: Record<string, string> = {
  PASS: "Konform",
  FAIL: "Jo konform",
  CONDITIONAL: "Me kushte",
  PENDING: "Në pritje",
};

export type FieldInspectionAssignmentSummary = {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

export function summarizeFieldInspections<
  T extends { status: FieldInspectionAssignmentStatus },
>(items: T[]): FieldInspectionAssignmentSummary {
  return {
    total: items.length,
    scheduled: items.filter((i) => i.status === FieldInspectionAssignmentStatus.SCHEDULED).length,
    inProgress: items.filter((i) => i.status === FieldInspectionAssignmentStatus.IN_PROGRESS).length,
    completed: items.filter((i) => i.status === FieldInspectionAssignmentStatus.COMPLETED).length,
    cancelled: items.filter((i) => i.status === FieldInspectionAssignmentStatus.CANCELLED).length,
  };
}
