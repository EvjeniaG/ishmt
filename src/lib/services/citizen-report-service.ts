import {
  AuditAction,
  CitizenReportStatus,
  CitizenReportType,
  OrgType,
  Prisma,
  ReportPriority,
} from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";
import { ROLE_CODES } from "@/lib/constants/roles";
import { NotificationService } from "@/lib/services/notification-service";
import type { AuthContext } from "@/lib/permissions/guards";

const REPORT_TYPE_SEQUENCE_CODE = "RPT";

export type CreateCitizenReportInput = {
  type: CitizenReportType;
  description: string;
  qrCode?: string | null;
  locationAddress?: string | null;
  reporterName?: string | null;
  reporterEmail?: string | null;
  reporterPhone?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

const TYPE_PRIORITY: Record<CitizenReportType, ReportPriority> = {
  SAFETY_ISSUE: ReportPriority.HIGH,
  NO_QR: ReportPriority.NORMAL,
  COMPLAINT: ReportPriority.NORMAL,
};

export class CitizenReportService {
  private static async nextReportNumber(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const seq = await tx.applicationSequence.upsert({
      where: { year_typeCode: { year, typeCode: REPORT_TYPE_SEQUENCE_CODE } },
      update: { lastSequence: { increment: 1 } },
      create: { year, typeCode: REPORT_TYPE_SEQUENCE_CODE, lastSequence: 1 },
    });
    return `RPT-${year}-${String(seq.lastSequence).padStart(6, "0")}`;
  }

  /** Public, unauthenticated submission. */
  static async create(input: CreateCitizenReportInput) {
    const description = input.description.trim();
    if (description.length < 10) {
      throw new Error("Përshkrimi duhet të ketë të paktën 10 karaktere.");
    }

    let elevatorId: string | null = null;
    let municipalityId: string | null = null;
    if (input.qrCode) {
      const qr = await db.qrCode.findFirst({
        where: { code: input.qrCode.toUpperCase() },
        include: { elevator: { select: { id: true, municipalityId: true } } },
      });
      if (qr?.elevator) {
        elevatorId = qr.elevator.id;
        municipalityId = qr.elevator.municipalityId;
      }
    }

    const report = await db.$transaction(async (tx) => {
      const reportNumber = await this.nextReportNumber(tx);
      return tx.citizenReport.create({
        data: {
          reportNumber,
          type: input.type,
          status: CitizenReportStatus.SUBMITTED,
          priority: TYPE_PRIORITY[input.type],
          description,
          elevatorId,
          municipalityId,
          locationAddress: input.locationAddress?.trim() || null,
          reporterName: input.reporterName?.trim() || null,
          reporterEmail: input.reporterEmail?.trim() || null,
          reporterPhone: input.reporterPhone?.trim() || null,
        },
      });
    });

    await AuditService.log({
      actorId: null,
      action: AuditAction.CREATE,
      entityType: "citizen_report",
      entityId: report.id,
      afterState: { reportNumber: report.reportNumber, type: report.type },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });

    const ishmtOrgs = await db.organization.findMany({
      where: { type: OrgType.ISHMT, deletedAt: null },
      select: { id: true },
    });
    await Promise.all(
      ishmtOrgs.map((org) =>
        NotificationService.notifyOrgMembers(org.id, {
          title: "Raportim i ri nga qytetari",
          body: `Raporti ${report.reportNumber} (${report.type}) pret shqyrtim.`,
          entityType: "citizen_report",
          entityId: report.id,
        }),
      ),
    );

    return report;
  }

  static async listForReview(filters?: {
    status?: CitizenReportStatus;
    statuses?: CitizenReportStatus[];
    type?: CitizenReportType;
    assignedToMe?: boolean;
    inspectorId?: string;
  }) {
    const where: Prisma.CitizenReportWhereInput = {};
    if (filters?.statuses?.length) {
      where.status = { in: filters.statuses };
    } else if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.type) where.type = filters.type;
    if (filters?.assignedToMe && filters.inspectorId) {
      where.assignedInspectorId = filters.inspectorId;
    }

    const closedStatuses: CitizenReportStatus[] = [
      CitizenReportStatus.RESOLVED,
      CitizenReportStatus.DISMISSED,
    ];
    const isClosedRegistry =
      Boolean(filters?.statuses?.length) &&
      filters!.statuses!.every((status) => closedStatuses.includes(status));

    return db.citizenReport.findMany({
      where,
      include: {
        elevator: { select: { id: true, registryNumber: true } },
        municipality: { select: { nameSq: true } },
        assignedInspector: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: isClosedRegistry
        ? [{ resolvedAt: "desc" }, { createdAt: "desc" }]
        : [{ priority: "desc" }, { createdAt: "desc" }],
    });
  }

  static async getById(reportId: string) {
    const report = await db.citizenReport.findFirst({
      where: { id: reportId },
      include: {
        elevator: { select: { id: true, registryNumber: true } },
        municipality: { select: { nameSq: true } },
        assignedInspector: { select: { id: true, firstName: true, lastName: true } },
        actions: {
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { firstName: true, lastName: true } } },
        },
      },
    });
    if (!report) throw new Error("Raporti nuk u gjet.");
    return report;
  }

  static async assignToSelf(ctx: AuthContext, reportId: string) {
    if (ctx.roleCode !== ROLE_CODES.FIELD_INSPECTOR) {
      throw new Error("Vetëm inspektorët e terrenit mund të merren raportin në ngarkim.");
    }

    const report = await db.citizenReport.findFirst({ where: { id: reportId } });
    if (!report) throw new Error("Raporti nuk u gjet.");

    const fromStatus = report.status;
    const toStatus =
      fromStatus === CitizenReportStatus.SUBMITTED || fromStatus === CitizenReportStatus.TRIAGED
        ? CitizenReportStatus.ASSIGNED
        : fromStatus;

    await db.$transaction(async (tx) => {
      await tx.citizenReport.update({
        where: { id: reportId },
        data: { assignedInspectorId: ctx.userId, status: toStatus },
      });
      await tx.citizenReportAction.create({
        data: { reportId, action: "ASSIGNED", actorId: ctx.userId, comment: null },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "citizen_report",
          entityId: reportId,
          beforeState: { status: fromStatus },
          afterState: { status: toStatus, assignedInspectorId: ctx.userId },
        },
        tx,
      );
    });

    return this.getById(reportId);
  }

  static async updateStatus(
    ctx: AuthContext,
    reportId: string,
    status: CitizenReportStatus,
    comment?: string | null,
  ) {
    const report = await db.citizenReport.findFirst({ where: { id: reportId } });
    if (!report) throw new Error("Raporti nuk u gjet.");

    const isClosing =
      status === CitizenReportStatus.RESOLVED || status === CitizenReportStatus.DISMISSED;
    if (isClosing && !comment?.trim()) {
      throw new Error("Shkruani një shënim para mbylljes së raportit.");
    }

    await db.$transaction(async (tx) => {
      await tx.citizenReport.update({
        where: { id: reportId },
        data: {
          status,
          resolvedAt: isClosing ? new Date() : report.resolvedAt,
          resolutionNotes: isClosing ? comment?.trim() : report.resolutionNotes,
        },
      });
      await tx.citizenReportAction.create({
        data: { reportId, action: status, actorId: ctx.userId, comment: comment?.trim() || null },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "citizen_report",
          entityId: reportId,
          beforeState: { status: report.status },
          afterState: { status },
        },
        tx,
      );
    });

    return this.getById(reportId);
  }
}
