import {
  ApplicationStatus,
  FieldInspectionAssignmentStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getNationalComplianceAggregate } from "@/lib/elevators/elevator-compliance-stats";
import { type IshmtAlarm, sortIshmtAlarms } from "@/lib/ishmt/dashboard-alarms";
import { DeadlineService } from "@/lib/deadlines/deadline-service";
import type { AuthContext } from "@/lib/permissions/guards";
import {
  canApproveApplications,
  canReviewApplications,
  isFieldInspectorRole,
} from "@/lib/permissions/ishmt-roles";
import { IshmtContractMonitorService } from "@/lib/services/ishmt-contract-monitor-service";
import { CITIZEN_REPORT_TRIAGE_STATUSES } from "@/lib/ishmt/citizen-report-queue";
import { ROLE_CODES } from "@/lib/constants/roles";

const REVIEW_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.PENDING_CHIEF_INSPECTOR,
];

type AlarmSnapshot = {
  submitted: number;
  underReview: number;
  pendingChief: number;
  procedureOverdue: number;
  procedureUrgent: number;
  redElevators: number;
  yellowElevators: number;
  pendingReports: number;
  pendingMigration: number;
  myFieldScheduled: number;
  myFieldInProgress: number;
  recommendedRejection: number;
  noMaintenanceContract: number;
  noInspectionContract: number;
  maintenanceContractExpiring7: number;
  inspectionContractExpiring7: number;
  maintenanceContractExpired: number;
};

export class IshmtAlarmService {
  static async getAlarms(ctx: AuthContext): Promise<IshmtAlarm[]> {
    const snapshot = await this.fetchSnapshot(ctx);
    const role = ctx.roleCode;

    if (canApproveApplications(role)) {
      return sortIshmtAlarms(this.buildChiefAlarms(snapshot));
    }

    if (role === ROLE_CODES.FIELD_INSPECTOR) {
      return sortIshmtAlarms(this.buildFieldInspectorAlarms(snapshot));
    }

    return sortIshmtAlarms(this.buildOperationalAlarms(snapshot, role));
  }

  private static async fetchSnapshot(ctx: AuthContext): Promise<AlarmSnapshot> {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      submitted,
      underReview,
      pendingChief,
      pendingReports,
      pendingMigration,
      complianceAggregate,
      myFieldScheduled,
      myFieldInProgress,
      recommendedRejection,
      pipelineApps,
      contractStats,
    ] = await Promise.all([
      db.application.count({
        where: { status: ApplicationStatus.SUBMITTED, deletedAt: null },
      }),
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
      getNationalComplianceAggregate(),
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
      db.applicationWorkflowHistory.count({
        where: { action: "RECOMMEND_REJECTION", createdAt: { gte: monthAgo } },
      }),
      db.application.findMany({
        where: {
          deletedAt: null,
          status: { in: REVIEW_STATUSES },
          submittedAt: { not: null },
        },
        select: { id: true, applicationNumber: true, submittedAt: true },
      }),
      IshmtContractMonitorService.getNationalStats(),
    ]);

    const procedure = DeadlineService.summarizeProcedureQueue(pipelineApps);

