import { ElevatorStatus, MaintenanceContractStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withDemoDataElevatorScope } from "@/lib/demo/demo-data-mode";
import {
  ISSUE_TYPES_BY_CATEGORY,
  type ContractIssueListFilters,
} from "@/lib/ishmt/contract-issue-filters";

const ACTIVE_ELEVATOR_BASE = {
  deletedAt: null,
  status: ElevatorStatus.ACTIVE,
} as const;

function activeElevatorWhere(extra: Prisma.ElevatorWhereInput = {}): Prisma.ElevatorWhereInput {
  return withDemoDataElevatorScope({ ...ACTIVE_ELEVATOR_BASE, ...extra });
}

export type IshmtContractStats = {
  totalActive: number;
  noMaintenanceContract: number;
  noInspectionContract: number;
  pendingMaintenanceContract: number;
  pendingInspectionContract: number;
  maintenanceContractExpiring30: number;
  maintenanceContractExpiring7: number;
  inspectionContractExpiring30: number;
  inspectionContractExpiring7: number;
  maintenanceContractExpired: number;
  inspectionContractExpired: number;
};

export type IshmtContractIssueRow = {
  elevatorId: string;
  ownerOrgId: string;
  maintenanceOrgId: string | null;
  certifierOrgId: string | null;
  registryNumber: string;
  buildingAddress: string;
  municipality: string;
  ownerName: string;
  ownerNipt: string | null;
  issueType: string;
  issueLabel: string;
  severity: "critical" | "warning" | "info";
  dueDate: Date | null;
  maintenanceCompany: string | null;
  inspectionCompany: string | null;
  contractEndDate: Date | null;
};

export type IshmtContractIssuesPage = {
  items: IshmtContractIssueRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const CONTRACT_ISSUES_PAGE_SIZE = 50;

const ISSUE_ELEVATOR_INCLUDE = {
  municipality: { select: { nameSq: true } },
  ownerOrg: { select: { name: true, nipt: true } },
  maintenanceOrg: { select: { id: true, name: true } },
  certifierOrg: { select: { id: true, name: true } },
  maintenanceContracts: {
    where: { isActive: true },
    include: { maintenanceOrg: { select: { id: true, name: true } } },
    orderBy: { endDate: "desc" as const },
  },
} as const;

type ElevatorForIssues = {
  id: string;
  ownerOrgId: string;
  registryNumber: string;
  buildingAddress: string;
  maintenanceOrgId: string | null;
  municipality: { nameSq: string };
  ownerOrg: { name: string; nipt: string | null };
  maintenanceOrg: { id: string; name: string } | null;
  certifierOrg: { id: string; name: string } | null;
  maintenanceContracts: Array<{
    serviceType: string;
    status: MaintenanceContractStatus;
    endDate: Date | null;
    maintenanceOrg: { id: string; name: string };
  }>;
};

function sortIssueRows(rows: IshmtContractIssueRow[]): IshmtContractIssueRow[] {
  return [...rows].sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return a.registryNumber.localeCompare(b.registryNumber);
  });
}

