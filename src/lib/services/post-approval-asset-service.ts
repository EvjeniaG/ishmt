import { AssetGenerationStatus, DocumentClassification, TemplateType, UsagePurpose } from "@prisma/client";
import { db } from "@/lib/db";
import { PdfService } from "@/lib/services/pdf-service";
import { resolveChiefInspectorDisplayName } from "@/lib/ishmt/chief-inspector";
import { ComplianceService } from "@/lib/services/compliance-service";
import { DocumentService } from "@/lib/services/document-service";
import { QrService } from "@/lib/services/qr-service";
import { USAGE_PURPOSE_LABELS } from "@/lib/constants/owner-labels";
import { EXAMINATION_TYPE_LABELS } from "@/lib/registration/labels";

type CertificateVarInput = {
  certificate: { certificateNumber: string };
  elevator: {
    registryNumber: string;
    buildingAddress: string;
    ownerOrg: { name: string; nipt?: string | null };
    municipality: { nameSq: string };
    technicalData: { elevatorType?: string | null; manufacturer?: string | null; serialNumber?: string | null } | null;
  };
  application: {
    applicationNumber: string;
    installerOrg?: { name: string } | null;
    data:
      | {
          usagePurpose?: UsagePurpose | null;
          serialNumber?: string | null;
          manufacturer?: string | null;
          responsibleEntityName?: string | null;
          responsibleEntityIdentifier?: string | null;
          omiNumber?: string | null;
          examinationType?: string | null;
        }
      | null;
  };
  issuedDate: string;
  actorId: string;
};

/** Builds the variable map for the official registration certificate (and forwarding letter). */
async function buildCertificateVariables(input: CertificateVarInput): Promise<Record<string, string>> {
  const { certificate, elevator, application, issuedDate } = input;
  const data = application.data;

  const usagePurpose = data?.usagePurpose ? USAGE_PURPOSE_LABELS[data.usagePurpose] : undefined;
  const rawExamination = data?.examinationType ?? undefined;
  const examinationType =
    rawExamination && rawExamination in EXAMINATION_TYPE_LABELS
      ? EXAMINATION_TYPE_LABELS[rawExamination as keyof typeof EXAMINATION_TYPE_LABELS]
      : rawExamination;

  const variables: Record<string, string> = {
    certificateNumber: certificate.certificateNumber,
    registryNumber: elevator.registryNumber,
    ownerName: data?.responsibleEntityName ?? elevator.ownerOrg.name,
    municipality: elevator.municipality.nameSq,
    buildingAddress: elevator.buildingAddress,
    applicationNumber: application.applicationNumber,
    issuedDate,
  };

  const serialNumber = elevator.technicalData?.serialNumber ?? data?.serialNumber;
  const manufacturer = elevator.technicalData?.manufacturer ?? data?.manufacturer;
  const responsibleIdentifier = data?.responsibleEntityIdentifier ?? elevator.ownerOrg.nipt ?? undefined;

  if (elevator.technicalData?.elevatorType) variables.elevatorType = elevator.technicalData.elevatorType;
  if (manufacturer) variables.manufacturer = manufacturer;
  if (serialNumber) variables.serialNumber = serialNumber;
  if (input.application.installerOrg?.name) variables.installerName = input.application.installerOrg.name;
  if (usagePurpose) variables.usagePurpose = usagePurpose;
  if (responsibleIdentifier) variables.responsibleIdentifier = responsibleIdentifier;
  if (data?.omiNumber) variables.omiNumber = data.omiNumber;
  if (examinationType) variables.examinationType = examinationType;
  variables.chiefInspectorName = await resolveChiefInspectorDisplayName();

  return variables;
}

