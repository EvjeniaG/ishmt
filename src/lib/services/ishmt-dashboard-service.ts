import { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ComplianceService } from "@/lib/services/compliance-service";
import { DeadlineService } from "@/lib/deadlines/deadline-service";
import { CITIZEN_REPORT_TRIAGE_STATUSES } from "@/lib/ishmt/citizen-report-queue";

const REVIEW_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.PENDING_CHIEF_INSPECTOR,
];

export class IshmtDashboardService {
  static async getMetrics() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      elevatorTotal,
      elevatorByStatus,
      complianceSummary,
      pendingReview,
      pendingAdmin,
      pendingReports,
      pendingMigration,
      submitted,
      recentApprovals,
      applicationsThisWeek,
      pipelineApps,
    ] = await Promise.all([
      db.elevator.count({ where: { deletedAt: null } }),
      db.elevator.groupBy({
        by: ["status"],
        _count: { status: true },
        where: { deletedAt: null },
      }),
      ComplianceService.getNationalSummary(),
      db.application.count({
        where: { status: ApplicationStatus.UNDER_REVIEW, deletedAt: null },
      }),
      db.application.count({
        where: { status: ApplicationStatus.PENDING_CHIEF_INSPECTOR, deletedAt: null },
      }),
      db.citizenReport.count({
        where: { status: { in: CITIZEN_REPORT_TRIAGE_STATUSES } },
      }),
      db.elevator.count({
        where: { status: "PENDING_CONFIRMATION", deletedAt: null },
      }),
      db.application.count({
        where: { status: ApplicationStatus.SUBMITTED, deletedAt: null },
      }),
      db.application.count({
        where: {
          status: ApplicationStatus.APPROVED,
          approvedAt: { gte: weekAgo },
          deletedAt: null,
        },
      }),
      db.application.count({
        where: { submittedAt: { gte: weekAgo }, deletedAt: null },
      }),
      db.application.findMany({
        where: { deletedAt: null, status: { in: REVIEW_STATUSES }, submittedAt: { not: null } },
        select: { id: true, applicationNumber: true, submittedAt: true },
      }),
    ]);

    const legalDeadlines = DeadlineService.summarizeProcedureQueue(pipelineApps);

    const byMunicipality = await db.elevator.groupBy({
      by: ["municipalityId"],
      _count: { municipalityId: true },
      where: { deletedAt: null, status: "ACTIVE" },
      orderBy: { _count: { municipalityId: "desc" } },
      take: 10,
    });

    const municipalityIds = byMunicipality.map((m) => m.municipalityId);
    const municipalities = await db.geoMunicipality.findMany({
      where: { id: { in: municipalityIds } },
      select: { id: true, nameSq: true },
    });
    const munMap = new Map(municipalities.map((m) => [m.id, m.nameSq]));

    return {
      elevatorTotal,
      elevatorByStatus,
      complianceSummary,
      queues: {
        pendingReview,
        pendingAdmin,
        pendingReports,
        pendingMigration,
        submitted,
        legalDeadlineOverdue: legalDeadlines.overdue,
        legalDeadlineUrgent: legalDeadlines.urgent,
        legalDeadlineInReview: legalDeadlines.inReview,
      },
      activity: {
        recentApprovals,
        applicationsThisWeek,
      },
      topMunicipalities: byMunicipality.map((m) => ({
        municipalityId: m.municipalityId,
        name: munMap.get(m.municipalityId) ?? m.municipalityId,
        count: m._count.municipalityId,
      })),
    };
  }
}
