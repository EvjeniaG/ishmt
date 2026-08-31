import { createHash, randomBytes } from "crypto";
import QRCode from "qrcode";
import { AuditAction, ComplianceIndicator, DocumentClassification, Prisma } from "@prisma/client";
import { AuditService } from "@/lib/audit/audit-service";
import { db } from "@/lib/db";
import { buildPublicAlerts } from "@/lib/elevators/build-public-alerts";
import { resolveElevatorComplianceView } from "@/lib/elevators/resolve-elevator-compliance";
import { DocumentService } from "@/lib/services/document-service";

function generateQrCode(): string {
  return randomBytes(6).toString("hex").slice(0, 12).toUpperCase();
}

export type PublicAlert = {
  level: "danger" | "warning" | "info";
  title: string;
  detail: string;
};

export type PublicComplianceFlags = {
  inspectionValid: boolean;
  certificateValid: boolean;
  maintenanceValid: boolean;
  inspectionExpiring: boolean;
  certificateExpiring: boolean;
  maintenanceExpiring: boolean;
  isSuspended: boolean;
};

export type PublicQrProfile = {
  registryNumber: string;
  status: string;
  municipality: string;
  buildingAddress: string;
  buildingName: string | null;
  registrationDate: Date | null;
  activationDate: Date | null;
  lastInspectionDate: Date | null;
  lastInspectionType: string | null;
  nextInspectionDate: Date | null;
  complianceIndicator: ComplianceIndicator;
  compliance: PublicComplianceFlags;
  alerts: PublicAlert[];
  qrCode: string;
  publicUrl: string;
  deregistered?: boolean;
  deregistrationDate?: Date | null;
  deregistrationReason?: string | null;
  registrationCertificateNumber: string | null;
  registrationCertificateExpiry: Date | null;
  elevatorType: string | null;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  capacity: string | null;
  floorsServed: number | null;
  maintenanceCompany: string | null;
  lastMaintenanceDate: Date | null;
  nextMaintenanceDueDate: Date | null;
  maintenanceCompliant: boolean;
  maintenanceDaysOverdue: number;
  lastInspectionResult: string | null;
};

export class QrService {
  static async createQrSkeleton(
    elevatorId: string,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    let code = generateQrCode();
    let attempts = 0;

    while (attempts < 5) {
      const existing = await tx.qrCode.findUnique({ where: { code } });
      if (!existing) break;
      code = generateQrCode();
      attempts++;
    }

    const qr = await tx.qrCode.create({
      data: {
        elevatorId,
        code,
        isActive: true,
      },
    });

    await AuditService.log(
      {
        actorId,
        action: AuditAction.CREATE,
        entityType: "qr_code",
        entityId: qr.id,
        afterState: { code, elevatorId, isActive: true },
      },
      tx,
    );

    return qr;
  }

  static buildPublicUrl(code: string) {
    const rawBase =
      process.env.NEXT_PUBLIC_QR_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";
    // Legacy env values sometimes included `/q`; the path is always appended here.
    const base = rawBase.replace(/\/+$/, "").replace(/\/q$/i, "");
    return `${base}/q/${code.toUpperCase()}`;
  }

  static async generateQrImageBuffer(code: string) {
    const url = this.buildPublicUrl(code);
    return QRCode.toBuffer(url, { type: "png", width: 400, margin: 2 });
  }

  static async generateQrImageDataUrl(code: string) {
    const url = this.buildPublicUrl(code);
    return QRCode.toDataURL(url, { type: "image/png", width: 400, margin: 2 });
  }