export class PostApprovalAssetService {
  static async tryGenerate(input: {
    elevatorId: string;
    certificateId: string;
    qrCodeId: string;
    applicationId: string;
    actorId: string;
  }) {
    await db.application.update({
      where: { id: input.applicationId },
      data: {
        assetGenerationStatus: AssetGenerationStatus.IN_PROGRESS,
        assetGenerationError: null,
      },
    });

    try {
      const assets = await this.generate(input);
      await db.application.update({
        where: { id: input.applicationId },
        data: {
          assetGenerationStatus: AssetGenerationStatus.COMPLETED,
          assetGenerationError: null,
          assetGenerationCompletedAt: new Date(),
        },
      });
      return { success: true as const, assets };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gjenerimi i dokumenteve dështoi.";
      await db.application.update({
        where: { id: input.applicationId },
        data: {
          assetGenerationStatus: AssetGenerationStatus.FAILED,
          assetGenerationError: message,
        },
      });
      return { success: false as const, error: message };
    }
  }

  static async retry(input: {
    applicationId: string;
    actorId: string;
  }) {
    const elevator = await db.elevator.findFirst({
      where: { applicationId: input.applicationId, deletedAt: null },
      include: { certificates: true, qrCodes: true },
    });

    if (!elevator) {
      throw new Error("Ashensori i aplikimit nuk u gjet.");
    }
    const certificate = elevator.certificates.find((c) => c.type === "REGISTRATION" && c.status === "ACTIVE");
    const qr = elevator.qrCodes.find((q) => q.isActive);

    if (!certificate || !qr) {
      throw new Error("Certifikata ose QR nuk u gjetën për riprovim.");
    }

    return this.tryGenerate({
      applicationId: input.applicationId,
      elevatorId: elevator.id,
      certificateId: certificate.id,
      qrCodeId: qr.id,
      actorId: input.actorId,
    });
  }

  static async generate(input: {
    elevatorId: string;
    certificateId: string;
    qrCodeId: string;
    applicationId: string;
    actorId: string;
  }) {
    const application = await db.application.findUnique({
      where: { id: input.applicationId },
      include: {
        data: { include: { municipality: true } },
        ownerOrg: true,
        installerOrg: true,
        certifierOrg: true,
      },
    });

    const elevator = await db.elevator.findUnique({
      where: { id: input.elevatorId },
      include: {
        municipality: true,
        ownerOrg: true,
        technicalData: true,
      },
    });

    const certificate = await db.certificate.findUnique({ where: { id: input.certificateId } });
    const qr = await db.qrCode.findUnique({ where: { id: input.qrCodeId } });

    if (!application || !elevator || !certificate || !qr) {
      throw new Error("Të dhënat për gjenerimin e dokumenteve nuk u gjetën.");
    }

    const issuedDate = new Date().toLocaleDateString("sq-AL");
    const variables = await buildCertificateVariables({
      certificate,
      elevator,
      application,
      issuedDate,
      actorId: input.actorId,
    });

    const certTemplate =
      (await db.documentTemplate.findFirst({
        where: { type: TemplateType.CERTIFICATE, isActive: true },
        orderBy: { version: "desc" },
      }))?.content ?? PdfService.defaultRegistrationCertificateTemplate();

    const letterTemplate =
      (await db.documentTemplate.findFirst({
        where: { type: TemplateType.OFFICIAL_LETTER, isActive: true },
        orderBy: { version: "desc" },
      }))?.content ?? PdfService.defaultForwardingLetterTemplate();

    const certPdf = await PdfService.generateFromTemplate(certTemplate, variables, {
      title: "Certifikatë Regjistrimi",
      documentKind: "certificate",
    });

    const letterPdf = await PdfService.generateFromTemplate(letterTemplate, variables, {
      title: "Letër Zyrtare Përcjellëse",
      documentKind: "letter",
    });

    const certDocument = await DocumentService.uploadSystemDocument({
      buffer: certPdf,
      originalFilename: `${certificate.certificateNumber}.pdf`,
      mimeType: "application/pdf",
      classification: DocumentClassification.CERTIFICATE,
      entityType: "certificate",
      entityId: certificate.id,
      purpose: "REGISTRATION_PDF",
      uploadedById: input.actorId,
    });

    const letterDocument = await DocumentService.uploadSystemDocument({
      buffer: letterPdf,
      originalFilename: `leter-${application.applicationNumber}.pdf`,
      mimeType: "application/pdf",
      classification: DocumentClassification.INTERNAL_ISHMT,
      entityType: "application",
      entityId: application.id,
      purpose: "FORWARDING_LETTER",
      uploadedById: input.actorId,
    });

    const qrImageBuffer = await QrService.generateQrImageBuffer(qr.code);
    const qrImageDocument = await DocumentService.uploadSystemDocument({
      buffer: qrImageBuffer,
      originalFilename: `qr-${qr.code}.png`,
      mimeType: "image/png",
      classification: DocumentClassification.TECHNICAL,
      entityType: "qr_code",
      entityId: qr.id,
      purpose: "QR_IMAGE",
      uploadedById: input.actorId,
    });

    await db.$transaction([
      db.certificate.update({
        where: { id: certificate.id },
        data: { documentId: certDocument.id },
      }),
      db.qrCode.update({
        where: { id: qr.id },
        data: { imageDocumentId: qrImageDocument.id },
      }),
    ]);

    await ComplianceService.initializeForElevator(elevator.id);

    return {
      certificateDocumentId: certDocument.id,
      forwardingLetterDocumentId: letterDocument.id,
      qrImageDocumentId: qrImageDocument.id,
    };
  }