function buildIssueRowsForElevators(
  elevators: ElevatorForIssues[],
  now = new Date(),
): IshmtContractIssueRow[] {
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  const rows: IshmtContractIssueRow[] = [];

  for (const elv of elevators) {
    const maintActive = elv.maintenanceContracts.find(
      (c) => c.serviceType === "MAINTENANCE" && c.status === MaintenanceContractStatus.ACTIVE,
    );
    const maintPending = elv.maintenanceContracts.find(
      (c) => c.serviceType === "MAINTENANCE" && c.status === MaintenanceContractStatus.PENDING,
    );
    const inspActive = elv.maintenanceContracts.find(
      (c) => c.serviceType === "PERIODIC_INSPECTION" && c.status === MaintenanceContractStatus.ACTIVE,
    );
    const inspPending = elv.maintenanceContracts.find(
      (c) => c.serviceType === "PERIODIC_INSPECTION" && c.status === MaintenanceContractStatus.PENDING,
    );

    const base = {
      elevatorId: elv.id,
      ownerOrgId: elv.ownerOrgId,
      maintenanceOrgId:
        maintActive?.maintenanceOrg.id ??
        maintPending?.maintenanceOrg.id ??
        elv.maintenanceOrgId ??
        null,
      certifierOrgId:
        inspActive?.maintenanceOrg.id ??
        inspPending?.maintenanceOrg.id ??
        elv.certifierOrg?.id ??
        null,
      registryNumber: elv.registryNumber,
      buildingAddress: elv.buildingAddress,
      municipality: elv.municipality.nameSq,
      ownerName: elv.ownerOrg.name,
      ownerNipt: elv.ownerOrg.nipt,
      maintenanceCompany: maintActive?.maintenanceOrg.name ?? elv.maintenanceOrg?.name ?? null,
      inspectionCompany: inspActive?.maintenanceOrg.name ?? elv.certifierOrg?.name ?? null,
      contractEndDate: null as Date | null,
    };

    if (!maintActive && !maintPending) {
      rows.push({
        ...base,
        issueType: "no-maintenance-contract",
        issueLabel: !elv.maintenanceOrgId
          ? "Pa kompani dhe kontratë mirëmbajtjeje"
          : "Pa kontratë mirëmbajtjeje aktive",
        severity: "critical",
        dueDate: null,
      });
    }

    if (!inspActive) {
      rows.push({
        ...base,
        issueType: "no-inspection-contract",
        issueLabel: "Pa kontratë kontrolli periodik (OM)",
        severity: "critical",
        dueDate: null,
      });
    }

    if (maintPending) {
      rows.push({
        ...base,
        issueType: "pending-maintenance-contract",
        issueLabel: "Kontratë mirëmbajtjeje në pritje pranimi",
        severity: "warning",
        dueDate: maintPending.endDate,
        contractEndDate: maintPending.endDate,
      });
    }

    if (inspPending) {
      rows.push({
        ...base,
        issueType: "pending-inspection-contract",
        issueLabel: "Kontratë kontrolli periodik në pritje pranimi",
        severity: "warning",
        dueDate: inspPending.endDate,
        contractEndDate: inspPending.endDate,
      });
    }

    if (maintActive?.endDate) {
      const days = daysBetween(now, maintActive.endDate);
      if (days < 0) {
        rows.push({
          ...base,
          issueType: "maintenance-contract-expired",
          issueLabel: "Kontrata e mirëmbajtjes ka skaduar",
          severity: "critical",
          dueDate: maintActive.endDate,
          contractEndDate: maintActive.endDate,
        });
      } else if (maintActive.endDate <= in30) {
        rows.push({
          ...base,
          issueType: "maintenance-contract-expiring",
          issueLabel: `Kontrata mirëmbajtjes skadon (${days} ditë)`,
          severity: days <= 7 ? "critical" : "warning",
          dueDate: maintActive.endDate,
          contractEndDate: maintActive.endDate,
        });
      }
    }

    if (inspActive?.endDate) {
      const days = daysBetween(now, inspActive.endDate);
      if (days < 0) {
        rows.push({
          ...base,
          issueType: "inspection-contract-expired",
          issueLabel: "Kontrata e kontrollit periodik ka skaduar",
          severity: "critical",
          dueDate: inspActive.endDate,
          contractEndDate: inspActive.endDate,
        });
      } else if (inspActive.endDate <= in30) {
        rows.push({
          ...base,
          issueType: "inspection-contract-expiring",
          issueLabel: `Kontrata e kontrollit periodik skadon (${days} ditë)`,
          severity: days <= 7 ? "critical" : "warning",
          dueDate: inspActive.endDate,
          contractEndDate: inspActive.endDate,
        });
      }
    }
  }

  return rows;
}

