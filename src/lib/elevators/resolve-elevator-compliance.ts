import type { ElevatorStatus } from "@prisma/client";
import { ComplianceService } from "@/lib/services/compliance-service";
import {
  buildElevatorComplianceSnapshot,
  evaluateElevatorComplianceGaps,
  resolveElevatorComplianceIndicator,
  type ElevatorComplianceGap,
  type ElevatorComplianceSnapshot,
} from "@/lib/elevators/elevator-compliance-gaps";

type ElevatorComplianceSource = {
  status: ElevatorStatus | string;
  maintenanceOrgId?: string | null;
  inspections?: Array<{ conductedDate: Date | null; nextInspectionDate?: Date | null }>;
  maintenanceRecords?: Array<{ performedDate: Date }>;
  maintenanceCompliance?: {
    lastMaintenanceDate: Date | null;
    nextDueDate: Date | null;
    isCompliant: boolean;
    daysOverdue: number;
  } | null;
  complianceIndicator?: {
    indicator?: import("@prisma/client").ComplianceIndicator;
    inspectionValid: boolean;
    certificateValid: boolean;
    maintenanceValid: boolean;
    inspectionExpiring: boolean;
    certificateExpiring: boolean;
    maintenanceExpiring: boolean;
    isSuspended: boolean;
  } | null;
  certificates?: Array<{ expiryDate: Date | null }>;
};

export function resolveElevatorComplianceView(elv: ElevatorComplianceSource) {
  const lastInspection = elv.inspections?.find((i) => i.conductedDate) ?? null;
  const lastMaintRecord = elv.maintenanceRecords?.[0] ?? null;
  const regCert = elv.certificates?.[0];

  const snapshot = buildElevatorComplianceSnapshot({
    status: elv.status,
    lastInspectionDate: lastInspection?.conductedDate ?? null,
    hasMaintenanceCompany: Boolean(elv.maintenanceOrgId),
    lastMaintenanceDate:
      elv.maintenanceCompliance?.lastMaintenanceDate ?? lastMaintRecord?.performedDate ?? null,
    nextInspectionDate: lastInspection?.nextInspectionDate ?? null,
    nextMaintenanceDueDate: elv.maintenanceCompliance?.nextDueDate ?? null,
    registrationCertificateExpiry: regCert?.expiryDate ?? null,
    maintenanceDaysOverdue: elv.maintenanceCompliance?.daysOverdue ?? 0,
    hasRegistrationCertificate: Boolean(regCert),
    complianceRow: elv.complianceIndicator ?? null,
  });

  const deregistered = elv.status === "DEREGISTERED";
  const gaps = evaluateElevatorComplianceGaps({
    status: elv.status,
    deregistered,
    snapshot,
  });
  const indicator = resolveElevatorComplianceIndicator({ status: elv.status, deregistered, snapshot });
  const display = ComplianceService.getPublicDisplay(indicator);

  return { snapshot, gaps, indicator, display };
}

export function gapToRequiredAction(
  gap: ElevatorComplianceGap,
  elevator: { id: string; registryNumber: string },
): {
  id: string;
  title: string;
  subtitle: string;
  severity: "info" | "warning" | "danger";
  href: string;
  actionLabel: string;
} {
  const severity = gap.level === "danger" ? "danger" : gap.level === "warning" ? "warning" : "info";
  const href =
    gap.key.startsWith("missing-maintenance") || gap.key.startsWith("maintenance")
      ? `/portal/elevators/${elevator.id}?tab=maintenance`
      : gap.key.startsWith("missing-inspection") || gap.key.startsWith("inspection")
        ? `/portal/elevators/${elevator.id}?tab=inspections`
        : `/portal/elevators/${elevator.id}`;

  const actionLabel =
    gap.key === "missing-maintenance-company"
      ? "Cakto mirëmbajtës"
      : gap.key === "missing-maintenance-record"
        ? "Shiko mirëmbajtjen"
        : gap.key === "missing-inspection"
          ? "Shiko inspektimet"
          : "Shiko ashensorin";

  return {
    id: `${elevator.id}-${gap.key}`,
    title: gap.title,
    subtitle: `${elevator.registryNumber} · ${gap.detail}`,
    severity,
    href,
    actionLabel,
  };
}