  static async recordScan(code: string, ipAddress?: string | null, userAgent?: string | null) {
    const qr = await db.qrCode.findFirst({ where: { code: code.toUpperCase(), isActive: true } });
    if (!qr) return;

    await db.$transaction([
      db.qrCode.update({ where: { id: qr.id }, data: { scanCount: { increment: 1 } } }),
      db.qrScanLog.create({
        data: {
          qrCodeId: qr.id,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      }),
    ]);
  }

  static async getPublicProfile(code: string): Promise<PublicQrProfile | null> {
    const qr = await db.qrCode.findFirst({
      where: { code: code.toUpperCase() },
      include: {
        elevator: {
          include: {
            municipality: true,
            technicalData: true,
            maintenanceCompliance: true,
            maintenanceOrg: true,
            complianceIndicator: true,
            certificates: {
              where: { type: "REGISTRATION", status: "ACTIVE" },
              orderBy: { issuedDate: "desc" },
              take: 1,
            },
            inspections: {
              where: { conductedDate: { not: null } },
              orderBy: { conductedDate: "desc" },
              take: 1,
            },
            maintenanceRecords: {
              orderBy: { performedDate: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!qr?.elevator || qr.elevator.deletedAt) {
      return null;
    }

    const elv = qr.elevator;
    const lastInspection = elv.inspections[0];
    const regCert = elv.certificates[0];
    const maint = elv.maintenanceCompliance;
    const lastMaintRecord = elv.maintenanceRecords[0];
    const complianceView = resolveElevatorComplianceView({
      status: elv.status,
      maintenanceOrgId: elv.maintenanceOrgId,
      inspections: elv.inspections,
      maintenanceRecords: elv.maintenanceRecords,
      maintenanceCompliance: maint,
      complianceIndicator: elv.complianceIndicator,
      certificates: elv.certificates,
    });
    const compliance: PublicComplianceFlags = {
      inspectionValid: complianceView.snapshot.inspectionValid,
      certificateValid: complianceView.snapshot.certificateValid,
      maintenanceValid: complianceView.snapshot.maintenanceValid,
      inspectionExpiring: complianceView.snapshot.inspectionExpiring,
      certificateExpiring: complianceView.snapshot.certificateExpiring,
      maintenanceExpiring: complianceView.snapshot.maintenanceExpiring,
      isSuspended: complianceView.snapshot.isSuspended,
    };
    const lastInspectionDate = complianceView.snapshot.lastInspectionDate;
    const lastMaintenanceDate = complianceView.snapshot.lastMaintenanceDate;
    const hasMaintenanceCompany = complianceView.snapshot.hasMaintenanceCompany;

    const base = {
      registryNumber: elv.registryNumber,
      municipality: elv.municipality.nameSq,
      buildingAddress: elv.buildingAddress,
      buildingName: elv.buildingName,
      registrationDate: elv.registrationDate,
      activationDate: elv.activationDate,
      qrCode: qr.code,
      publicUrl: this.buildPublicUrl(qr.code),
      registrationCertificateNumber: regCert?.certificateNumber ?? null,
      registrationCertificateExpiry: regCert?.expiryDate ?? null,
      elevatorType: elv.technicalData?.elevatorType ?? null,
      manufacturer: elv.technicalData?.manufacturer ?? null,
      model: elv.technicalData?.model ?? null,
      serialNumber: elv.technicalData?.serialNumber ?? null,
      capacity: elv.technicalData?.capacityKg ? `${elv.technicalData.capacityKg} kg` : null,
      floorsServed: elv.technicalData?.floorsServed ?? null,
      maintenanceCompany: elv.maintenanceOrg?.name ?? null,
      lastMaintenanceDate,
      nextMaintenanceDueDate: maint?.nextDueDate ?? null,
      maintenanceCompliant: maint?.isCompliant ?? (hasMaintenanceCompany && Boolean(lastMaintenanceDate)),
      maintenanceDaysOverdue: maint?.daysOverdue ?? 0,
    };

    if (!qr.isActive || elv.status === "DEREGISTERED") {
      const alerts = buildPublicAlerts({
        status: "DEREGISTERED",
        deregistered: true,
        deregistrationDate: elv.deregistrationDate,
        compliance,
        lastInspectionDate: null,
        hasMaintenanceCompany,
        lastMaintenanceDate: null,
        nextInspectionDate: null,
        nextMaintenanceDueDate: null,
        registrationCertificateExpiry: null,
        maintenanceDaysOverdue: 0,
      });

      return {
        ...base,
        status: "DEREGISTERED",
        lastInspectionDate: null,
        lastInspectionType: null,
        nextInspectionDate: null,
        lastInspectionResult: null,
        complianceIndicator: ComplianceIndicator.RED,
        compliance,
        alerts,
        deregistered: true,
        deregistrationDate: elv.deregistrationDate,
        deregistrationReason: elv.deregistrationReason,
      };
    }

    const nextInspectionDate = lastInspection?.nextInspectionDate ?? null;

    const alerts = buildPublicAlerts({
      status: elv.status,
      compliance,
      lastInspectionDate,
      hasMaintenanceCompany,
      lastMaintenanceDate,
      nextInspectionDate,
      nextMaintenanceDueDate: maint?.nextDueDate ?? null,
      registrationCertificateExpiry: regCert?.expiryDate ?? null,
      maintenanceDaysOverdue: maint?.daysOverdue ?? 0,
    });

    return {
      ...base,
      status: elv.status,
      lastInspectionDate,
      lastInspectionType: lastInspection?.type ?? null,
      nextInspectionDate,
      lastInspectionResult: lastInspection?.result ?? null,
      complianceIndicator: complianceView.indicator,
      compliance,
      alerts,
    };
  }

  static async getPrintableData(elevatorId: string, ownerOrgId?: string | null, actorId?: string) {
    const elevator = await db.elevator.findFirst({
      where: {
        id: elevatorId,
        deletedAt: null,
        ...(ownerOrgId ? { ownerOrgId } : {}),
      },
      include: {
        municipality: true,
        ownerOrg: true,
        certificates: { where: { status: "ACTIVE", type: "REGISTRATION" }, take: 1 },
        qrCodes: { where: { isActive: true }, take: 1 },
      },
    });

    if (!elevator) return null;

    let qr = elevator.qrCodes[0];
    const certificate = elevator.certificates[0];

    if (!qr && actorId && ownerOrgId) {
      qr = await db.$transaction((tx) => this.createQrSkeleton(elevatorId, actorId, tx));
    }

    return {
      registryNumber: elevator.registryNumber,
      municipality: elevator.municipality.nameSq,
      buildingAddress: elevator.buildingAddress,
      ownerName: elevator.ownerOrg.name,
      certificateNumber: certificate?.certificateNumber ?? null,
      qrCode: qr?.code ?? null,
      publicUrl: qr ? this.buildPublicUrl(qr.code) : null,
      hasQrImage: Boolean(qr?.imageDocumentId),
      hasPlacementPhoto: Boolean(qr?.placementPhotoDocumentId),
      placementPhotoDocumentId: qr?.placementPhotoDocumentId ?? null,
      qrCodeId: qr?.id ?? null,
      imageDocumentId: qr?.imageDocumentId ?? null,
      certificateDocumentId: certificate?.documentId ?? null,
    };
  }

  /** Krijon kod QR dhe imazhin PNG për ashensorë pa QR (p.sh. import legacy). */
  static async ensureQrForElevator(elevatorId: string, actorId: string) {
    const elevator = await db.elevator.findFirst({
      where: { id: elevatorId, deletedAt: null },
      include: { qrCodes: { where: { isActive: true }, take: 1 } },
    });
    if (!elevator) {
      throw new Error("Ashensori nuk u gjet.");
    }

    let qr = elevator.qrCodes[0];
    if (!qr) {
      qr = await db.$transaction((tx) => this.createQrSkeleton(elevatorId, actorId, tx));
    }

    if (!qr.imageDocumentId) {
      const qrImageBuffer = await this.generateQrImageBuffer(qr.code);
      const qrImageDocument = await DocumentService.uploadSystemDocument({
        buffer: qrImageBuffer,
        originalFilename: `qr-${qr.code}.png`,
        mimeType: "image/png",
        classification: DocumentClassification.TECHNICAL,
        entityType: "qr_code",
        entityId: qr.id,
        purpose: "QR_IMAGE",
        uploadedById: actorId,
      });
      qr = await db.qrCode.update({
        where: { id: qr.id },
        data: { imageDocumentId: qrImageDocument.id },
      });
    }

    return qr;
  }

  static async confirmPlacement(
    qrCodeId: string,
    placementPhotoDocumentId: string,
    actorId: string,
  ) {
    const qr = await db.qrCode.findUnique({
      where: { id: qrCodeId },
      select: { elevatorId: true },
    });
    if (!qr) throw new Error("QR nuk u gjet.");

    return db.$transaction(async (tx) => {
      const updated = await tx.qrCode.update({
        where: { id: qrCodeId },
        data: {
          placementPhotoDocumentId,
          placementConfirmedAt: new Date(),
          placementConfirmedById: actorId,
        },
      });

      const existingElevatorLink = await tx.documentLink.findFirst({
        where: {
          documentId: placementPhotoDocumentId,
          entityType: "elevator",
          entityId: qr.elevatorId,
          purpose: "QR_PLACEMENT_PHOTO",
        },
      });

      if (!existingElevatorLink) {
        await tx.documentLink.create({
          data: {
            documentId: placementPhotoDocumentId,
            entityType: "elevator",
            entityId: qr.elevatorId,
            purpose: "QR_PLACEMENT_PHOTO",
          },
        });
      }

      return updated;
    });
  }

  static hashCodeForLog(code: string) {
    return createHash("sha256").update(code).digest("hex").slice(0, 16);
  }
}
