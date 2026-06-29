import {
  ComplianceIndicator,
  DelegationStatus,
  DelegationType,
  ElevatorStatus,
  MaintenanceContractStatus,
} from "@prisma/client";
import { db } from "@/lib/db";
import { computeElevatorComplianceIndicator, fetchElevatorsForCompliance } from "@/lib/elevators/elevator-compliance-stats";
import { MaintenanceWorkService } from "@/lib/services/maintenance-work-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export class MaintenanceDashboardService {
  static async getDashboard(ctx: AuthContext) {
    if (ctx.roleCode !== ROLE_CODES.MAINTENANCE) {
      throw new Error("Vetëm kompania e mirëmbajtjes mund të shohë këtë panel.");
    }

    const orgId = ctx.activeOrgId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expiryThreshold = addDays(now, 30);

    const [
      activeContracts,
      pendingContracts,
      rejectedContracts,
      interventionsThisMonth,
      assignedElevators,
      pendingList,
    ] = await Promise.all([
      db.maintenanceContract.count({
        where: { maintenanceOrgId: orgId, status: MaintenanceContractStatus.ACTIVE },
      }),
      db.maintenanceContract.count({
        where: { maintenanceOrgId: orgId, status: MaintenanceContractStatus.PENDING },
      }),
      db.elevatorDelegationHistory.count({
        where: {
          organizationId: orgId,
          delegationType: DelegationType.MAINTENANCE,
          status: DelegationStatus.REJECTED,
        },
      }),
      db.maintenanceRecord.count({
        where: {
          maintenanceOrgId: orgId,
          performedDate: { gte: monthStart },
          interventionType: { not: "RAPORT_MUJOR" },
        },
      }),
      MaintenanceWorkService.listAssignedElevators(ctx),
      MaintenanceWorkService.listPendingContracts(ctx),
    ]);

    const missingMonthlyReports = assignedElevators.filter((e) => e.alarmMonthlyReport).length;
    const missingInterventions = assignedElevators.filter((e) => e.alarmNoIntervention).length;
    const missingInspections = assignedElevators.filter((e) => e.alarmNoInspectionRecorded).length;
    const inspectionsDue = assignedElevators.filter((e) => e.inspectionOverdue).length;
    const problemElevators = assignedElevators.filter(
      (e) => e.contractExpiresInDays !== null && e.contractExpiresInDays <= 30,
    ).length;
    const expiringContracts = await db.maintenanceContract.count({
      where: {
        maintenanceOrgId: orgId,
        isActive: true,
        endDate: { lte: expiryThreshold, gte: now },
      },
    });

    const assignedIds = assignedElevators.map((e) => e.elevatorId);
    const complianceRows =
      assignedIds.length > 0
        ? await fetchElevatorsForCompliance({
            id: { in: assignedIds },
            status: ElevatorStatus.ACTIVE,
          })
        : [];
    const redElevators = complianceRows.filter(
      (e) => computeElevatorComplianceIndicator(e) === ComplianceIndicator.RED,
    ).length;

    const requiredActions = [
      ...pendingList.map((c) => ({
        id: c.id,
        title: "Ftesë kontrate - ngarkoni dokumentin",
        subtitle: `${c.elevator?.registryNumber ?? "-"} · ${c.elevator?.buildingAddress ?? "-"}`,
        href: c.elevatorId
          ? `/portal/elevators/${c.elevatorId}?tab=maintenance`
          : "/portal/sherbimi/contracts",
        actionLabel: "Ngarko kontratën dhe prano",
        severity: "warning" as const,
      })),
      ...assignedElevators
        .filter((e) => e.alarmNoIntervention)
        .slice(0, 5)
        .map((e) => ({
          id: `no-int-${e.elevatorId}`,
          title: "Nuk ka ndërhyrje të regjistruar",
          subtitle: e.registryNumber,
          href: "/portal/sherbimi/nderhyrje",
          actionLabel: "Regjistro ndërhyrje",
          severity: "danger" as const,
        })),
      ...assignedElevators
        .filter((e) => e.alarmNoInspectionRecorded)
        .slice(0, 5)
        .map((e) => ({
          id: `no-insp-${e.elevatorId}`,
          title: "Nuk ka inspektim të regjistruar",
          subtitle: e.registryNumber,
          href: "/portal/elevators",
          actionLabel: "Shiko ashensorin",
          severity: "danger" as const,
        })),
      ...assignedElevators
        .filter((e) => e.alarmMonthlyReport)
        .slice(0, 5)
        .map((e) => ({
          id: e.elevatorId,
          title: "Raport mujor i munguar",
          subtitle: e.registryNumber,
          href: "/portal/sherbimi/raport-mujor",
          actionLabel: "Dorëzo raportin",
          severity: "warning" as const,
        })),
      ...assignedElevators
        .filter((e) => e.inspectionOverdue)
        .slice(0, 5)
        .map((e) => ({
          id: `insp-${e.elevatorId}`,
          title: "Inspektim periodik i vonuar",
          subtitle: e.registryNumber,
          href: `/portal/elevators/${e.elevatorId}?tab=maintenance`,
          actionLabel: "Shiko ashensorin",
          severity: "danger" as const,
        })),
    ].slice(0, 15);

    return {
      cards: {
        activeContracts,
        pendingContracts,
        rejectedContracts,
        interventionsThisMonth,
        missingMonthlyReports,
        missingInterventions,
        missingInspections,
        inspectionsDue,
        problemElevators: redElevators + problemElevators,
        expiringContracts,
      },
      requiredActions,
      assignedCount: assignedElevators.length,
    };
  }
}
