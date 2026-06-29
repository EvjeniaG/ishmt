import {
  CertificateStatus,
  CertificateType,
  ComplianceIndicator,
  ElevatorStatus,
  InspectionType,
  MaintenanceContractStatus,
} from "@prisma/client";
import {
  evaluateElevatorComplianceGaps,
  buildElevatorComplianceSnapshot,
  resolveElevatorComplianceIndicator,
} from "@/lib/elevators/elevator-compliance-gaps";

export type DossierHealthLevel = "ok" | "warning" | "blocker";

export type DossierHealthItem = {
  key: string;
  label: string;
  level: DossierHealthLevel;
  detail: string;
  href?: string;
};

export type DossierHealthSummary = {
  level: DossierHealthLevel;
  label: string;
  items: DossierHealthItem[];
};

const WARNING_DAYS = 30;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysUntil(date: Date, now: Date) {
  return Math.ceil((date.getTime() - now.getTime()) / MS_PER_DAY);
}

function worstLevel(items: DossierHealthItem[]): DossierHealthLevel {
  if (items.some((item) => item.level === "blocker")) return "blocker";
  if (items.some((item) => item.level === "warning")) return "warning";
  return "ok";
}

function summaryLabel(level: DossierHealthLevel) {
  switch (level) {
    case "ok":
      return "Dosja eshte e plote";
    case "warning":
      return "Dosja kerkon vemendje";
    case "blocker":
      return "Dosja ka mungesa kritike";
  }
}

