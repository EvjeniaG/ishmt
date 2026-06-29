import { describe, expect, it } from "vitest";
import {
  CertificateStatus,
  CertificateType,
  ComplianceIndicator,
  ElevatorStatus,
  InspectionType,
  MaintenanceContractStatus,
} from "@prisma/client";
import { ElevatorDossierHealthService } from "@/lib/services/elevator-dossier-health-service";

const now = new Date("2026-06-22T00:00:00.000Z");

function future(days: number) {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date;
}

function healthyInput() {
  return {
    elevatorId: "elevator-1",
    status: ElevatorStatus.ACTIVE,
    certificates: [
      {
        type: CertificateType.REGISTRATION,
        status: CertificateStatus.ACTIVE,
        documentId: "doc-1",
        expiryDate: future(120),
      },
    ],
    qrCodes: [
      {
        code: "QR-1",
        imageDocumentId: "doc-qr",
        placementPhotoDocumentId: "doc-photo",
      },
    ],
    maintenanceContracts: [
      {
        serviceType: "MAINTENANCE",
        status: MaintenanceContractStatus.ACTIVE,
        isActive: true,
        endDate: future(120),
      },
    ],
    inspections: [
      {
        type: InspectionType.PERIODIC,
        nextInspectionDate: future(120),
      },
    ],
    complianceIndicator: { indicator: ComplianceIndicator.GREEN },
    now,
  };
}

describe("ElevatorDossierHealthService", () => {
  it("returns ok when the dossier has all critical assets and active contracts", () => {
    const health = ElevatorDossierHealthService.resolve(healthyInput());

    expect(health.level).toBe("ok");
    expect(health.items.every((item) => item.level === "ok")).toBe(true);
  });

  it("flags a missing registration certificate and maintenance contract as blockers", () => {
    const health = ElevatorDossierHealthService.resolve({
      ...healthyInput(),
      certificates: [],
      maintenanceContracts: [],
    });

    expect(health.level).toBe("blocker");
    expect(health.items.find((item) => item.key === "registration-certificate")?.level).toBe("blocker");
    expect(health.items.find((item) => item.key === "maintenance-contract")?.level).toBe("blocker");
  });

  it("warns when QR placement photo is missing", () => {
    const health = ElevatorDossierHealthService.resolve({
      ...healthyInput(),
      qrCodes: [{ code: "QR-1", imageDocumentId: "doc-qr", placementPhotoDocumentId: null }],
    });

    expect(health.level).toBe("warning");
    expect(health.items.find((item) => item.key === "qr")?.level).toBe("warning");
  });

  it("blocks when the next periodic inspection is overdue", () => {
    const overdue = new Date(now);
    overdue.setDate(overdue.getDate() - 1);

    const health = ElevatorDossierHealthService.resolve({
      ...healthyInput(),
      inspections: [{ type: InspectionType.PERIODIC, nextInspectionDate: overdue }],
    });

    expect(health.level).toBe("blocker");
    expect(health.items.find((item) => item.key === "periodic-inspection")?.level).toBe("blocker");
  });
});
