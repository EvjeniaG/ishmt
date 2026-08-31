import {
  ApplicationStatus,
  ApplicationType,
  AuditAction,
  DocumentAccessAction,
  DocumentClassification,
  FieldInspectionAssignmentStatus,
  MaintenanceContractStatus,
  Prisma,
} from "@prisma/client";
import { createHash } from "crypto";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import { StorageService } from "@/lib/storage/storage-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { canRoleEditApplicationDocuments } from "@/lib/documents/application-document-editing";
import { resolveRegistrationPhase, buildRegistrationPhaseInput } from "@/lib/registration/phase-router";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export type UploadDocumentInput = {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  classification: DocumentClassification;
  entityType: string;
  entityId: string;
  purpose?: string;
};

export class DocumentService {
  static validateUpload(mimeType: string, fileSize: number) {
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error("Lloji i skedarit nuk lejohet.");
    }
    if (fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      throw new Error("Madhësia e skedarit është e pavlefshme (max 20MB).");
    }
  }

  /**
   * Authorizes attaching a document to a target entity, preventing IDOR where a user
   * uploads files against another organization's application/elevator/QR.
   */
  static async assertCanAttachToEntity(ctx: AuthContext, entityType: string, entityId: string) {
    const isIshmtStaff = hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL);
    if (isIshmtStaff) return;

    if (entityType === "application") {
      const { ApplicationService } = await import("@/lib/services/application-service");
      const app = await db.application.findFirst({ where: { id: entityId, deletedAt: null } });
      if (app && (await ApplicationService.canViewApplication(ctx, app))) return;
      throw new Error("Nuk keni leje për të ngarkuar dokumente në këtë aplikim.");
    }

    if (entityType === "elevator" || entityType === "qr_code") {
      const elevator = await this.resolveElevatorFromLink(entityType, entityId);
      if (elevator && (await this.orgCanAccessElevator(ctx, elevator))) {
        return;
      }
      if (elevator && (await this.fieldInspectorCanAttachToElevator(ctx, elevator.id))) {
        return;
      }
      throw new Error("Nuk keni leje për të ngarkuar dokumente për këtë ashensor.");
    }

    if (entityType === "certificate") {
      const cert = await db.certificate.findUnique({
        where: { id: entityId },
        include: { elevator: true },
      });
      if (cert?.elevator.ownerOrgId === ctx.activeOrgId) return;
      throw new Error("Nuk keni leje për të ngarkuar dokumente për këtë certifikatë.");
    }

    throw new Error("Lloji i entitetit nuk lejohet për ngarkim.");
  }

  static async uploadAndLink(ctx: AuthContext, input: UploadDocumentInput) {
    this.validateUpload(input.mimeType, input.buffer.length);
    await this.assertCanAttachToEntity(ctx, input.entityType, input.entityId);
    if (input.entityType === "application") {
      const fieldVerificationUpload =
        this.isFieldVerificationReportUpload(input) &&
        (await this.fieldInspectorCanAttachToApplication(ctx, input.entityId));

      if (!fieldVerificationUpload) {
        await this.assertCanEditApplicationDocuments(ctx, input.entityId);
      }
    }

    const checksum = createHash("sha256").update(input.buffer).digest("hex");
    const storagePath = StorageService.buildObjectKey(
      `${input.classification.toLowerCase()}/${input.entityType}`,
      input.originalFilename,
    );

    await StorageService.upload(storagePath, input.buffer, input.mimeType);

    return db.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          filename: input.originalFilename,
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          fileSize: BigInt(input.buffer.length),
          storagePath,
          checksumSha256: checksum,
          classification: input.classification,
          uploadedById: ctx.userId,
        },
      });

      await tx.documentLink.create({
        data: {
          documentId: document.id,
          entityType: input.entityType,
          entityId: input.entityId,
          purpose: input.purpose,
        },
      });

      await this.recordAccess(tx, {
        documentId: document.id,
        userId: ctx.userId,
        action: DocumentAccessAction.VIEW,
        metadata: { event: "upload" },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.DOCUMENT_UPLOAD,
          entityType: "document",
          entityId: document.id,
          afterState: {
            originalFilename: input.originalFilename,
            classification: input.classification,
            storagePath,
            linkedEntity: input.entityType,
            linkedEntityId: input.entityId,
            purpose: input.purpose,
          },
        },
        tx,
      );

      return document;
    });
  }

  static async uploadSystemDocument(input: {
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
    classification: DocumentClassification;
    entityType: string;
    entityId: string;
    purpose?: string;
    uploadedById: string;
  }) {
    this.validateUpload(input.mimeType, input.buffer.length);

    const checksum = createHash("sha256").update(input.buffer).digest("hex");
    const storagePath = StorageService.buildObjectKey(
      `system/${input.entityType}`,
      input.originalFilename,
    );

    await StorageService.upload(storagePath, input.buffer, input.mimeType);

    return db.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          filename: input.originalFilename,
          originalFilename: input.originalFilename,
          mimeType: input.mimeType,
          fileSize: BigInt(input.buffer.length),
          storagePath,
          checksumSha256: checksum,
          classification: input.classification,
          uploadedById: input.uploadedById,
        },
      });

      await tx.documentLink.create({
        data: {
          documentId: document.id,
          entityType: input.entityType,
          entityId: input.entityId,
          purpose: input.purpose,
        },
      });

      return document;
    });
  }

  static async listForEntity(entityType: string, entityId: string, purpose?: string) {
    const links = await db.documentLink.findMany({
      where: {
        entityType,
        entityId,
        ...(purpose ? { purpose } : {}),
      },
      include: {
        document: {
          include: { uploadedBy: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return links.filter((l) => !l.document.deletedAt).map((l) => l.document);
  }

  /** Dokumentet e entitetit me qëllimin (purpose) nga lidhja. */
  static async listLinkedForEntity(entityType: string, entityId: string) {
    const links = await db.documentLink.findMany({
      where: { entityType, entityId },
      include: {
        document: {
          include: { uploadedBy: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return links
      .filter((l) => !l.document.deletedAt)
      .map((l) => ({
        purpose: l.purpose ?? undefined,
        ...this.serializeDocument(l.document),
        uploadedAt:
          l.document.createdAt instanceof Date
            ? l.document.createdAt.toISOString()
            : String(l.document.createdAt),
      }));
  }

  static async listPurposesForEntity(entityType: string, entityId: string) {
    const links = await db.documentLink.findMany({
      where: { entityType, entityId },
      select: { purpose: true, document: { select: { deletedAt: true } } },
    });

    return links
      .filter((link) => !link.document.deletedAt && link.purpose)
      .map((link) => link.purpose as string);
  }

  static async getById(documentId: string) {
    return db.document.findFirst({
      where: { id: documentId, deletedAt: null },
      include: { links: true, uploadedBy: true },
    });
  }

  static async canAccessDocument(ctx: AuthContext, documentId: string) {
    const doc = await this.getById(documentId);
    if (!doc) return { allowed: false as const, doc: null };

    const isIshmtStaff =
      hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL) &&
      hasPermission(ctx, PERMISSIONS.DOCUMENTS_DOWNLOAD);

    const isPlacementPhoto = doc.links.some((l) => l.purpose === "QR_PLACEMENT_PHOTO");

    if (isPlacementPhoto) {
      for (const link of doc.links) {
        const elevator = await this.resolveElevatorFromLink(link.entityType, link.entityId);
        if (!elevator) continue;
        if (elevator.ownerOrgId === ctx.activeOrgId) {
          return { allowed: true as const, doc };
        }
        if (await this.orgCanAccessElevator(ctx, elevator)) {
          return { allowed: true as const, doc };
        }
      }
      if (isIshmtStaff) {
        return { allowed: true as const, doc };
      }
      return { allowed: false as const, doc };
    }

    if (doc.uploadedById === ctx.userId) {
      return { allowed: true as const, doc };
    }

    for (const link of doc.links) {
      if (link.entityType === "application") {
        const { ApplicationService } = await import("@/lib/services/application-service");
        const app = await db.application.findUnique({ where: { id: link.entityId } });
        if (app && (await ApplicationService.canViewApplication(ctx, app))) {
          return { allowed: true as const, doc };
        }
      }
      if (link.entityType === "elevator" || link.entityType === "qr_code") {
        const elevator = await this.resolveElevatorFromLink(link.entityType, link.entityId);
        if (elevator && (await this.orgCanAccessElevator(ctx, elevator))) {
          return { allowed: true as const, doc };
        }
      }
      if (link.entityType === "certificate") {
        const cert = await db.certificate.findUnique({
          where: { id: link.entityId },
          include: { elevator: true },
        });
        if (cert?.elevator.ownerOrgId === ctx.activeOrgId) {
          return { allowed: true as const, doc };
        }
      }
    }

    if (isIshmtStaff) {
      return { allowed: true as const, doc };
    }

    return { allowed: false as const, doc };
  }

  private static async resolveElevatorFromLink(entityType: string, entityId: string) {
    if (entityType === "elevator") {
      return db.elevator.findFirst({ where: { id: entityId, deletedAt: null } });
    }
    if (entityType === "qr_code") {
      const qr = await db.qrCode.findUnique({
        where: { id: entityId },
        include: { elevator: true },
      });
      return qr?.elevator && !qr.elevator.deletedAt ? qr.elevator : null;
    }
    return null;
  }

  /** Field inspector with an open assignment on this elevator (scheduled or in progress). */
  private static async fieldInspectorCanAttachToElevator(ctx: AuthContext, elevatorId: string) {
    if (!hasPermission(ctx, PERMISSIONS.INSPECTIONS_FIELD_CONDUCT)) {
      return false;
    }

    const assignment = await db.fieldInspectionAssignment.findFirst({
      where: {
        elevatorId,
        assigneeId: ctx.userId,
        status: {
          in: [
            FieldInspectionAssignmentStatus.SCHEDULED,
            FieldInspectionAssignmentStatus.IN_PROGRESS,
          ],
        },
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }

  /** Field inspector with an open field-verification assignment on this application. */
  private static async fieldInspectorCanAttachToApplication(ctx: AuthContext, applicationId: string) {
    if (!hasPermission(ctx, PERMISSIONS.INSPECTIONS_FIELD_CONDUCT)) {
      return false;
    }

    const assignment = await db.fieldInspectionAssignment.findFirst({
      where: {
        applicationId,
        assigneeId: ctx.userId,
        status: {
          in: [
            FieldInspectionAssignmentStatus.SCHEDULED,
            FieldInspectionAssignmentStatus.IN_PROGRESS,
          ],
        },
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }

  private static isFieldVerificationReportUpload(input: UploadDocumentInput) {
    return (
      input.entityType === "application" &&
      input.purpose === "FIELD_VERIFICATION_REPORT" &&
      input.classification === DocumentClassification.INSPECTION_REPORT
    );
  }

  /** Owner, assigned maintenance/certifier org, or org with pending/active service contract. */
  private static async orgCanAccessElevator(
    ctx: AuthContext,
    elevator: {
      id: string;
      ownerOrgId: string | null;
      maintenanceOrgId: string | null;
      certifierOrgId: string | null;
    },
  ) {
    if (!ctx.activeOrgId) return false;
    if (
      elevator.ownerOrgId === ctx.activeOrgId ||
      elevator.maintenanceOrgId === ctx.activeOrgId ||
      elevator.certifierOrgId === ctx.activeOrgId
    ) {
      return true;
    }
    const contract = await db.maintenanceContract.findFirst({
      where: {
        elevatorId: elevator.id,
        maintenanceOrgId: ctx.activeOrgId,
        status: { in: [MaintenanceContractStatus.PENDING, MaintenanceContractStatus.ACTIVE] },
      },
    });
    return Boolean(contract);
  }

  static async downloadWithAccessLog(ctx: AuthContext, documentId: string) {
    const access = await this.canAccessDocument(ctx, documentId);
    if (!access.allowed || !access.doc) {
      throw new Error("Nuk keni leje për të shkarkuar këtë dokument.");
    }

    const hdrs = await headers();
    const ipAddress = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip");

    await db.$transaction(async (tx) => {
      await this.recordAccess(tx, {
        documentId,
        userId: ctx.userId,
        action: DocumentAccessAction.DOWNLOAD,
        ipAddress,
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.DOWNLOAD_DOCUMENT,
          entityType: "document",
          entityId: documentId,
          metadata: {
            originalFilename: access.doc!.originalFilename,
            classification: access.doc!.classification,
          },
          ipAddress,
        },
        tx,
      );
    });

    const file = await StorageService.download(access.doc.storagePath);
    return { doc: access.doc, ...file };
  }

  // Statuses where the dossier is locked (submitted to IQMT or finalized): documents
  // can no longer be removed by the applicant once review has begun.
  private static readonly LOCKED_FOR_DELETE: ReadonlySet<ApplicationStatus> = new Set([
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.PENDING_CHIEF_INSPECTOR,
    ApplicationStatus.REJECTED,
    ApplicationStatus.APPROVED,
    ApplicationStatus.ELEVATOR_CREATED,
    ApplicationStatus.ASSETS_GENERATED,
    ApplicationStatus.CLOSED,
    ApplicationStatus.CANCELLED,
    ApplicationStatus.EXPIRED,
  ]);

  private static async assertCanEditApplicationDocuments(ctx: AuthContext, applicationId: string) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { delegations: true, data: true },
    });
    if (!application) {
      throw new Error("Aplikimi nuk u gjet.");
    }

    const registrationPhase =
      application.type === ApplicationType.NEW_REGISTRATION
        ? resolveRegistrationPhase(buildRegistrationPhaseInput(application), ctx.roleCode)
        : null;

    if (!canRoleEditApplicationDocuments(ctx.roleCode, application, registrationPhase)) {
      throw new Error(
        "Dokumentet nuk mund të ndryshohen pasi keni përfunduar hapin tuaj. Do të mund t'i ndryshoni vetëm nëse aplikimi kthehet për korrigjim.",
      );
    }

    if (this.LOCKED_FOR_DELETE.has(application.status)) {
      throw new Error("Dokumentet nuk mund të hiqen pasi aplikimi është dorëzuar në IQMT.");
    }

    return application;
  }

  /**
   * Soft-deletes a document the user uploaded by mistake. Only allowed for documents
   * attached to an application that is still being prepared (not yet under IQMT review),
   * and only by the user who uploaded it.
   */
  static async softDelete(ctx: AuthContext, documentId: string) {
    const access = await this.canAccessDocument(ctx, documentId);
    if (!access.allowed || !access.doc) {
      throw new Error("Nuk keni leje për të hequr këtë dokument.");
    }
    const doc = access.doc;

    const appLink = doc.links.find((link) => link.entityType === "application");
    if (!appLink) {
      throw new Error("Ky dokument nuk mund të hiqet.");
    }

    const application = await this.assertCanEditApplicationDocuments(ctx, appLink.entityId);

    if (doc.uploadedById !== ctx.userId) {
      throw new Error("Vetëm personi që e ngarkoi dokumentin mund ta heqë.");
    }

    await db.$transaction(async (tx) => {
      await tx.document.update({
        where: { id: documentId },
        data: { deletedAt: new Date() },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.DELETE,
          entityType: "document",
          entityId: documentId,
          beforeState: {
            originalFilename: doc.originalFilename,
            classification: doc.classification,
            applicationId: application.id,
          },
        },
        tx,
      );
    });

    return { id: documentId };
  }

  private static async recordAccess(
    tx: Prisma.TransactionClient,
    input: {
      documentId: string;
      userId: string;
      action: DocumentAccessAction;
      ipAddress?: string | null;
      metadata?: Record<string, unknown>;
    },
  ) {
    return tx.documentAccessLog.create({
      data: {
        documentId: input.documentId,
        userId: input.userId,
        action: input.action,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }

  static serializeDocument(
    doc: Prisma.DocumentGetPayload<{ include: { uploadedBy: { select: { firstName: true; lastName: true } } } }>,
  ) {
    return {
      id: doc.id,
      originalFilename: doc.originalFilename,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize.toString(),
      classification: doc.classification,
      storagePending: false,
      uploadedAt: doc.createdAt,
      uploadedById: doc.uploadedById,
      uploadedBy: doc.uploadedBy
        ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`
        : null,
    };
  }
}
