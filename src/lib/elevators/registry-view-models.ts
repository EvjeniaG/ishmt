import type {
  BuildingType,
  Inspection,
  MaintenanceComplianceStatus,
  MaintenanceContract,
  MaintenanceRecord,
  Organization,
} from "@prisma/client";
import { MAINTENANCE_SERVICE_TYPE_LABELS } from "@/lib/constants/lifecycle-labels";
import {
  extractLegacyPeriodicComments,
  extractLegacyReportReference,
  formatInspectionFindings,
  isLegacyImportFindings,
} from "@/lib/elevators/format-inspection-findings";
import { displayOmBody, formatOmBodyNumber } from "@/lib/elevators/format-om-body";
import type { ContractTerminationMeta } from "@/lib/services/maintenance-contract-service";

const MONTHLY_REPORT = "RAPORT_MUJOR";

const CONTRACT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Në pritje",
  ACTIVE: "Aktive",
  REJECTED: "Refuzuar",
  TERMINATED: "Përfunduar",
  EXPIRED: "Skaduar",
};

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  INITIAL: "Fillestar",
  PERIODIC: "Periodik",
  EXTRAORDINARY: "Jashtëzakonshme",
  RE_INSPECTION: "Rinspektim",
};

const INSPECTION_RESULT_LABELS: Record<string, string> = {
  PASS: "Kalues",
  FAIL: "Jo kalues",
  CONDITIONAL: "Me kushte",
  PENDING: "Në pritje",
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function resolveDisplayInspectionResult(
  type: string,
  result: string | null,
  conductedDate: Date | null,
  status?: string | null,
): { result: string | null; resultLabel: string; isPass: boolean; isFail: boolean } {
  const today = startOfDay(new Date());
  const conducted = conductedDate ? startOfDay(conductedDate) : null;
  const isPastPeriodic =
    type === "PERIODIC" && conducted != null && conducted.getTime() <= today.getTime();
  const storedResult =
    result ?? (status && status !== "PENDING" ? status : null);

  const effectiveResult = storedResult ?? (isPastPeriodic ? "PASS" : null);
  const resultLabel = effectiveResult
    ? (INSPECTION_RESULT_LABELS[effectiveResult] ?? effectiveResult)
    : "Në pritje";

  return {
    result: effectiveResult,
    resultLabel,
    isPass: effectiveResult === "PASS",
    isFail: effectiveResult === "FAIL",
  };
}

function isOmBodyReference(...values: (string | null | undefined)[]): boolean {
  return values.some((value) => {
    if (!value?.trim()) return false;
    return Boolean(formatOmBodyNumber(value) || /^OMI\s/i.test(value.trim()));
  });
}

function inspectionConductedByOrg(
  type: string,
  conductedDate: Date | null,
  approvedBodyNumber: string | null,
  contracts: Array<{ serviceType: string; isActive: boolean; status: string; startDate: Date; endDate: Date | null; maintenanceOrg?: { name: string } | null }>,
  certifierOrg: { name: string } | null,
): string {
  if (
    type === "PERIODIC" ||
    type === "INITIAL" ||
    type === "RE_INSPECTION" ||
    type === "EXTRAORDINARY" ||
    isOmBodyReference(approvedBodyNumber, certifierOrg?.name)
  ) {
    const omBody = displayOmBody(approvedBodyNumber, certifierOrg?.name);
    if (
      type === "PERIODIC" ||
      type === "EXTRAORDINARY" ||
      isOmBodyReference(approvedBodyNumber, certifierOrg?.name)
    ) {
      return omBody;
    }
  }

  const at = conductedDate ?? new Date();
  const inspectionContracts = contracts.filter(
    (c) => c.serviceType === "PERIODIC_INSPECTION" && c.maintenanceOrg?.name,
  );

  const covering = inspectionContracts.find((c) => {
    const start = new Date(c.startDate);
    const end = c.endDate ? new Date(c.endDate) : null;
    return start <= at && (!end || end >= at);
  });
  if (covering?.maintenanceOrg?.name) {
    return displayOmBody(null, covering.maintenanceOrg.name);
  }

  const active = inspectionContracts.find((c) => c.isActive && c.status === "ACTIVE");
  if (active?.maintenanceOrg?.name) {
    return displayOmBody(null, active.maintenanceOrg.name);
  }

  if (certifierOrg?.name) return displayOmBody(approvedBodyNumber, certifierOrg.name);

  return "OM";
}

export type MaintenanceRegistryView = {
  maintenanceOrg: { name: string; nipt: string | null } | null;
  compliance: {
    lastMaintenanceDate: string | null;
    nextDueDate: string | null;
    isCompliant: boolean;
    daysOverdue: number;
  } | null;
  contracts: Array<{
    id: string;
    contractNumber: string;
    serviceTypeLabel: string;
    statusLabel: string;
    isActive: boolean;
    startDate: string;
    endDate: string | null;
    companyName: string;
    companyNipt: string | null;
    rejectionReason: string | null;
    respondedAt: string | null;
    createdAt: string;
    documentId: string | null;
    documentName: string | null;
    termination: {
      partyLabel: string;
      actorName: string | null;
      terminatedAt: string;
    } | null;
  }>;
  records: Array<{
    id: string;
    performedDate: string;
    interventionLabel: string;
    typeLabel: string;
    technicianName: string | null;
    description: string | null;
    partsReplaced: string | null;
    findings: string | null;
    startTime: string | null;
    endTime: string | null;
    durationMinutes: number | null;
    nextDueDate: string | null;
    companyName: string;
    isMonthlyReport: boolean;
    createdAt: string;
    documentId: string | null;
    documentName: string | null;
  }>;
};

export type InspectionRegistryView = {
  certifierOrg: { name: string; nipt: string | null } | null;
  contracts: Array<{
    id: string;
    contractNumber: string;
    statusLabel: string;
    isActive: boolean;
    startDate: string;
    endDate: string | null;
    companyName: string;
    companyNipt: string | null;
    rejectionReason: string | null;
    respondedAt: string | null;
    documentId: string | null;
    documentName: string | null;
    createdAt: string;
  }>;
  items: Array<{
    id: string;
    type: string;
    typeLabel: string;
    result: string | null;
    resultLabel: string;
    conductedDate: string | null;
    scheduledDate: string;
    nextInspectionDate: string | null;
    inspectorName: string | null;
    conductedByOrg: string;
    approvedBodyNumber: string | null;
    reportReference: string | null;
    findings: string | null;
    findingsLabel: string;
    isLegacyImport: boolean;
    canOmiEnrich: boolean;
    hasReport: boolean;
    reportDocumentId: string | null;
    isPass: boolean;
    isFail: boolean;
  }>;
  nextDue: string | null;
  intervalMonths: number | null;
};

export function buildMaintenanceRegistryView(input: {
  maintenanceOrg: Organization | null;
  maintenanceContracts: (MaintenanceContract & {
    maintenanceOrg?: Organization | null;
    document?: { id: string; originalFilename: string } | null;
  })[];
  maintenanceRecords: (MaintenanceRecord & {
    maintenanceOrg?: Organization | null;
    document?: { id: string; originalFilename: string } | null;
  })[];
  maintenanceCompliance: MaintenanceComplianceStatus | null;
  terminationMeta?: Map<string, ContractTerminationMeta>;
}): MaintenanceRegistryView {
  const maintContracts = input.maintenanceContracts.filter((c) => c.serviceType === "MAINTENANCE");
  const sortedRecords = [...input.maintenanceRecords].sort(
    (a, b) => new Date(b.performedDate).getTime() - new Date(a.performedDate).getTime(),
  );
  return {
    maintenanceOrg: input.maintenanceOrg
      ? { name: input.maintenanceOrg.name, nipt: input.maintenanceOrg.nipt }
      : null,
    compliance: input.maintenanceCompliance
      ? {
          lastMaintenanceDate: input.maintenanceCompliance.lastMaintenanceDate?.toISOString() ?? null,
          nextDueDate: input.maintenanceCompliance.nextDueDate?.toISOString() ?? null,
          isCompliant: input.maintenanceCompliance.isCompliant,
          daysOverdue: input.maintenanceCompliance.daysOverdue,
        }
      : null,
    contracts: maintContracts
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber ?? "-",
      serviceTypeLabel: MAINTENANCE_SERVICE_TYPE_LABELS[c.serviceType] ?? c.serviceType,
      statusLabel: CONTRACT_STATUS_LABELS[c.status] ?? c.status,
      isActive: c.isActive,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString() ?? null,
      companyName: c.maintenanceOrg?.name ?? "-",
      companyNipt: c.maintenanceOrg?.nipt ?? null,
      rejectionReason: c.rejectionReason,
      respondedAt: c.respondedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      documentId: c.documentId,
      documentName: c.document?.originalFilename ?? null,
      termination: (() => {
        const meta = input.terminationMeta?.get(c.id);
        if (!meta) return null;
        return {
          partyLabel: meta.partyLabel,
          actorName: meta.actorName,
          terminatedAt: meta.terminatedAt.toISOString(),
        };
      })(),
    })),
    records: sortedRecords.map((r) => ({
        id: r.id,
        performedDate: r.performedDate.toISOString(),
        interventionLabel: r.interventionType ?? r.type,
        typeLabel: r.type,
        technicianName: r.technicianName,
        description: r.description,
        partsReplaced: r.partsReplaced,
        findings: r.findings,
        startTime: r.startTime,
        endTime: r.endTime,
        durationMinutes: r.durationMinutes,
        nextDueDate: r.nextDueDate?.toISOString() ?? null,
        companyName: r.maintenanceOrg?.name ?? "-",
        isMonthlyReport: r.interventionType === MONTHLY_REPORT,
        createdAt: r.createdAt.toISOString(),
        documentId: r.documentId,
        documentName: r.document?.originalFilename ?? null,
      })),
  };
}

