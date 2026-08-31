import {
  ApplicationStatus,
  ApplicationFieldReviewAssignmentStatus,
  FieldInspectionAssignmentStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  withDemoDataApplicationScope,
  withDemoDataElevatorScope,
} from "@/lib/demo/demo-data-mode";
import { getNationalComplianceAggregate } from "@/lib/elevators/elevator-compliance-stats";
import { type IshmtAlarm, sortIshmtAlarms } from "@/lib/ishmt/dashboard-alarms";
import { DeadlineService } from "@/lib/deadlines/deadline-service";
import type { AuthContext } from "@/lib/permissions/guards";
import {
  canApproveApplications,
  canDirectApplications,
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
  pendingDirector: number;
  pendingDirectorReport: number;
  pendingSectorHead: number;
  pendingSectorHeadReport: number;
  returnedToInspectors: number;
  returnedToSectorHead: number;
  procedureOverdue: number;
  procedureUrgent: number;
  redElevators: number;
  yellowElevators: number;
  pendingReports: number;
  pendingMigration: number;
  myFieldScheduled: number;
  myFieldInProgress: number;
  myPendingDocumentReviews: number;
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

    if (canDirectApplications(role)) {
      return sortIshmtAlarms(this.buildDirectorAlarms(snapshot));
    }

    if (canReviewApplications(role)) {
      return sortIshmtAlarms(this.buildSectorHeadAlarms(snapshot));
    }

    if (role === ROLE_CODES.FIELD_INSPECTOR) {
      return sortIshmtAlarms(this.buildFieldInspectorAlarms(snapshot));
    }

    return sortIshmtAlarms(this.buildOperationalAlarms(snapshot, role));
  }

  private static sectorHeadActionWhere(ctx: AuthContext, status: ApplicationStatus) {
    return withDemoDataApplicationScope({
      deletedAt: null,
      status,
      OR: [
        { currentAssigneeId: ctx.userId },
        { participations: { some: { userId: ctx.userId, canAct: true } } },
      ],
    });
  }

  private static async fetchSnapshot(ctx: AuthContext): Promise<AlarmSnapshot> {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      submitted,
      underReview,
      pendingChief,
      pendingDirector,
      pendingDirectorReport,
      pendingSectorHead,
      pendingSectorHeadReport,
      returnedToInspectors,
      returnedToSectorHead,
      pendingReports,
      pendingMigration,
      complianceAggregate,
      myFieldScheduled,
      myFieldInProgress,
      myPendingDocumentReviews,
      recommendedRejection,
      pipelineApps,
      contractStats,
    ] = await Promise.all([
      db.application.count({
        where: withDemoDataApplicationScope({
          status: ApplicationStatus.SUBMITTED,
          deletedAt: null,
        }),
      }),
      db.application.count({
        where: withDemoDataApplicationScope({
          status: ApplicationStatus.UNDER_REVIEW,
          deletedAt: null,
        }),
      }),
      db.application.count({
        where: withDemoDataApplicationScope({
          status: ApplicationStatus.PENDING_CHIEF_INSPECTOR,
          deletedAt: null,
        }),
      }),
      db.application.count({
        where: withDemoDataApplicationScope({
          status: ApplicationStatus.PENDING_DIRECTOR,
          deletedAt: null,
        }),
      }),
      db.application.count({
        where: withDemoDataApplicationScope({
          status: ApplicationStatus.PENDING_DIRECTOR_REPORT,
          deletedAt: null,
        }),
      }),
      db.application.count({
        where: this.sectorHeadActionWhere(ctx, ApplicationStatus.PENDING_SECTOR_HEAD),
      }),
      db.application.count({
        where: this.sectorHeadActionWhere(ctx, ApplicationStatus.PENDING_SECTOR_HEAD_REPORT),
      }),
      db.application.count({
        where: this.sectorHeadActionWhere(ctx, ApplicationStatus.RETURNED_TO_INSPECTORS),
      }),
      db.application.count({
        where: this.sectorHeadActionWhere(ctx, ApplicationStatus.RETURNED_TO_SECTOR_HEAD),
      }),
      db.citizenReport.count({
        where: { status: { in: CITIZEN_REPORT_TRIAGE_STATUSES } },
      }),
      db.elevator.count({
        where: withDemoDataElevatorScope({
          status: "PENDING_CONFIRMATION",
          deletedAt: null,
        }),
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
      db.applicationWorkflowHistory.count({
        where: { action: "RECOMMEND_REJECTION", createdAt: { gte: monthAgo } },
      }),
      db.application.findMany({
        where: withDemoDataApplicationScope({
          deletedAt: null,
          status: { in: REVIEW_STATUSES },
          submittedAt: { not: null },
        }),
        select: { id: true, applicationNumber: true, submittedAt: true },
      }),
      IshmtContractMonitorService.getNationalStats(),
    ]);

    const procedure = DeadlineService.summarizeProcedureQueue(pipelineApps);

    return {
      submitted,
      underReview,
      pendingChief,
      pendingDirector,
      pendingDirectorReport,
      pendingSectorHead,
      pendingSectorHeadReport,
      returnedToInspectors,
      returnedToSectorHead,
      procedureOverdue: procedure.overdue,
      procedureUrgent: procedure.urgent,
      redElevators: complianceAggregate.activeRed,
      yellowElevators: complianceAggregate.activeYellow,
      pendingReports,
      pendingMigration,
      myFieldScheduled,
      myFieldInProgress,
      myPendingDocumentReviews,
      recommendedRejection,
      noMaintenanceContract: contractStats.noMaintenanceContract,
      noInspectionContract: contractStats.noInspectionContract,
      maintenanceContractExpiring7: contractStats.maintenanceContractExpiring7,
      inspectionContractExpiring7: contractStats.inspectionContractExpiring7,
      maintenanceContractExpired: contractStats.maintenanceContractExpired,
    };
  }

  private static applicationPipelineAlarms(
    s: AlarmSnapshot,
    hrefs: { submitted: string; underReview: string },
  ): IshmtAlarm[] {
    return [
      {
        id: "submitted",
        priority: "critical",
        label: "Aplikime në pritje marrjeje",
        hint: "Dosje të reja të parashtruara që presin marrjen në shqyrtim ose delegim",
        count: s.submitted,
        href: hrefs.submitted,
      },
      {
        id: "under-review",
        priority: "urgent",
        label: "Dosje në shqyrtim",
        hint: "Aplikime në proces shqyrtimi administrativ",
        count: s.underReview,
        href: hrefs.underReview,
      },
    ];
  }

  private static contractAlarms(s: AlarmSnapshot): IshmtAlarm[] {
    return [
      {
        id: "no-maintenance-contract",
        priority: "critical",
        label: "Pa kontratë mirëmbajtjeje",
        hint: "Ashensorë aktivë pa kontratë aktive me kompaninë e mirëmbajtjes",
        count: s.noMaintenanceContract,
        href: "/ishmt/compliance-digest?issue=no-maintenance-contract#alarmet-lista",
      },
      {
        id: "no-inspection-contract",
        priority: "critical",
        label: "Pa kontratë kontrolli periodik (OM)",
        hint: "Ashensorë aktivë pa kontratë periodike me trupin certifikues",
        count: s.noInspectionContract,
        href: "/ishmt/compliance-digest?issue=no-inspection-contract#alarmet-lista",
      },
      {
        id: "maintenance-contract-expired",
        priority: "critical",
        label: "Kontrata mirëmbajtjes skaduar",
        hint: "Kontrata aktive me datë mbarimi të kaluar",
        count: s.maintenanceContractExpired,
        href: "/ishmt/compliance-digest?issue=maintenance-contract-expired#alarmet-lista",
      },
      {
        id: "maintenance-contract-expiring",
        priority: "urgent",
        label: "Kontrata mirëmbajtjes skadon (7 ditë)",
        hint: "Kërkon rinovim ose caktim të kompanisë së re",
        count: s.maintenanceContractExpiring7,
        href: "/ishmt/compliance-digest?issue=maintenance-contract-expiring#alarmet-lista",
      },
      {
        id: "inspection-contract-expiring",
        priority: "urgent",
        label: "Kontrata e kontrollit periodik skadon (7 ditë)",
        hint: "Kërkon rinovim kontrate me OM-n",
        count: s.inspectionContractExpiring7,
        href: "/ishmt/compliance-digest?issue=inspection-contract-expiring#alarmet-lista",
      },
    ];
  }

  private static buildSectorHeadAlarms(s: AlarmSnapshot): IshmtAlarm[] {
    const pendingDelegation = s.pendingSectorHead + s.returnedToInspectors;
    const pendingReport = s.pendingSectorHeadReport + s.returnedToSectorHead;

    return [
      ...this.contractAlarms(s),
      {
        id: "sector-head-delegation",
        priority: "critical",
        label: "Delegime të reja",
        hint: "Dosje të deleguara nga drejtori - caktoni inspektorët për shqyrtim",
        count: pendingDelegation,
        href: "/ishmt/review?tab=needs_action",
      },
      {
        id: "sector-head-report",
        priority: "critical",
        label: "Raport në pritje",
        hint: "Inspektorët kanë përfunduar - dorëzoni raportin te drejtori",
        count: pendingReport,
        href: "/ishmt/review?tab=needs_action",
      },
      {
        id: "procedure-overdue",
        priority: "critical",
        label: "Afat procedural i tejkaluar",
        hint: "Aplikime jashtë afatit 10-ditor të shqyrtimit administrativ",
        count: s.procedureOverdue,
        href: "/ishmt/review?tab=needs_action",
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
        href: "/ishmt/review?tab=needs_action",
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
        id: "yellow-compliance",
        priority: "warning",
        label: "Afat ligjor në skadim",
        hint: "Ashensorë aktivë me indikator të verdhë - inspektim, mirëmbajtje ose certifikatë",
        count: s.yellowElevators,
        href: "/ishmt/search?compliance=YELLOW&status=ACTIVE",
      },
    ];
  }

  private static buildDirectorAlarms(s: AlarmSnapshot): IshmtAlarm[] {
    const pendingReview = s.pendingDirector + s.pendingDirectorReport;

    return [
      ...this.applicationPipelineAlarms(s, {
        submitted: "/ishmt/review",
        underReview: "/ishmt/review",
      }),
      ...this.contractAlarms(s),
      {
        id: "director-review",
        priority: "critical",
        label: "Dosje në pritje shqyrtimi",
        hint: "Aplikime që presin delegim te përgjegjësi ose raport drejt kryeinspektorit",
        count: pendingReview,
        href: "/ishmt/director/review",
      },
      {
        id: "procedure-overdue",
        priority: "critical",
        label: "Afat procedural i tejkaluar",
        hint: "Aplikime jashtë afatit 10-ditor të shqyrtimit administrativ",
        count: s.procedureOverdue,
        href: "/ishmt/director/review",
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
        href: "/ishmt/director/review",
      },
      {
        id: "recommended-rejection",
        priority: "warning",
        label: "Rekomandim refuzimi",
        hint: "Dosje me rekomandim refuzimi nga shqyrtimi administrativ",
        count: s.recommendedRejection,
        href: "/ishmt/director/review",
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

  private static buildChiefAlarms(s: AlarmSnapshot): IshmtAlarm[] {
    return [
      ...this.applicationPipelineAlarms(s, {
        submitted: "/ishmt/chief/applications",
        underReview: "/ishmt/chief/applications",
      }),
      ...this.contractAlarms(s),
      {
        id: "chief-approval",
        priority: "critical",
        label: "Vendim final i papërfunduar",
        hint: "Dosje të shqyrtuara që presin miratimin e kryeinspektorit",
        count: s.pendingChief,
        href: "/ishmt/chief/applications",
      },
      {
        id: "procedure-overdue",
        priority: "critical",
        label: "Afat procedural i tejkaluar",
        hint: "Aplikime jashtë afatit 10-ditor të shqyrtimit administrativ",
        count: s.procedureOverdue,
        href: "/ishmt/chief/applications",
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
        href: "/ishmt/chief/applications",
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
    const canSeeApplicationQueue =
      canReview ||
      canApproveApplications(role) ||
      canDirectApplications(role) ||
      role === ROLE_CODES.ADMIN;

    const alarms: IshmtAlarm[] = [
      ...(canSeeApplicationQueue
        ? this.applicationPipelineAlarms(s, {
            submitted: "/ishmt/review",
            underReview: "/ishmt/review",
          })
        : []),
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
        id: "my-field-active",
        priority: "urgent",
        label: "Detyra të caktuara në terren",
        hint: "Inspektimet tuaja - të planifikuara ose në proces",
        count: s.myFieldScheduled + s.myFieldInProgress,
        href: "/ishmt/my-field-inspections",
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
        href: "/ishmt/chief/applications",
      },
    ];

    return alarms.filter((alarm) => {
      if (
        !canSeeApplicationQueue &&
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
    const alarms: IshmtAlarm[] = [];

    if (s.myPendingDocumentReviews > 0) {
      alarms.push({
        id: "my-document-reviews",
        priority: "critical",
        label: "Dosje për shqyrtim dokumentacioni",
        hint: "Dosje të reja të caktuara - shqyrtoni dokumentacionin dhe përgatisni raportin",
        count: s.myPendingDocumentReviews,
        href: "/ishmt/my-application-reviews",
      });
    }

    if (s.myFieldInProgress > 0) {
      alarms.push({
        id: "my-field-in-progress",
        priority: "critical",
        label: "Inspektim në proces",
        hint: "Detyra të filluara - regjistroni rezultatin e inspektimit",
        count: s.myFieldInProgress,
        href: "/ishmt/my-field-inspections",
      });
    }

    if (s.myFieldScheduled > 0) {
      alarms.push({
        id: "my-field-scheduled",
        priority: "urgent",
        label: "Inspektimet e planifikuara",
        hint: "Detyra të reja - konfirmoni planifikimin dhe filloni inspektimin",
        count: s.myFieldScheduled,
        href: "/ishmt/my-field-inspections",
      });
    }

    return alarms;
  }
}
