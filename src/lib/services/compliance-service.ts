import {
  ApplicationStatus,
  BuildingType,
  CertificateStatus,
  ComplianceIndicator,
  ElevatorStatus,
  InspectionResult,
  InspectionType,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getNationalComplianceAggregate } from "@/lib/elevators/elevator-compliance-stats";
import { SystemConfigService, type ComplianceRulesConfig } from "@/lib/services/system-config-service";

export type ComplianceSnapshot = {
  indicator: ComplianceIndicator;
  inspectionValid: boolean;
  certificateValid: boolean;
  maintenanceValid: boolean;
  inspectionExpiring: boolean;
  certificateExpiring: boolean;
  maintenanceExpiring: boolean;
  isSuspended: boolean;
};

export type ComplianceDisplayProfile = {
  indicator: ComplianceIndicator;
  label: string;
  bgClass: string;
  ringClass: string;
  textClass: string;
  dotClass: string;
};

const COMPLIANCE_LABELS: Record<ComplianceIndicator, string> = {
  GREEN: "Në përputhje me kërkesat",
  YELLOW: "Afat ligjor në skadim",
  RED: "Jashtë përputhshmërisë",
};

const COMPLIANCE_DISPLAY: Record<ComplianceIndicator, Omit<ComplianceDisplayProfile, "indicator" | "label">> = {
  GREEN: {
    bgClass: "bg-green-500",
    ringClass: "ring-green-200",
    textClass: "text-green-800",
    dotClass: "bg-green-500",
  },
  YELLOW: {
    bgClass: "bg-yellow-400",
    ringClass: "ring-yellow-200",
    textClass: "text-yellow-900",
    dotClass: "bg-yellow-400",
  },
  RED: {
    bgClass: "bg-red-500",
    ringClass: "ring-red-200",
    textClass: "text-red-800",
    dotClass: "bg-red-500",
  },
};

const MONTHLY_REPORT_TYPE = "RAPORT_MUJOR";

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function inspectionIntervalMonths(buildingType: BuildingType | null | undefined, rules: ComplianceRulesConfig) {
  if (buildingType === BuildingType.WORKPLACE || buildingType === BuildingType.PUBLIC_BUILDING) {
    return rules.inspectionIntervalMonthsWorkplace;
  }
  return rules.inspectionIntervalMonthsDefault;
}

export class ComplianceService {
  static getLabel(indicator: ComplianceIndicator): string {
    return COMPLIANCE_LABELS[indicator];
  }

  static getPublicDisplay(indicator: ComplianceIndicator): ComplianceDisplayProfile {
    return {
      indicator,
      label: this.getLabel(indicator),
      ...COMPLIANCE_DISPLAY[indicator],
    };
  }

  static calculateIndicator(input: {
    status: ElevatorStatus;
    inspectionValid: boolean;
    certificateValid: boolean;
    maintenanceValid: boolean;
    inspectionExpiring: boolean;
    certificateExpiring: boolean;
    maintenanceExpiring: boolean;
  }): ComplianceIndicator {
    if (
      input.status === ElevatorStatus.SUSPENDED ||
      input.status === ElevatorStatus.UNVERIFIED ||
      input.status === ElevatorStatus.PENDING_CONFIRMATION ||
      input.status === ElevatorStatus.DEREGISTERED ||
      !input.inspectionValid ||
      !input.certificateValid ||
      !input.maintenanceValid
    ) {
      return ComplianceIndicator.RED;
    }

    if (input.inspectionExpiring || input.certificateExpiring || input.maintenanceExpiring) {
      return ComplianceIndicator.YELLOW;
    }

    return ComplianceIndicator.GREEN;
  }

  static resolveIndicator(input: {
    status: ElevatorStatus;
    complianceRow?: { indicator: ComplianceIndicator } | null;
    maintenanceCompliant?: boolean | null;
  }): ComplianceIndicator {
    if (input.complianceRow?.indicator) {
      return input.complianceRow.indicator;
    }

    return this.calculateIndicator({
      status: input.status,
      inspectionValid: true,
      certificateValid: true,
      maintenanceValid: input.maintenanceCompliant ?? true,
      inspectionExpiring: false,
      certificateExpiring: false,
      maintenanceExpiring: false,
    });
  }

  static async initializeForElevator(elevatorId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? db;
    const snapshot: ComplianceSnapshot = {
      indicator: ComplianceIndicator.GREEN,
      inspectionValid: true,
      certificateValid: true,
      maintenanceValid: true,
      inspectionExpiring: false,
      certificateExpiring: false,
      maintenanceExpiring: false,
      isSuspended: false,
    };

    return client.elevatorComplianceStatus.upsert({
      where: { elevatorId },
      update: { ...snapshot, lastCalculatedAt: new Date() },
      create: { elevatorId, ...snapshot },
    });
  }

  static async getForElevator(elevatorId: string) {
    return db.elevatorComplianceStatus.findUnique({ where: { elevatorId } });
  }