export function buildInspectionRegistryView(input: {
  inspections: (Inspection & { inspector?: { firstName: string; lastName: string } | null })[];
  maintenanceContracts: (MaintenanceContract & {
    maintenanceOrg?: Organization | null;
    document?: { id: string; originalFilename: string } | null;
  })[];
  certifierOrg?: { name: string; nipt?: string | null } | null;
  intervalMonths?: number | null;
  registrationDate?: Date | null;
  buildingType?: BuildingType | null;
}): InspectionRegistryView {
  const sorted = [...input.inspections].sort(
    (a, b) =>
      new Date(b.conductedDate ?? b.scheduledDate).getTime() -
      new Date(a.conductedDate ?? a.scheduledDate).getTime(),
  );
  const lastPeriodic = sorted.find((i) => i.type === "PERIODIC" && i.conductedDate);

  let nextDue = lastPeriodic?.nextInspectionDate?.toISOString() ?? null;
  if (!nextDue && lastPeriodic?.conductedDate && input.intervalMonths) {
    const computed = new Date(lastPeriodic.conductedDate);
    computed.setMonth(computed.getMonth() + input.intervalMonths);
    nextDue = computed.toISOString();
  }
  if (!nextDue && input.registrationDate && input.intervalMonths) {
    const computed = new Date(input.registrationDate);
    computed.setMonth(computed.getMonth() + input.intervalMonths);
    nextDue = computed.toISOString();
  }
  const inspectionContracts = input.maintenanceContracts
    .filter((c) => c.serviceType === "PERIODIC_INSPECTION")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return {
    certifierOrg: input.certifierOrg
      ? { name: input.certifierOrg.name, nipt: input.certifierOrg.nipt ?? null }
      : null,
    contracts: inspectionContracts.map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber ?? "-",
      statusLabel: CONTRACT_STATUS_LABELS[c.status] ?? c.status,
      isActive: c.isActive,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate?.toISOString() ?? null,
      companyName: c.maintenanceOrg?.name ?? "-",
      companyNipt: c.maintenanceOrg?.nipt ?? null,
      rejectionReason: c.rejectionReason,
      respondedAt: c.respondedAt?.toISOString() ?? null,
      documentId: c.documentId,
      documentName: c.document?.originalFilename ?? null,
      createdAt: c.createdAt.toISOString(),
    })),
    nextDue,
    intervalMonths: input.intervalMonths ?? null,
    items: sorted.map((i) => {
      const legacyImport = isLegacyImportFindings(i.findings);
      const display = resolveDisplayInspectionResult(i.type, i.result, i.conductedDate, i.status);
      const reportReference = extractLegacyReportReference(i.findings);
      const isPeriodic = i.type === "PERIODIC";

      const legacyKiInsp = i.findings?.trim().startsWith("K/INSP:");
      const isLegacyInitial =
        i.type === "INITIAL" &&
        !i.reportDocumentId &&
        isOmBodyReference(i.approvedBodyNumber, input.certifierOrg?.name);

      return {
        id: i.id,
        type: i.type,
        typeLabel: INSPECTION_TYPE_LABELS[i.type] ?? i.type,
        result: display.result,
        resultLabel: display.resultLabel,
        conductedDate: i.conductedDate?.toISOString() ?? null,
        scheduledDate: i.scheduledDate.toISOString(),
        nextInspectionDate: i.nextInspectionDate?.toISOString() ?? null,
        inspectorName:
          isPeriodic ||
          i.type === "EXTRAORDINARY" ||
          legacyImport ||
          legacyKiInsp ||
          isLegacyInitial
            ? null
            : i.inspector
              ? `${i.inspector.firstName} ${i.inspector.lastName}`
              : null,
        conductedByOrg: inspectionConductedByOrg(
          i.type,
          i.conductedDate,
          i.approvedBodyNumber,
          input.maintenanceContracts,
          input.certifierOrg ?? null,
        ),
        approvedBodyNumber: formatOmBodyNumber(i.approvedBodyNumber) ?? i.approvedBodyNumber,
        reportReference,
        findings: legacyImport
          ? extractLegacyPeriodicComments(i.findings)
          : legacyKiInsp
            ? null
            : formatInspectionFindings(i.findings),
        findingsLabel: legacyImport ? "Shënime" : "Gjetjet",
        isLegacyImport: legacyImport,
        canOmiEnrich: isPeriodic && !i.reportDocumentId,
        hasReport: Boolean(i.reportDocumentId),
        reportDocumentId: i.reportDocumentId,
        isPass: display.isPass,
        isFail: display.isFail,
      };
    }),
  };
}
