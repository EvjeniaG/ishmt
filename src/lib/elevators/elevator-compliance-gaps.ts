import { ComplianceIndicator, ElevatorStatus } from "@prisma/client";

export type ComplianceGapLevel = "danger" | "warning" | "info";

export type ElevatorComplianceGap = {
  key: string;
  level: ComplianceGapLevel;
  title: string;
  detail: string;
};

export type ElevatorComplianceSnapshot = {
  lastInspectionDate: Date | null;
  hasMaintenanceCompany: boolean;
  lastMaintenanceDate: Date | null;
  nextInspectionDate: Date | null;
  nextMaintenanceDueDate: Date | null;
  registrationCertificateExpiry: Date | null;
  maintenanceDaysOverdue: number;
  inspectionValid: boolean;
  certificateValid: boolean;
  maintenanceValid: boolean;
  inspectionExpiring: boolean;
  certificateExpiring: boolean;
  maintenanceExpiring: boolean;
  isSuspended: boolean;
};

function fmtDate(value: Date | null | undefined): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("sq-AL");
}

function requiresComplianceAlerts(status: string): boolean {
  return status !== "DEREGISTERED" && status !== "PENDING_REGISTRATION";
}

export function buildElevatorComplianceSnapshot(input: {
  status: ElevatorStatus | string;
  lastInspectionDate: Date | null;
  hasMaintenanceCompany: boolean;
  lastMaintenanceDate: Date | null;
  nextInspectionDate?: Date | null;
  nextMaintenanceDueDate?: Date | null;
  registrationCertificateExpiry?: Date | null;
  maintenanceDaysOverdue?: number;
  complianceRow?: {
    inspectionValid: boolean;
    certificateValid: boolean;
    maintenanceValid: boolean;
    inspectionExpiring: boolean;
    certificateExpiring: boolean;
    maintenanceExpiring: boolean;
    isSuspended: boolean;
  } | null;
  hasRegistrationCertificate?: boolean;
}): ElevatorComplianceSnapshot {
  const hasInspection = Boolean(input.lastInspectionDate);
  const hasMaintRecord = Boolean(input.lastMaintenanceDate);

  return {
    lastInspectionDate: input.lastInspectionDate,
    hasMaintenanceCompany: input.hasMaintenanceCompany,
    lastMaintenanceDate: input.lastMaintenanceDate,
    nextInspectionDate: input.nextInspectionDate ?? null,
    nextMaintenanceDueDate: input.nextMaintenanceDueDate ?? null,
    registrationCertificateExpiry: input.registrationCertificateExpiry ?? null,
    maintenanceDaysOverdue: input.maintenanceDaysOverdue ?? 0,
    inspectionValid: input.complianceRow?.inspectionValid ?? hasInspection,
    certificateValid: input.complianceRow?.certificateValid ?? (input.hasRegistrationCertificate ?? true),
    maintenanceValid:
      input.complianceRow?.maintenanceValid ??
      (input.hasMaintenanceCompany && hasMaintRecord),
    inspectionExpiring: input.complianceRow?.inspectionExpiring ?? false,
    certificateExpiring: input.complianceRow?.certificateExpiring ?? false,
    maintenanceExpiring: input.complianceRow?.maintenanceExpiring ?? false,
    isSuspended: input.complianceRow?.isSuspended ?? input.status === "SUSPENDED",
  };
}

