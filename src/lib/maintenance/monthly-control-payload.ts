import {
  allMonthlyControlChecklistItemIds,
  MONTHLY_CONTROL_CHECK_STATUS_LABELS,
  MONTHLY_CONTROL_CHECKLIST,
  type MonthlyControlCheckStatus,
} from "@/lib/constants/monthly-control-checklist";

export type MonthlyControlResult = "PASS" | "FAIL";

export type MonthlyControlFormPayload = {
  monthlyControlForm: true;
  version: 1;
  periodYear: number;
  periodMonth: number;
  result: MonthlyControlResult;
  checklist: Record<string, MonthlyControlCheckStatus>;
  observations?: string;
  notes?: string;
};

export type SubmitMonthlyControlInput = {
  elevatorId: string;
  performedDate: Date;
  periodYear: number;
  periodMonth: number;
  technicianName: string;
  startTime?: string;
  endTime?: string;
  checklist: Record<string, MonthlyControlCheckStatus>;
  observations?: string;
  notes?: string;
  documentId?: string;
};

export function deriveMonthlyControlResult(
  checklist: Record<string, MonthlyControlCheckStatus>,
): MonthlyControlResult {
  return Object.values(checklist).some((status) => status === "not_ok") ? "FAIL" : "PASS";
}

export function validateMonthlyControlInput(input: SubmitMonthlyControlInput): void {
  if (!input.elevatorId) throw new Error("Zgjidhni ashensorin.");
  if (!input.technicianName.trim()) throw new Error("Emri i teknikut është i detyrueshëm.");
  if (input.periodMonth < 1 || input.periodMonth > 12) throw new Error("Muaji i periudhës nuk është valid.");
  if (input.periodYear < 2000 || input.periodYear > 2100) throw new Error("Viti i periudhës nuk është valid.");

  const requiredIds = allMonthlyControlChecklistItemIds();
  for (const id of requiredIds) {
    const status = input.checklist[id];
    if (!status || !["ok", "not_ok", "na"].includes(status)) {
      const item = MONTHLY_CONTROL_CHECKLIST.flatMap((s) => s.items).find((i) => i.id === id);
      throw new Error(`Plotësoni kontrollin: ${item?.label ?? id}`);
    }
  }

  const result = deriveMonthlyControlResult(input.checklist);
  if (result === "FAIL" && !input.observations?.trim()) {
    throw new Error("Kur ka pika jo konforme, vërejtjet janë të detyrueshme.");
  }

  if (input.startTime && input.endTime) {
    const [sh, sm] = input.startTime.split(":").map((p) => parseInt(p, 10));
    const [eh, em] = input.endTime.split(":").map((p) => parseInt(p, 10));
    const startMin = (sh || 0) * 60 + (sm || 0);
    const endMin = (eh || 0) * 60 + (em || 0);
    if (endMin <= startMin) {
      throw new Error("Ora e mbarimit duhet të jetë pas orës së fillimit.");
    }
  }
}

export function buildMonthlyControlPayload(
  input: Pick<
    SubmitMonthlyControlInput,
    "periodYear" | "periodMonth" | "checklist" | "observations" | "notes"
  >,
): MonthlyControlFormPayload {
  return {
    monthlyControlForm: true,
    version: 1,
    periodYear: input.periodYear,
    periodMonth: input.periodMonth,
    result: deriveMonthlyControlResult(input.checklist),
    checklist: input.checklist,
    observations: input.observations?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  };
}

export function buildMonthlyControlDescription(payload: MonthlyControlFormPayload): string {
  const checked = Object.values(payload.checklist).filter((s) => s !== "na").length;
  const okCount = Object.values(payload.checklist).filter((s) => s === "ok").length;
  const resultLabel = payload.result === "PASS" ? "KALUES" : "JO KALUES";
  return `Kontroll periodik mujor - ${resultLabel} (${okCount}/${checked} pika konforme)`;
}

export function parseMonthlyControlPayload(
  findings: string | null | undefined,
): MonthlyControlFormPayload | null {
  if (!findings?.trim()) return null;
  try {
    const parsed = JSON.parse(findings) as MonthlyControlFormPayload;
    if (parsed?.monthlyControlForm === true && parsed.version === 1) {
      return parsed;
    }
  } catch {
    // legacy / tekst i lirë
  }
  return null;
}

export function formatMonthlyControlSummary(findings: string | null | undefined): string | null {
  const payload = parseMonthlyControlPayload(findings);
  if (!payload) return findings?.trim() || null;
  return buildMonthlyControlDescription(payload);
}

export function formatMonthlyControlChecklistRows(
  findings: string | null | undefined,
): { label: string; status: string }[] {
  const payload = parseMonthlyControlPayload(findings);
  if (!payload) return [];

  return MONTHLY_CONTROL_CHECKLIST.flatMap((section) =>
    section.items.map((item) => ({
      label: item.label,
      status: MONTHLY_CONTROL_CHECK_STATUS_LABELS[payload.checklist[item.id]] ?? "-",
    })),
  );
}
