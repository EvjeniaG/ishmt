import { ComplianceIndicator, ElevatorStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withDemoDataElevatorScope } from "@/lib/demo/demo-data-mode";
import { resolveElevatorComplianceView } from "@/lib/elevators/resolve-elevator-compliance";

export const ELEVATOR_COMPLIANCE_INCLUDE = {
  inspections: {
    where: { conductedDate: { not: null } },
    orderBy: { conductedDate: "desc" as const },
    take: 1,
  },
  maintenanceRecords: { orderBy: { performedDate: "desc" as const }, take: 1 },
  maintenanceCompliance: true,
  complianceIndicator: true,
  certificates: { where: { type: "REGISTRATION" as const, status: "ACTIVE" as const }, take: 1 },
} satisfies Prisma.ElevatorInclude;

export type ElevatorForCompliance = {
  status: ElevatorStatus;
  maintenanceOrgId: string | null;
  inspections: Array<{ conductedDate: Date | null; nextInspectionDate?: Date | null }>;
  maintenanceRecords: Array<{ performedDate: Date }>;
  maintenanceCompliance: {
    lastMaintenanceDate: Date | null;
    nextDueDate: Date | null;
    isCompliant: boolean;
    daysOverdue: number;
  } | null;
  complianceIndicator: {
    indicator?: ComplianceIndicator;
    inspectionValid: boolean;
    certificateValid: boolean;
    maintenanceValid: boolean;
    inspectionExpiring: boolean;
    certificateExpiring: boolean;
    maintenanceExpiring: boolean;
    isSuspended: boolean;
  } | null;
  certificates: Array<{ expiryDate: Date | null }>;
};

export type ComplianceAggregate = {
  green: number;
  yellow: number;
  red: number;
  byIndicator: { indicator: ComplianceIndicator; _count: { indicator: number } }[];
  gapCounts: {
    missingInspection: number;
    missingMaintenanceCompany: number;
    missingMaintenanceRecord: number;
  };
  activeRed: number;
  activeYellow: number;
};

export type MunicipalComplianceRow = {
  municipalityId: string;
  name: string;
  code: string;
  green: number;
  yellow: number;
  red: number;
  total: number;
};

export function computeElevatorComplianceIndicator(elv: ElevatorForCompliance): ComplianceIndicator {
  return resolveElevatorComplianceView(elv).indicator;
}

export function aggregateComplianceFromElevators(
  elevators: ElevatorForCompliance[],
): ComplianceAggregate {
  let green = 0;
  let yellow = 0;
  let red = 0;
  let activeRed = 0;
  let activeYellow = 0;
  const gapCounts = {
    missingInspection: 0,
    missingMaintenanceCompany: 0,
    missingMaintenanceRecord: 0,
  };

  for (const elv of elevators) {
    const view = resolveElevatorComplianceView(elv);
    if (view.indicator === ComplianceIndicator.GREEN) green++;
    else if (view.indicator === ComplianceIndicator.YELLOW) yellow++;
    else red++;

    if (elv.status === ElevatorStatus.ACTIVE && view.indicator === ComplianceIndicator.RED) {
      activeRed++;
    }
    if (elv.status === ElevatorStatus.ACTIVE && view.indicator === ComplianceIndicator.YELLOW) {
      activeYellow++;
    }

    for (const gap of view.gaps) {
      if (gap.key === "missing-inspection") gapCounts.missingInspection++;
      else if (gap.key === "missing-maintenance-company") gapCounts.missingMaintenanceCompany++;
      else if (gap.key === "missing-maintenance-record") gapCounts.missingMaintenanceRecord++;
    }
  }

  return {
    green,
    yellow,
    red,
    byIndicator: [
      { indicator: ComplianceIndicator.GREEN, _count: { indicator: green } },
      { indicator: ComplianceIndicator.YELLOW, _count: { indicator: yellow } },
      { indicator: ComplianceIndicator.RED, _count: { indicator: red } },
    ],
    gapCounts,
    activeRed,
    activeYellow,
  };
}

export function aggregateComplianceByMunicipality(
  elevators: Array<
    ElevatorForCompliance & {
      municipalityId: string;
      municipality: { nameSq: string; code: string };
    }
  >,
): MunicipalComplianceRow[] {
  const map = new Map<string, MunicipalComplianceRow>();

  for (const elv of elevators) {
    const key = elv.municipalityId;
    const entry = map.get(key) ?? {
      municipalityId: key,
      name: elv.municipality.nameSq,
      code: elv.municipality.code,
      green: 0,
      yellow: 0,
      red: 0,
      total: 0,
    };
    entry.total++;
    const indicator = computeElevatorComplianceIndicator(elv);
    if (indicator === ComplianceIndicator.GREEN) entry.green++;
    else if (indicator === ComplianceIndicator.YELLOW) entry.yellow++;
    else entry.red++;
    map.set(key, entry);
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function fetchElevatorsForCompliance(where: Prisma.ElevatorWhereInput = {}) {
  return db.elevator.findMany({
    where: withDemoDataElevatorScope({ deletedAt: null, ...where }),
    include: ELEVATOR_COMPLIANCE_INCLUDE,
  });
}

export async function getNationalComplianceAggregate(
  where: Prisma.ElevatorWhereInput = {},
): Promise<ComplianceAggregate> {
  const elevators = await fetchElevatorsForCompliance(where);
  return aggregateComplianceFromElevators(elevators);
}

export async function countActiveRedElevators(where: Prisma.ElevatorWhereInput = {}): Promise<number> {
  const aggregate = await getNationalComplianceAggregate({
    status: ElevatorStatus.ACTIVE,
    ...where,
  });
  return aggregate.activeRed;
}