export function evaluateElevatorComplianceGaps(input: {
  status: ElevatorStatus | string;
  deregistered?: boolean;
  deregistrationDate?: Date | null;
  snapshot: ElevatorComplianceSnapshot;
}): ElevatorComplianceGap[] {
  const { status, deregistered, deregistrationDate, snapshot: s } = input;
  const gaps: ElevatorComplianceGap[] = [];

  if (deregistered || status === "DEREGISTERED") {
    gaps.push({
      key: "deregistered",
      level: "danger",
      title: "Ashensor i çregjistruar",
      detail: deregistrationDate
        ? `Ky ashensor nuk është më i r (që nga ${fmtDate(deregistrationDate)}).`
        : "Ky ashensor nuk është më i r.",
    });
    return gaps;
  }

  if (s.isSuspended || status === "SUSPENDED") {
    gaps.push({
      key: "suspended",
      level: "danger",
      title: "Ashensor i pezulluar",
      detail: "Ashensori rezulton i pezulluar ose jashtë përputhshmërisë.",
    });
  }

  if (status === "OUT_OF_SERVICE") {
    gaps.push({
      key: "out-of-service",
      level: "danger",
      title: "Jashtë shërbimit",
      detail: "Ashensori është shpallur jashtë shërbimit.",
    });
  }

  if (status === "UNVERIFIED" || status === "PENDING_CONFIRMATION") {
    gaps.push({
      key: "unverified",
      level: "warning",
      title: "Në pritje verifikimi",
      detail: "Regjistrimi nuk është verifikuar plotësisht nga IQMT.",
    });
  }

  if (requiresComplianceAlerts(status)) {
    if (!s.lastInspectionDate) {
      gaps.push({
        key: "missing-inspection",
        level: "danger",
        title: "Nuk ka kontroll të regjistruar",
        detail: "Në regjistër nuk figuron asnjë kontroll periodik i kryer për këtë ashensor.",
      });
    } else if (!s.inspectionValid) {
      gaps.push({
        key: "inspection-invalid",
        level: "danger",
        title: "Kontrolli periodik - jo në përputhje",
        detail: s.nextInspectionDate
          ? `Afati i kontrollit (${fmtDate(s.nextInspectionDate)}) ka kaluar ose kontrolli i fundit nuk ka kaluar.`
          : "Kontrolli i fundit nuk plotëson kërkesat e regjistrit.",
      });
    } else if (s.inspectionExpiring) {
      gaps.push({
        key: "inspection-expiring",
        level: "warning",
        title: "Kontrolli periodik - afati po skadon",
        detail: s.nextInspectionDate
          ? `Kontrolli i radhës duhet kryer deri më ${fmtDate(s.nextInspectionDate)}.`
          : "Kontrolli periodik duhet planifikuar së shpejti.",
      });
    }

    if (!s.hasMaintenanceCompany) {
      gaps.push({
        key: "missing-maintenance-company",
        level: "danger",
        title: "Nuk ka kompani mirëmbajtjeje",
        detail: "Ashensorit nuk i është caktuar kompani e autorizuar mirëmbajtjeje.",
      });
    } else if (!s.lastMaintenanceDate) {
      gaps.push({
        key: "missing-maintenance-record",
        level: "danger",
        title: "Nuk ka mirëmbajtje të regjistruar",
        detail: "Nuk figuron asnjë regjistrim mirëmbajtjeje për këtë ashensor.",
      });
    } else if (!s.maintenanceValid) {
      gaps.push({
        key: "maintenance-invalid",
        level: "danger",
        title: "Mirëmbajtja - jo në përputhje",
        detail:
          s.maintenanceDaysOverdue > 0
            ? `Mirëmbajtja është vonuar ${s.maintenanceDaysOverdue} ditë.`
            : s.nextMaintenanceDueDate
              ? `Afati i mirëmbajtjes (${fmtDate(s.nextMaintenanceDueDate)}) ka kaluar.`
              : "Mirëmbajtja periodike nuk është në përputhje me regjistrin.",
      });
    } else if (s.maintenanceExpiring) {
      gaps.push({
        key: "maintenance-expiring",
        level: "warning",
        title: "Mirëmbajtja - afati po skadon",
        detail: s.nextMaintenanceDueDate
          ? `Mirëmbajtja e radhës duhet kryer deri më ${fmtDate(s.nextMaintenanceDueDate)}.`
          : "Mirëmbajtja periodike duhet planifikuar së shpejti.",
      });
    }
  }

  if (!s.certificateValid) {
    gaps.push({
      key: "certificate-invalid",
      level: "danger",
      title: "Certifikata e regjistrimit - jo e vlefshme",
      detail: s.registrationCertificateExpiry
        ? `Certifikata ka skaduar më ${fmtDate(s.registrationCertificateExpiry)}.`
        : "Certifikata e regjistrimit nuk është e vlefshme ose mungon.",
    });
  } else if (s.certificateExpiring) {
    gaps.push({
      key: "certificate-expiring",
      level: "warning",
      title: "Certifikata e regjistrimit - po skadon",
      detail: s.registrationCertificateExpiry
        ? `Certifikata skadon më ${fmtDate(s.registrationCertificateExpiry)}.`
        : "Certifikata e regjistrimit po i afrohet skadimit.",
    });
  }

  if (status === "MAINTENANCE_OVERDUE") {
    gaps.push({
      key: "maintenance-overdue-status",
      level: "danger",
      title: "Mirëmbajtje e vonuar",
      detail: "Ashensori është shënuar me mirëmbajtje të vonuar në regjistër.",
    });
  }

  if (status === "EXPIRED_CERTIFICATION") {
    gaps.push({
      key: "expired-certification-status",
      level: "danger",
      title: "Certifikatë e skaduar",
      detail: "Certifikata e regjistrimit të ashensorit ka skaduar.",
    });
  }

  if (status === "UNDER_INSPECTION") {
    gaps.push({
      key: "under-inspection",
      level: "info",
      title: "Në inspektim",
      detail: "Ashensori është aktualisht në proces inspektimi nga OM.",
    });
  }

  if (
    gaps.length === 0 &&
    status === "ACTIVE" &&
    s.inspectionValid &&
    s.maintenanceValid &&
    s.certificateValid
  ) {
    gaps.push({
      key: "compliant",
      level: "info",
      title: "Në përputhje",
      detail: "Ashensori rezulton aktiv dhe në përputhje me kërkesat bazë të regjistrit.",
    });
  }

  return gaps;
}

export function resolveIndicatorFromGaps(gaps: ElevatorComplianceGap[]): ComplianceIndicator {
  if (gaps.some((g) => g.level === "danger")) return ComplianceIndicator.RED;
  if (gaps.some((g) => g.level === "warning")) return ComplianceIndicator.YELLOW;
  return ComplianceIndicator.GREEN;
}

export function resolveElevatorComplianceIndicator(input: {
  status: ElevatorStatus | string;
  deregistered?: boolean;
  snapshot: ElevatorComplianceSnapshot;
}): ComplianceIndicator {
  if (input.deregistered || input.status === "DEREGISTERED") {
    return ComplianceIndicator.RED;
  }
  return resolveIndicatorFromGaps(evaluateElevatorComplianceGaps(input));
}