export class ElevatorDossierHealthService {
  static resolve(input: {
    elevatorId: string;
    status: ElevatorStatus;
    certificates: Array<{
      type: CertificateType;
      status: CertificateStatus;
      documentId: string | null;
      expiryDate: Date | null;
    }>;
    qrCodes: Array<{
      code: string | null;
      imageDocumentId: string | null;
      placementPhotoDocumentId: string | null;
    }>;
    maintenanceContracts: Array<{
      serviceType: string;
      status: MaintenanceContractStatus;
      isActive: boolean;
      endDate: Date | null;
    }>;
    inspections: Array<{
      type: InspectionType;
      conductedDate?: Date | null;
      nextInspectionDate: Date | null;
    }>;
    maintenanceOrgId?: string | null;
    lastMaintenanceDate?: Date | null;
    complianceIndicator?: {
      indicator: ComplianceIndicator;
      inspectionValid?: boolean;
      certificateValid?: boolean;
      maintenanceValid?: boolean;
      inspectionExpiring?: boolean;
      certificateExpiring?: boolean;
      maintenanceExpiring?: boolean;
      isSuspended?: boolean;
    } | null;
    now?: Date;
  }): DossierHealthSummary {
    const now = input.now ?? new Date();
    const items: DossierHealthItem[] = [];

    const lastInspection = input.inspections.find((inspection) => inspection.conductedDate) ?? null;
    const snapshot = buildElevatorComplianceSnapshot({
      status: input.status,
      lastInspectionDate: lastInspection?.conductedDate ?? null,
      hasMaintenanceCompany: Boolean(input.maintenanceOrgId),
      lastMaintenanceDate: input.lastMaintenanceDate ?? null,
      nextInspectionDate: lastInspection?.nextInspectionDate ?? null,
      complianceRow: input.complianceIndicator
        ? {
            inspectionValid: input.complianceIndicator.inspectionValid ?? true,
            certificateValid: input.complianceIndicator.certificateValid ?? true,
            maintenanceValid: input.complianceIndicator.maintenanceValid ?? true,
            inspectionExpiring: input.complianceIndicator.inspectionExpiring ?? false,
            certificateExpiring: input.complianceIndicator.certificateExpiring ?? false,
            maintenanceExpiring: input.complianceIndicator.maintenanceExpiring ?? false,
            isSuspended: input.complianceIndicator.isSuspended ?? false,
          }
        : null,
      hasRegistrationCertificate: Boolean(
        input.certificates.find(
          (cert) => cert.type === CertificateType.REGISTRATION && cert.status === CertificateStatus.ACTIVE,
        ),
      ),
    });

    for (const gap of evaluateElevatorComplianceGaps({ status: input.status, snapshot }).filter(
      (gap) => gap.level !== "info",
    )) {
      items.push({
        key: gap.key,
        label: gap.title,
        level: gap.level === "danger" ? "blocker" : "warning",
        detail: gap.detail,
      });
    }

    const registrationCertificate = input.certificates.find(
      (cert) => cert.type === CertificateType.REGISTRATION && cert.status === CertificateStatus.ACTIVE,
    );
    if (!registrationCertificate) {
      items.push({
        key: "registration-certificate",
        label: "Certifikata e regjistrimit",
        level: "blocker",
        detail: "Mungon certifikata aktive e regjistrimit.",
      });
    } else if (!registrationCertificate.documentId) {
      items.push({
        key: "registration-certificate",
        label: "Certifikata e regjistrimit",
        level: "warning",
        detail: "Metadata ekziston, por PDF nuk eshte gati per shkarkim.",
      });
    } else if (registrationCertificate.expiryDate && registrationCertificate.expiryDate < now) {
      items.push({
        key: "registration-certificate",
        label: "Certifikata e regjistrimit",
        level: "blocker",
        detail: "Certifikata e regjistrimit ka skaduar.",
      });
    } else if (
      registrationCertificate.expiryDate &&
      daysUntil(registrationCertificate.expiryDate, now) <= WARNING_DAYS
    ) {
      items.push({
        key: "registration-certificate",
        label: "Certifikata e regjistrimit",
        level: "warning",
        detail: "Certifikata e regjistrimit skadon brenda 30 diteve.",
      });
    } else {
      items.push({
        key: "registration-certificate",
        label: "Certifikata e regjistrimit",
        level: "ok",
        detail: "Certifikata aktive dhe PDF jane ne dosje.",
      });
    }

    const qr = input.qrCodes[0];
    if (!qr?.code) {
      items.push({
        key: "qr",
        label: "Kodi QR",
        level: "blocker",
        detail: "Kodi QR nuk eshte gjeneruar.",
      });
    } else if (!qr.imageDocumentId) {
      items.push({
        key: "qr",
        label: "Kodi QR",
        level: "warning",
        detail: "Kodi ekziston, por imazhi/printimi nuk eshte gati.",
      });
    } else if (!qr.placementPhotoDocumentId) {
      items.push({
        key: "qr",
        label: "Kodi QR",
        level: "warning",
        detail: "Mungon fotoja qe konfirmon vendosjen fizike te QR.",
      });
    } else {
      items.push({
        key: "qr",
        label: "Kodi QR",
        level: "ok",
        detail: "Kodi QR eshte gjeneruar dhe vendosja eshte konfirmuar.",
      });
    }

    const activeMaintenanceContract = input.maintenanceContracts.find(
      (contract) =>
        contract.serviceType === "MAINTENANCE" &&
        contract.status === MaintenanceContractStatus.ACTIVE &&
        contract.isActive &&
        (!contract.endDate || contract.endDate >= now),
    );
    const pendingMaintenanceContract = input.maintenanceContracts.find(
      (contract) =>
        contract.serviceType === "MAINTENANCE" &&
        contract.status === MaintenanceContractStatus.PENDING,
    );
    if (activeMaintenanceContract) {
      items.push({
        key: "maintenance-contract",
        label: "Kontrata e mirembajtjes",
        level:
          activeMaintenanceContract.endDate &&
          daysUntil(activeMaintenanceContract.endDate, now) <= WARNING_DAYS
            ? "warning"
            : "ok",
        detail:
          activeMaintenanceContract.endDate &&
          daysUntil(activeMaintenanceContract.endDate, now) <= WARNING_DAYS
            ? "Kontrata aktive skadon brenda 30 diteve."
            : "Ka kontrate aktive mirembajtjeje.",
      });
    } else if (pendingMaintenanceContract) {
      items.push({
        key: "maintenance-contract",
        label: "Kontrata e mirembajtjes",
        level: "warning",
        detail: "Kontrata e mirembajtjes eshte derguar dhe pret pranim.",
      });
    } else {
      items.push({
        key: "maintenance-contract",
        label: "Kontrata e mirembajtjes",
        level: input.status === ElevatorStatus.ACTIVE ? "blocker" : "warning",
        detail: "Nuk ka kontrate aktive mirembajtjeje.",
      });
    }

    const periodicInspection = input.inspections.find((inspection) => inspection.type === InspectionType.PERIODIC);
    if (!lastInspection?.conductedDate) {
      if (!items.some((item) => item.key === "missing-inspection")) {
        items.push({
          key: "periodic-inspection",
          label: "Inspektimi periodik",
          level: "blocker",
          detail: "Nuk ka inspektim të regjistruar për këtë ashensor.",
        });
      }
    } else if (!periodicInspection?.nextInspectionDate) {
      items.push({
        key: "periodic-inspection",
        label: "Inspektimi periodik",
        level: "warning",
        detail: "Nuk ka datë të radhës për inspektimin periodik.",
      });
    } else if (periodicInspection.nextInspectionDate < now) {
      items.push({
        key: "periodic-inspection",
        label: "Inspektimi periodik",
        level: "blocker",
        detail: "Inspektimi periodik eshte jashte afatit.",
      });
    } else if (daysUntil(periodicInspection.nextInspectionDate, now) <= WARNING_DAYS) {
      items.push({
        key: "periodic-inspection",
        label: "Inspektimi periodik",
        level: "warning",
        detail: "Inspektimi periodik afron brenda 30 diteve.",
      });
    } else {
      items.push({
        key: "periodic-inspection",
        label: "Inspektimi periodik",
        level: "ok",
        detail: "Inspektimi periodik eshte brenda afatit.",
      });
    }

    const indicator = resolveElevatorComplianceIndicator({ status: input.status, snapshot });
    if (indicator === ComplianceIndicator.RED) {
      if (!items.some((item) => item.key === "compliance")) {
        items.push({
          key: "compliance",
          label: "Përputhshmeria",
          level: "blocker",
          detail: "Indikatori i perputhshmerise eshte i kuq.",
        });
      }
    } else if (indicator === ComplianceIndicator.YELLOW) {
      if (!items.some((item) => item.key === "compliance")) {
        items.push({
          key: "compliance",
          label: "Përputhshmeria",
          level: "warning",
          detail: "Indikatori i perputhshmerise kerkon vemendje.",
        });
      }
    } else if (items.every((item) => item.level === "ok" || item.key.startsWith("registration") || item.key.startsWith("qr"))) {
      items.push({
        key: "compliance",
        label: "Përputhshmeria",
        level: "ok",
        detail: "Indikatori i perputhshmerise eshte ne rregull.",
      });
    }

    const level = worstLevel(items);
    return {
      level,
      label: summaryLabel(level),
      items,
    };
  }
}