  /** Compute compliance snapshot from live elevator data. */
  static async computeSnapshotForElevator(
    elevatorId: string,
    rules?: ComplianceRulesConfig,
  ): Promise<ComplianceSnapshot> {
    const config = rules ?? (await SystemConfigService.getComplianceRules());
    const now = new Date();

    const elevator = await db.elevator.findFirst({
      where: { id: elevatorId, deletedAt: null },
      include: {
        originatingApplication: { include: { data: true } },
        certificates: {
          where: { type: "REGISTRATION", status: CertificateStatus.ACTIVE },
          orderBy: { issuedDate: "desc" },
          take: 1,
        },
        maintenanceContracts: { where: { isActive: true, serviceType: "MAINTENANCE" } },
      },
    });

    if (!elevator) {
      throw new Error("Ashensori nuk u gjet.");
    }

    const buildingType = elevator.originatingApplication?.data?.buildingType ?? null;
    const intervalMonths = inspectionIntervalMonths(buildingType, config);
    const isSuspended = elevator.status === ElevatorStatus.SUSPENDED;

    const lastPassInspection = await db.inspection.findFirst({
      where: {
        elevatorId,
        type: InspectionType.PERIODIC,
        result: InspectionResult.PASS,
      },
      orderBy: { conductedDate: "desc" },
    });

    let inspectionValid = true;
    let inspectionExpiring = false;

    if (elevator.status === ElevatorStatus.ACTIVE) {
      if (!lastPassInspection) {
        const base = elevator.registrationDate;
        const due = new Date(base);
        due.setMonth(due.getMonth() + intervalMonths);
        if (due < now) inspectionValid = false;
        else if (daysBetween(now, due) <= config.inspectionWarningDays) inspectionExpiring = true;
      } else {
        const due = lastPassInspection.nextInspectionDate
          ? new Date(lastPassInspection.nextInspectionDate)
          : (() => {
              const d = new Date(lastPassInspection.conductedDate!);
              d.setMonth(d.getMonth() + intervalMonths);
              return d;
            })();
        if (due < now) inspectionValid = false;
        else if (daysBetween(now, due) <= config.inspectionWarningDays) inspectionExpiring = true;
      }

      const lastFail = await db.inspection.findFirst({
        where: {
          elevatorId,
          type: InspectionType.PERIODIC,
          result: InspectionResult.FAIL,
        },
        orderBy: { conductedDate: "desc" },
      });
      if (
        lastFail?.conductedDate &&
        (!lastPassInspection?.conductedDate ||
          lastFail.conductedDate > lastPassInspection.conductedDate)
      ) {
        inspectionValid = false;
      }

      const anyConductedInspection = await db.inspection.findFirst({
        where: { elevatorId, conductedDate: { not: null } },
      });
      if (!anyConductedInspection) {
        inspectionValid = false;
      }
    }

    const activeCert = elevator.certificates[0];
    let certificateValid = Boolean(activeCert);
    let certificateExpiring = false;
    if (activeCert?.expiryDate) {
      const expiry = new Date(activeCert.expiryDate);
      if (expiry < now) certificateValid = false;
      else if (daysBetween(now, expiry) <= config.certificateWarningDays) certificateExpiring = true;
    }

    let maintenanceValid = true;
    let maintenanceExpiring = false;

    if (elevator.status === ElevatorStatus.ACTIVE) {
      const hasMaintContract = elevator.maintenanceContracts.length > 0;
      if (!hasMaintContract) {
        maintenanceValid = false;
      } else {
        const lastIntervention = await db.maintenanceRecord.findFirst({
          where: {
            elevatorId,
            interventionType: { not: MONTHLY_REPORT_TYPE },
          },
          orderBy: { performedDate: "desc" },
        });

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyReport = await db.maintenanceRecord.findFirst({
          where: {
            elevatorId,
            interventionType: MONTHLY_REPORT_TYPE,
            performedDate: { gte: monthStart },
          },
        });

        if (!lastIntervention) {
          maintenanceValid = false;
        } else {
          const daysSince = daysBetween(lastIntervention.performedDate, now);
          if (daysSince > config.maintenanceReportMaxDays && !monthlyReport) {
            maintenanceValid = false;
          } else if (daysSince > config.maintenanceReportMaxDays - 5 && !monthlyReport) {
            maintenanceExpiring = true;
          }
        }
      }
    }

    const indicator = this.calculateIndicator({
      status: elevator.status,
      inspectionValid,
      certificateValid,
      maintenanceValid,
      inspectionExpiring,
      certificateExpiring,
      maintenanceExpiring,
    });

    return {
      indicator,
      inspectionValid,
      certificateValid,
      maintenanceValid,
      inspectionExpiring,
      certificateExpiring,
      maintenanceExpiring,
      isSuspended,
    };
  }

  static async recalculateForElevator(elevatorId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? db;
    const snapshot = await this.computeSnapshotForElevator(elevatorId);

    return client.elevatorComplianceStatus.upsert({
      where: { elevatorId },
      update: { ...snapshot, lastCalculatedAt: new Date() },
      create: { elevatorId, ...snapshot },
    });
  }

  static async recalculateAll(options?: { batchSize?: number }) {
    const batchSize = options?.batchSize ?? 100;
    let processed = 0;
    let cursor: string | undefined;

    while (true) {
      const batch = await db.elevator.findMany({
        where: { deletedAt: null },
        select: { id: true },
        orderBy: { id: "asc" },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });

      if (batch.length === 0) break;

      for (const row of batch) {
        await this.recalculateForElevator(row.id);
        processed++;
      }

      cursor = batch[batch.length - 1]?.id;
      if (batch.length < batchSize) break;
    }

    return { processed };
  }

  static async getNationalSummary() {
    const [aggregate, byStatus, total] = await Promise.all([
      getNationalComplianceAggregate(),
      db.elevator.groupBy({
        by: ["status"],
        _count: { status: true },
        where: { deletedAt: null },
      }),
      db.elevator.count({ where: { deletedAt: null } }),
    ]);

    return { byIndicator: aggregate.byIndicator, byStatus, total, gapCounts: aggregate.gapCounts, activeRed: aggregate.activeRed, activeYellow: aggregate.activeYellow };
  }
}
