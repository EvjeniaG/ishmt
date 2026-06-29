import { AuditAction, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type AuditLogInput = {
  actorId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeState?: Prisma.InputJsonValue | null;
  afterState?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
};

export class AuditService {
  static async logSensitiveView(
    actorId: string,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.log({
      actorId,
      action: AuditAction.VIEW_SENSITIVE_RECORD,
      entityType,
      entityId,
      metadata,
    });
  }

  static async logDocumentDownload(
    actorId: string,
    entityType: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.log({
      actorId,
      action: AuditAction.DOWNLOAD_DOCUMENT,
      entityType,
      entityId,
      metadata,
    });
  }

  static async log(input: AuditLogInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? db;

    return client.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeState: input.beforeState ?? Prisma.JsonNull,
        afterState: input.afterState ?? Prisma.JsonNull,
        metadata: input.metadata ?? Prisma.JsonNull,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        correlationId: input.correlationId ?? null,
      },
    });
  }
}
