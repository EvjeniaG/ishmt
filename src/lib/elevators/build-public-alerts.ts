import type { PublicAlert, PublicComplianceFlags } from "@/lib/services/qr-service";
import {
  buildElevatorComplianceSnapshot,
  evaluateElevatorComplianceGaps,
  type ElevatorComplianceSnapshot,
} from "@/lib/elevators/elevator-compliance-gaps";

export function buildPublicAlerts(input: {
  status: string;
  deregistered?: boolean;
  deregistrationDate?: Date | null;
  compliance: PublicComplianceFlags;
  lastInspectionDate: Date | null;
  hasMaintenanceCompany: boolean;
  lastMaintenanceDate: Date | null;
  nextInspectionDate: Date | null;
  nextMaintenanceDueDate: Date | null;
  registrationCertificateExpiry: Date | null;
  maintenanceDaysOverdue: number;
}): PublicAlert[] {
  const snapshot: ElevatorComplianceSnapshot = {
    lastInspectionDate: input.lastInspectionDate,
    hasMaintenanceCompany: input.hasMaintenanceCompany,
    lastMaintenanceDate: input.lastMaintenanceDate,
    nextInspectionDate: input.nextInspectionDate,
    nextMaintenanceDueDate: input.nextMaintenanceDueDate,
    registrationCertificateExpiry: input.registrationCertificateExpiry,
    maintenanceDaysOverdue: input.maintenanceDaysOverdue,
    inspectionValid: input.compliance.inspectionValid,
    certificateValid: input.compliance.certificateValid,
    maintenanceValid: input.compliance.maintenanceValid,
    inspectionExpiring: input.compliance.inspectionExpiring,
    certificateExpiring: input.compliance.certificateExpiring,
    maintenanceExpiring: input.compliance.maintenanceExpiring,
    isSuspended: input.compliance.isSuspended,
  };

  return evaluateElevatorComplianceGaps({
    status: input.status,
    deregistered: input.deregistered,
    deregistrationDate: input.deregistrationDate,
    snapshot,
  }).map((gap) => ({
    level: gap.level,
    title: gap.title,
    detail: gap.detail,
  }));
}

export { buildElevatorComplianceSnapshot, evaluateElevatorComplianceGaps };
