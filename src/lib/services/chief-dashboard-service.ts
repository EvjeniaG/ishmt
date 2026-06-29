import {
  ApplicationStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getNationalComplianceAggregate } from "@/lib/elevators/elevator-compliance-stats";
import { DeadlineService } from "@/lib/deadlines/deadline-service";

const PIPELINE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.PENDING_CHIEF_INSPECTOR,
];

export class ChiefDashboardService {
  static async getMetrics() {
    const [
      pendingApproval,
      recommendedRejection,
      approvalsLast30Days,
      rejectionsLast30Days,
      returnsLast30Days,
      queue,
      pipeline,
      elevatorTotal,
      elevatorByStatus,
      complianceAggregate,
      recentDecisions,
      pipelineApps,
    ] = await Promise.all([
      db.application.count({
        where: { status: ApplicationStatus.PENDING_CHIEF_INSPECTOR, deletedAt: null },
      }),
      db.applicationWorkflowHistory.count({
        where: { action: "RECOMMEND_REJECTION", createdAt: { gte: daysAgo(30) } },
      }),
      db.application.count({
        where: { status: ApplicationStatus.APPROVED, approvedAt: { gte: daysAgo(30) }, deletedAt: null },
      }),
      db.applicationWorkflowHistory.count({
        where: { action: "REJECT", createdAt: { gte: daysAgo(30) } },
      }),
      db.applicationWorkflowHistory.count({
        where: { action: "RETURN", createdAt: { gte: daysAgo(30) } },
      }),
      db.application.findMany({
        where: { status: ApplicationStatus.PENDING_CHIEF_INSPECTOR, deletedAt: null },
        include: {
          data: { select: { buildingAddress: true } },
          ownerOrg: { select: { name: true } },
          assignedInspector: { select: { firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: "asc" },
      }),
      db.application.groupBy({
        by: ["status"],
        _count: { status: true },
        where: { deletedAt: null, status: { in: PIPELINE_STATUSES } },
      }),
      db.elevator.count({ where: { deletedAt: null } }),
      db.elevator.groupBy({
        by: ["status"],
        _count: { status: true },
        where: { deletedAt: null },
      }),
      getNationalComplianceAggregate(),
      db.applicationWorkflowHistory.findMany({
        where: { action: { in: ["APPROVE", "REJECT", "RETURN"] } },
        include: {
          actor: { select: { firstName: true, lastName: true } },
          application: { select: { applicationNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      db.application.findMany({
        where: { deletedAt: null, status: { in: PIPELINE_STATUSES }, submittedAt: { not: null } },
        select: { id: true, applicationNumber: true, submittedAt: true },
      }),
    ]);

    const procedureStats = DeadlineService.summarizeProcedureQueue(pipelineApps);

    const now = Date.now();
    const ageBuckets = { fresh: 0, normal: 0, urgent: 0, overdue: 0 };

    for (const app of queue) {
      if (!app.submittedAt) continue;
      const legal = DeadlineService.computeProcedureDeadline(app.submittedAt);
      const remaining = legal.workingDaysRemaining;
      const isOverdue = new Date() > legal.deadlineDate;
      if (isOverdue) ageBuckets.overdue++;
      else if (remaining <= 3) ageBuckets.urgent++;
      else if (remaining <= 7) ageBuckets.normal++;
      else ageBuckets.fresh++;
    }

    const inspectorMap = new Map<string, number>();
    for (const app of queue) {
      if (app.assignedInspector) {
        const name = `${app.assignedInspector.firstName} ${app.assignedInspector.lastName}`;
        inspectorMap.set(name, (inspectorMap.get(name) ?? 0) + 1);
      }
    }

    const compliance = {
      green: complianceAggregate.green,
      yellow: complianceAggregate.yellow,
      red: complianceAggregate.red,
    };

    return {
      kpi: {
        pendingApproval,
        recommendedRejection,
        urgent: procedureStats.urgent,
        overdue: procedureStats.overdue,
        approvalsLast30Days,
        rejectionsLast30Days,
        returnsLast30Days,
      },
      ageBuckets,
      procedureStats,
      pipeline: pipeline.map((p) => ({ status: p.status, count: p._count.status })),
      registry: {
        elevatorTotal,
        byStatus: elevatorByStatus
          .map((e) => ({ status: e.status, count: e._count.status }))
          .sort((a, b) => b.count - a.count),
        compliance,
      },
      inspectorWorkload: [...inspectorMap.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      queue: queue.slice(0, 12).map((app) => {
        const legal = app.submittedAt
          ? DeadlineService.computeProcedureDeadline(app.submittedAt)
          : null;
        const isOverdue = legal ? new Date() > legal.deadlineDate : false;
        return {
          id: app.id,
          applicationNumber: app.applicationNumber,
          type: app.type,
          status: app.status,
          address: app.data?.buildingAddress ?? "-",
          owner: app.ownerOrg.name,
          inspector: app.assignedInspector
            ? `${app.assignedInspector.firstName} ${app.assignedInspector.lastName}`
            : null,
          submittedAt: app.submittedAt,
          workingDaysRemaining: legal?.workingDaysRemaining ?? null,
          isOverdue,
        };
      }),
      recentDecisions: recentDecisions.map((d) => ({
        id: d.id,
        action: d.action,
        applicationNumber: d.application.applicationNumber,
        actor: `${d.actor.firstName} ${d.actor.lastName}`,
        createdAt: d.createdAt,
      })),
    };
  }
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