    return {
      submitted,
      underReview,
      pendingChief,
      procedureOverdue: procedure.overdue,
      procedureUrgent: procedure.urgent,
      redElevators: complianceAggregate.activeRed,
      yellowElevators: complianceAggregate.activeYellow,
      pendingReports,
      pendingMigration,
      myFieldScheduled,
      myFieldInProgress,
      recommendedRejection,
      noMaintenanceContract: contractStats.noMaintenanceContract,
      noInspectionContract: contractStats.noInspectionContract,
      maintenanceContractExpiring7: contractStats.maintenanceContractExpiring7,
      inspectionContractExpiring7: contractStats.inspectionContractExpiring7,
      maintenanceContractExpired: contractStats.maintenanceContractExpired,
    };
  }

  private static contractAlarms(s: AlarmSnapshot): IshmtAlarm[] {
    return [
      {
        id: "no-maintenance-contract",
        priority: "critical",
        label: "Pa kontratë mirëmbajtjeje",
        hint: "Ashensorë aktivë pa kontratë aktive me kompaninë e mirëmbajtjes",
        count: s.noMaintenanceContract,
        href: "/ishmt/contracts?issue=no-maintenance-contract",
      },
      {
        id: "no-inspection-contract",
        priority: "critical",
        label: "Pa kontratë inspektimi (OMI)",
        hint: "Ashensorë aktivë pa kontratë periodike me trupin certifikues",
        count: s.noInspectionContract,
        href: "/ishmt/contracts?issue=no-inspection-contract",
      },
      {
        id: "maintenance-contract-expired",
        priority: "critical",
        label: "Kontrata mirëmbajtjes skaduar",
        hint: "Kontrata aktive me datë mbarimi të kaluar",
        count: s.maintenanceContractExpired,
        href: "/ishmt/contracts?issue=maintenance-contract-expired",
      },
      {
        id: "maintenance-contract-expiring",
        priority: "urgent",
        label: "Kontrata mirëmbajtjes skadon (7 ditë)",
        hint: "Kërkon rinovim ose caktim të kompanisë së re",
        count: s.maintenanceContractExpiring7,
        href: "/ishmt/contracts?issue=maintenance-contract-expiring",
      },
      {
        id: "inspection-contract-expiring",
        priority: "urgent",
        label: "Kontrata inspektimit skadon (7 ditë)",
        hint: "Kërkon rinovim kontrate me OMI-n",
        count: s.inspectionContractExpiring7,
        href: "/ishmt/contracts?issue=inspection-contract-expiring",
      },
    ];
  }

  private static buildChiefAlarms(s: AlarmSnapshot): IshmtAlarm[] {
    return [
      ...this.contractAlarms(s),
      {
        id: "chief-approval",
        priority: "critical",
        label: "Vendim final i papërfunduar",
        hint: "Dosje të shqyrtuara që presin miratimin e kryeinspektorit",
        count: s.pendingChief,
        href: "/ishmt/chief/approvals",
      },
      {
        id: "procedure-overdue",
        priority: "critical",
        label: "Afat procedural i tejkaluar",
        hint: "Aplikime jashtë afatit 10-ditor të shqyrtimit administrativ",
        count: s.procedureOverdue,
        href: "/ishmt/chief/approvals",
      },
      {
        id: "red-compliance",
        priority: "critical",
        label: "Jashtë përputhshmërisë",
        hint: "Ashensorë aktivë me indikator të kuq në regjistër",
        count: s.redElevators,
        href: "/ishmt/search?compliance=RED&status=ACTIVE",
      },
      {
        id: "procedure-urgent",
        priority: "urgent",
        label: "Afat procedural në skadim",
        hint: "Maksimumi 3 ditë pune deri në përfundimin e afatit procedural",
        count: s.procedureUrgent,
        href: "/ishmt/chief/approvals",
      },
      {
        id: "recommended-rejection",
        priority: "warning",
        label: "Rekomandim refuzimi",
        hint: "Dosje me rekomandim refuzimi nga shqyrtimi administrativ",
        count: s.recommendedRejection,
        href: "/ishmt/review",
      },
      {
        id: "yellow-compliance",
        priority: "warning",
        label: "Afat ligjor në skadim",
        hint: "Ashensorë aktivë me indikator të verdhë - inspektim, mirëmbajtje ose certifikatë",
        count: s.yellowElevators,
        href: "/ishmt/search?compliance=YELLOW&status=ACTIVE",
      },
    ];
  }

  private static buildOperationalAlarms(
    s: AlarmSnapshot,
    role: (typeof ROLE_CODES)[keyof typeof ROLE_CODES],
  ): IshmtAlarm[] {
    const canReview = canReviewApplications(role);

    const alarms: IshmtAlarm[] = [
      ...this.contractAlarms(s),
      {
        id: "procedure-overdue",
        priority: "critical",
        label: "Afat procedural i tejkaluar",
        hint: "Aplikime jashtë afatit 10-ditor të shqyrtimit administrativ",
        count: s.procedureOverdue,
        href: "/ishmt/review",
      },
      {
        id: "red-compliance",
        priority: "critical",
        label: "Jashtë përputhshmërisë",
        hint: "Ashensorë aktivë me indikator të kuq në regjistër",
        count: s.redElevators,
        href: "/ishmt/search?compliance=RED&status=ACTIVE",
      },
      {
        id: "procedure-urgent",
        priority: "urgent",
        label: "Afat procedural në skadim",
        hint: "Maksimumi 3 ditë pune deri në përfundimin e afatit procedural",
        count: s.procedureUrgent,
        href: "/ishmt/review",
      },
      {
        id: "submitted",
        priority: "urgent",
        label: "Aplikime në pritje marrjeje",
        hint: "Dosje të parashtruara që presin marrjen në shqyrtim",
        count: s.submitted,
        href: "/ishmt/review",
      },
      {
        id: "my-field-active",
        priority: "urgent",
        label: "Detyra të caktuara në terren",
        hint: "Inspektimet tuaja - të planifikuara ose në proces",
        count: s.myFieldScheduled + s.myFieldInProgress,
        href: "/ishmt/my-field-inspections",
      },
      {
        id: "under-review",
        priority: "warning",
        label: "Dosje në shqyrtim",
        hint: "Aplikime në proces shqyrtimi nga inspektori administrativ",
        count: s.underReview,
        href: "/ishmt/review",
      },
      {
        id: "pending-reports",
        priority: "warning",
        label: "Raportime publike",
        hint: "Raportime qytetarësh në pritje të shqyrtimit",
        count: s.pendingReports,
        href: "/ishmt/reports",
      },
      {
        id: "pending-migration",
        priority: "warning",
        label: "Konfirmim regjistrimi",
        hint: "Ashensorë në pritje të konfirmimit nga personi përgjegjës i ashensorit",
        count: s.pendingMigration,
        href: "/ishmt/search?status=PENDING_CONFIRMATION",
      },
      {
        id: "yellow-compliance",
        priority: "warning",
        label: "Afat ligjor në skadim",
        hint: "Ashensorë aktivë me indikator të verdhë - inspektim, mirëmbajtje ose certifikatë",
        count: s.yellowElevators,
        href: "/ishmt/search?compliance=YELLOW&status=ACTIVE",
      },
      {
        id: "pending-chief",
        priority: "info",
        label: "Në pritje të vendimit final",
        hint: "Dosje të dërguara te kryeinspektorit për miratim",
        count: s.pendingChief,
        href: "/ishmt/chief/approvals",
      },
    ];

    return alarms.filter((alarm) => {
      if (
        !canReview &&
        ["submitted", "under-review", "procedure-overdue", "procedure-urgent"].includes(alarm.id)
      ) {
        return false;
      }
      if (alarm.id === "my-field-active" && !isFieldInspectorRole(role)) {
        return false;
      }
      return true;
    });
  }

  private static buildFieldInspectorAlarms(s: AlarmSnapshot): IshmtAlarm[] {
    return [
      {
        id: "my-field-in-progress",
        priority: "critical",
        label: "Inspektim në proces",
        hint: "Detyra të filluara - regjistroni rezultatin e inspektimit",
        count: s.myFieldInProgress,
        href: "/ishmt/my-field-inspections",
      },
      {
        id: "my-field-scheduled",
        priority: "urgent",
        label: "Inspektimet e planifikuara",
        hint: "Detyra të reja - konfirmoni planifikimin dhe filloni inspektimin",
        count: s.myFieldScheduled,
        href: "/ishmt/my-field-inspections",
      },
    ];
  }
}