function applyContractIssueFilters(
  rows: IshmtContractIssueRow[],
  filters: ContractIssueListFilters,
  now = new Date(),
): IshmtContractIssueRow[] {
  let result = rows;

  if (filters.issue) {
    result = result.filter((r) => r.issueType === filters.issue);
  } else if (filters.issueCategory) {
    const types = ISSUE_TYPES_BY_CATEGORY[filters.issueCategory];
    result = result.filter((r) => types.includes(r.issueType));
  }

  if (filters.severity) {
    result = result.filter((r) => r.severity === filters.severity);
  }

  if (filters.expiringWithin) {
    result = result.filter((r) => {
      if (!r.dueDate) return false;
      const days = daysBetween(now, r.dueDate);
      return days >= 0 && days <= filters.expiringWithin!;
    });
  }

  if (filters.q) {
    const q = filters.q.toLowerCase();
    result = result.filter((r) =>
      [
        r.registryNumber,
        r.buildingAddress,
        r.ownerName,
        r.ownerNipt,
        r.municipality,
        r.maintenanceCompany,
        r.inspectionCompany,
        r.issueLabel,
      ].some((v) => v?.toLowerCase().includes(q)),
    );
  }

  return result;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export const CONTRACT_ISSUES_EXPORT_MAX = 10_000;

export class IshmtContractMonitorService {
  static async getNationalStats(now = new Date()): Promise<IshmtContractStats> {
    const in30 = new Date(now);
    in30.setDate(in30.getDate() + 30);
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);

    const [
      totalActive,
      noMaintenanceContract,
      noInspectionContract,
      pendingMaintenanceContract,
      pendingInspectionContract,
      maintenanceContractExpiring30,
      maintenanceContractExpiring7,
      inspectionContractExpiring30,
      inspectionContractExpiring7,
      maintenanceContractExpired,
      inspectionContractExpired,
    ] = await Promise.all([
      db.elevator.count({ where: activeElevatorWhere() }),
      db.elevator.count({
        where: activeElevatorWhere({
          maintenanceContracts: {
            none: {
              serviceType: "MAINTENANCE",
              status: MaintenanceContractStatus.ACTIVE,
              isActive: true,
            },
          },
        }),
      }),
      db.elevator.count({
        where: activeElevatorWhere({
          maintenanceContracts: {
            none: {
              serviceType: "PERIODIC_INSPECTION",
              status: MaintenanceContractStatus.ACTIVE,
              isActive: true,
            },
          },
        }),
      }),
      db.maintenanceContract.count({
        where: {
          serviceType: "MAINTENANCE",
          status: MaintenanceContractStatus.PENDING,
          isActive: true,
          elevator: activeElevatorWhere(),
        },
      }),
      db.maintenanceContract.count({
        where: {
          serviceType: "PERIODIC_INSPECTION",
          status: MaintenanceContractStatus.PENDING,
          isActive: true,
          elevator: activeElevatorWhere(),
        },
      }),
      db.maintenanceContract.count({
        where: {
          serviceType: "MAINTENANCE",
          status: MaintenanceContractStatus.ACTIVE,
          isActive: true,
          endDate: { gte: now, lte: in30 },
          elevator: activeElevatorWhere(),
        },
      }),
      db.maintenanceContract.count({
        where: {
          serviceType: "MAINTENANCE",
          status: MaintenanceContractStatus.ACTIVE,
          isActive: true,
          endDate: { gte: now, lte: in7 },
          elevator: activeElevatorWhere(),
        },
      }),
      db.maintenanceContract.count({
        where: {
          serviceType: "PERIODIC_INSPECTION",
          status: MaintenanceContractStatus.ACTIVE,
          isActive: true,
          endDate: { gte: now, lte: in30 },
          elevator: activeElevatorWhere(),
        },
      }),
      db.maintenanceContract.count({
        where: {
          serviceType: "PERIODIC_INSPECTION",
          status: MaintenanceContractStatus.ACTIVE,
          isActive: true,
          endDate: { gte: now, lte: in7 },
          elevator: activeElevatorWhere(),
        },
      }),
      db.maintenanceContract.count({
        where: {
          serviceType: "MAINTENANCE",
          status: MaintenanceContractStatus.ACTIVE,
          isActive: true,
          endDate: { lt: now },
          elevator: activeElevatorWhere(),
        },
      }),
      db.maintenanceContract.count({
        where: {
          serviceType: "PERIODIC_INSPECTION",
          status: MaintenanceContractStatus.ACTIVE,
          isActive: true,
          endDate: { lt: now },
          elevator: activeElevatorWhere(),
        },
      }),
    ]);

    return {
      totalActive,
      noMaintenanceContract,
      noInspectionContract,
      pendingMaintenanceContract,
      pendingInspectionContract,
      maintenanceContractExpiring30,
      maintenanceContractExpiring7,
      inspectionContractExpiring30,
      inspectionContractExpiring7,
      maintenanceContractExpired,
      inspectionContractExpired,
    };
  }

  static async listIssues(
    filters: ContractIssueListFilters = {},
  ): Promise<IshmtContractIssuesPage> {
    const page = Math.max(filters.page ?? 1, 1);
    const pageSize = Math.min(Math.max(CONTRACT_ISSUES_PAGE_SIZE, 1), 100);

    const elevators = await db.elevator.findMany({
      where: activeElevatorWhere({
        ...(filters.municipalityId ? { municipalityId: filters.municipalityId } : {}),
      }),
      include: ISSUE_ELEVATOR_INCLUDE,
      orderBy: { registryNumber: "asc" },
    });

    const allItems = sortIssueRows(buildIssueRowsForElevators(elevators));
    const filtered = applyContractIssueFilters(allItems, filters);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const items = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

    return { items, total, page: safePage, pageSize, totalPages };
  }

  static async listAllFilteredIssues(
    filters: ContractIssueListFilters = {},
    maxRows = CONTRACT_ISSUES_EXPORT_MAX,
  ): Promise<IshmtContractIssueRow[]> {
    const elevators = await db.elevator.findMany({
      where: activeElevatorWhere({
        ...(filters.municipalityId ? { municipalityId: filters.municipalityId } : {}),
      }),
      include: ISSUE_ELEVATOR_INCLUDE,
      orderBy: { registryNumber: "asc" },
    });

    const filtered = applyContractIssueFilters(
      sortIssueRows(buildIssueRowsForElevators(elevators)),
      filters,
    );

    return filtered.slice(0, maxRows);
  }

  /** Kur kërkimi përputhet me ashensor aktiv por nuk ka alarm kontratash. */
  static async findActiveElevatorBySearchQuery(query: string | undefined) {
    const q = query?.trim();
    if (!q) return null;

    return db.elevator.findFirst({
      where: activeElevatorWhere({
        OR: [
          { registryNumber: { contains: q, mode: "insensitive" } },
          { buildingAddress: { contains: q, mode: "insensitive" } },
          { buildingName: { contains: q, mode: "insensitive" } },
          { ownerOrg: { name: { contains: q, mode: "insensitive" } } },
          { ownerOrg: { nipt: { contains: q, mode: "insensitive" } } },
        ],
      }),
      select: {
        id: true,
        registryNumber: true,
        buildingAddress: true,
        municipality: { select: { nameSq: true } },
      },
    });
  }
}
