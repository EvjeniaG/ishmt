import {
  ApplicationFieldReviewAssignmentStatus,
  ApplicationStatus,
  ApplicationType,
  DataUpdateType,
  FieldInspectionAssignmentStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/permissions/guards";
import { isFieldInspectorRole } from "@/lib/permissions/ishmt-roles";
import { isTerminalApplicationStatus } from "@/lib/services/application-participation";
import type { FieldInspectionAssignmentRow } from "@/components/ishmt/field-inspection-panels";
import { IshmtFieldInspectionService } from "@/lib/services/ishmt-field-inspection-service";

export type InspectorDocumentReviewRow = {
  assignmentId: string;
  applicationId: string;
  applicationNumber: string;
  type: ApplicationType;
  updateType: DataUpdateType | null;
  status: ApplicationStatus;
  requiresFieldVerification: boolean;
  reviewStatus: ApplicationFieldReviewAssignmentStatus;
  completedAt: Date | null;
  buildingAddress: string | null;
  municipalityName: string | null;
  assignedAt: Date;
};

export type InspectorWorkloadSummary = {
  pendingDocumentReviews: number;
  pendingFieldInspections: number;
  inProgressFieldInspections: number;
  completedDocumentReviews: number;
  completedFieldInspections: number;
};

export class FieldInspectorWorkloadService {
  static assertInspector(ctx: AuthContext) {
    if (!isFieldInspectorRole(ctx.roleCode)) {
      throw new Error("Vetëm inspektorët kanë qasje në këtë panel.");
    }
  }

  static async getSummary(ctx: AuthContext): Promise<InspectorWorkloadSummary> {
    this.assertInspector(ctx);

    const [
      pendingDocumentReviews,
      completedDocumentReviews,
      pendingFieldInspections,
      inProgressFieldInspections,
      completedFieldInspections,
    ] = await Promise.all([
      db.applicationFieldReviewAssignment.count({
        where: {
          inspectorId: ctx.userId,
          status: ApplicationFieldReviewAssignmentStatus.PENDING,
          application: {
            deletedAt: null,
            status: ApplicationStatus.PENDING_FIELD_REVIEW,
          },
        },
      }),
      db.applicationFieldReviewAssignment.count({
        where: {
          inspectorId: ctx.userId,
          status: ApplicationFieldReviewAssignmentStatus.COMPLETED,
        },
      }),
      db.fieldInspectionAssignment.count({
        where: {
          assigneeId: ctx.userId,
          status: FieldInspectionAssignmentStatus.SCHEDULED,
        },
      }),
      db.fieldInspectionAssignment.count({
        where: {
          assigneeId: ctx.userId,
          status: FieldInspectionAssignmentStatus.IN_PROGRESS,
        },
      }),
      db.fieldInspectionAssignment.count({
        where: {
          assigneeId: ctx.userId,
          status: FieldInspectionAssignmentStatus.COMPLETED,
        },
      }),
    ]);

    return {
      pendingDocumentReviews,
      pendingFieldInspections,
      inProgressFieldInspections,
      completedDocumentReviews,
      completedFieldInspections,
    };
  }

  static async listRegistrationPipelineDocumentReviews(
    ctx: AuthContext,
  ): Promise<InspectorDocumentReviewRow[]> {
    this.assertInspector(ctx);

    const rows = await db.applicationFieldReviewAssignment.findMany({
      where: {
        inspectorId: ctx.userId,
        status: { not: ApplicationFieldReviewAssignmentStatus.REPLACED },
        application: {
          deletedAt: null,
          type: ApplicationType.NEW_REGISTRATION,
          submittedAt: { not: null },
          status: { notIn: [ApplicationStatus.CANCELLED] },
        },
      },
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            type: true,
            status: true,
            requiresFieldVerification: true,
            data: {
              select: {
                updateType: true,
                buildingAddress: true,
                municipality: { select: { nameSq: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return rows
      .filter((row) => !isTerminalApplicationStatus(row.application.status))
      .map((row) => ({
        assignmentId: row.id,
        applicationId: row.application.id,
        applicationNumber: row.application.applicationNumber,
        type: row.application.type,
        updateType: row.application.data?.updateType ?? null,
        status: row.application.status,
        requiresFieldVerification: row.application.requiresFieldVerification,
        reviewStatus: row.status,
        completedAt: row.completedAt,
        buildingAddress: row.application.data?.buildingAddress ?? null,
        municipalityName: row.application.data?.municipality?.nameSq ?? null,
        assignedAt: row.createdAt,
      }));
  }

  static async listClosedDocumentReviews(ctx: AuthContext): Promise<InspectorDocumentReviewRow[]> {
    this.assertInspector(ctx);

    const rows = await db.applicationFieldReviewAssignment.findMany({
      where: {
        inspectorId: ctx.userId,
        status: ApplicationFieldReviewAssignmentStatus.COMPLETED,
        application: {
          deletedAt: null,
          type: ApplicationType.NEW_REGISTRATION,
        },
      },
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            type: true,
            status: true,
            requiresFieldVerification: true,
            data: {
              select: {
                updateType: true,
                buildingAddress: true,
                municipality: { select: { nameSq: true } },
              },
            },
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 50,
    });

    return rows
      .filter((row) => isTerminalApplicationStatus(row.application.status))
      .map((row) => ({
        assignmentId: row.id,
        applicationId: row.application.id,
        applicationNumber: row.application.applicationNumber,
        type: row.application.type,
        updateType: row.application.data?.updateType ?? null,
        status: row.application.status,
        requiresFieldVerification: row.application.requiresFieldVerification,
        reviewStatus: row.status,
        completedAt: row.completedAt,
        buildingAddress: row.application.data?.buildingAddress ?? null,
        municipalityName: row.application.data?.municipality?.nameSq ?? null,
        assignedAt: row.createdAt,
      }));
  }

  static async listPendingDocumentReviews(ctx: AuthContext): Promise<InspectorDocumentReviewRow[]> {
    this.assertInspector(ctx);

    const rows = await db.applicationFieldReviewAssignment.findMany({
      where: {
        inspectorId: ctx.userId,
        status: ApplicationFieldReviewAssignmentStatus.PENDING,
        application: {
          deletedAt: null,
          status: ApplicationStatus.PENDING_FIELD_REVIEW,
        },
      },
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            type: true,
            status: true,
            requiresFieldVerification: true,
            data: {
              select: {
                updateType: true,
                buildingAddress: true,
                municipality: { select: { nameSq: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => ({
      assignmentId: row.id,
      applicationId: row.application.id,
      applicationNumber: row.application.applicationNumber,
      type: row.application.type,
      updateType: row.application.data?.updateType ?? null,
      status: row.application.status,
      requiresFieldVerification: row.application.requiresFieldVerification,
      reviewStatus: row.status,
      completedAt: row.completedAt,
      buildingAddress: row.application.data?.buildingAddress ?? null,
      municipalityName: row.application.data?.municipality?.nameSq ?? null,
      assignedAt: row.createdAt,
    }));
  }

  static async listCompletedDocumentReviews(ctx: AuthContext): Promise<InspectorDocumentReviewRow[]> {
    this.assertInspector(ctx);

    const rows = await db.applicationFieldReviewAssignment.findMany({
      where: {
        inspectorId: ctx.userId,
        status: ApplicationFieldReviewAssignmentStatus.COMPLETED,
      },
      include: {
        application: {
          select: {
            id: true,
            applicationNumber: true,
            type: true,
            status: true,
            requiresFieldVerification: true,
            data: {
              select: {
                updateType: true,
                buildingAddress: true,
                municipality: { select: { nameSq: true } },
              },
            },
          },
        },
      },
      orderBy: { completedAt: "desc" },
      take: 50,
    });

    return rows.map((row) => ({
      assignmentId: row.id,
      applicationId: row.application.id,
      applicationNumber: row.application.applicationNumber,
      type: row.application.type,
      updateType: row.application.data?.updateType ?? null,
      status: row.application.status,
      requiresFieldVerification: row.application.requiresFieldVerification,
      reviewStatus: row.status,
      completedAt: row.completedAt,
      buildingAddress: row.application.data?.buildingAddress ?? null,
      municipalityName: row.application.data?.municipality?.nameSq ?? null,
      assignedAt: row.createdAt,
    }));
  }

  static async listFieldInspections(ctx: AuthContext): Promise<FieldInspectionAssignmentRow[]> {
    this.assertInspector(ctx);
    return IshmtFieldInspectionService.listMine(ctx);
  }

  static async getApplicationContextForInspector(
    ctx: AuthContext,
    applicationId: string,
  ): Promise<{
    documentReview: {
      assignmentId: string;
      status: ApplicationFieldReviewAssignmentStatus;
      completedAt: Date | null;
      reportText: string | null;
    } | null;
    fieldInspection: {
      id: string;
      status: FieldInspectionAssignmentStatus;
      scheduledDate: Date;
      verificationResult: string | null;
    } | null;
    requiresFieldVerification: boolean;
  }> {
    this.assertInspector(ctx);

    const [documentReview, fieldInspection, application] = await Promise.all([
      db.applicationFieldReviewAssignment.findFirst({
        where: {
          applicationId,
          inspectorId: ctx.userId,
          status: { not: ApplicationFieldReviewAssignmentStatus.REPLACED },
        },
        select: {
          id: true,
          status: true,
          completedAt: true,
          reportText: true,
        },
      }),
      db.fieldInspectionAssignment.findFirst({
        where: {
          applicationId,
          assigneeId: ctx.userId,
          status: { not: FieldInspectionAssignmentStatus.CANCELLED },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          scheduledDate: true,
          verificationResult: true,
        },
      }),
      db.application.findFirst({
        where: { id: applicationId, deletedAt: null },
        select: { requiresFieldVerification: true },
      }),
    ]);

    return {
      requiresFieldVerification: application?.requiresFieldVerification ?? false,
      documentReview: documentReview
        ? {
            assignmentId: documentReview.id,
            status: documentReview.status,
            completedAt: documentReview.completedAt,
            reportText: documentReview.reportText,
          }
        : null,
      fieldInspection: fieldInspection
        ? {
            id: fieldInspection.id,
            status: fieldInspection.status,
            scheduledDate: fieldInspection.scheduledDate,
            verificationResult: fieldInspection.verificationResult,
          }
        : null,
    };
  }
}