  /** PDF certifikate për korrigjim/përditësim (pa QR të ri). */
  static async generateReplacementCertificatePdf(input: {
    applicationId: string;
    certificateId: string;
    elevatorId: string;
    actorId: string;
  }) {
    const application = await db.application.findUnique({
      where: { id: input.applicationId },
      include: { data: { include: { municipality: true } }, ownerOrg: true, installerOrg: true },
    });
    const elevator = await db.elevator.findUnique({
      where: { id: input.elevatorId },
      include: { municipality: true, ownerOrg: true, technicalData: true },
    });
    const certificate = await db.certificate.findUnique({ where: { id: input.certificateId } });
    if (!application || !elevator || !certificate) {
      throw new Error("Të dhënat për gjenerimin e certifikatës nuk u gjetën.");
    }

    const issuedDate = new Date().toLocaleDateString("sq-AL");
    const variables = await buildCertificateVariables({
      certificate,
      elevator,
      application,
      issuedDate,
      actorId: input.actorId,
    });

    const certTemplate =
      (await db.documentTemplate.findFirst({
        where: { type: TemplateType.CERTIFICATE, isActive: true },
        orderBy: { version: "desc" },
      }))?.content ?? PdfService.defaultRegistrationCertificateTemplate();

    const certPdf = await PdfService.generateFromTemplate(certTemplate, variables, {
      title: "Certifikatë Regjistrimi",
      documentKind: "certificate",
    });

    const letterTemplate =
      (await db.documentTemplate.findFirst({
        where: { type: TemplateType.OFFICIAL_LETTER, isActive: true },
        orderBy: { version: "desc" },
      }))?.content ?? PdfService.defaultForwardingLetterTemplate();

    const letterPdf = await PdfService.generateFromTemplate(letterTemplate, variables, {
      title: "Letër Zyrtare Përcjellëse",
      documentKind: "letter",
    });

    const certDocument = await DocumentService.uploadSystemDocument({
      buffer: certPdf,
      originalFilename: `${certificate.certificateNumber}.pdf`,
      mimeType: "application/pdf",
      classification: DocumentClassification.CERTIFICATE,
      entityType: "certificate",
      entityId: certificate.id,
      purpose: "REGISTRATION_PDF",
      uploadedById: input.actorId,
    });

    await db.certificate.update({
      where: { id: certificate.id },
      data: { documentId: certDocument.id },
    });

    await DocumentService.uploadSystemDocument({
      buffer: letterPdf,
      originalFilename: `leter-${application.applicationNumber}.pdf`,
      mimeType: "application/pdf",
      classification: DocumentClassification.INTERNAL_ISHMT,
      entityType: "application",
      entityId: application.id,
      purpose: "FORWARDING_LETTER",
      uploadedById: input.actorId,
    });

    return { certificateDocumentId: certDocument.id };
  }
}
