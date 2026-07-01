import { ApplicationStatus, ComplianceIndicator, ElevatorStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ELEVATOR_COMPLIANCE_INCLUDE } from "@/lib/elevators/elevator-compliance-stats";
import { resolveElevatorComplianceView } from "@/lib/elevators/resolve-elevator-compliance";
import type { ComplianceDisplayProfile } from "@/lib/services/compliance-service";
import { AuditService } from "@/lib/audit/audit-service";
import { AuditAction } from "@prisma/client";
import type { AuthContext } from "@/lib/permissions/guards";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export type ComplianceGapFilter =
  | "missing-inspection"
  | "missing-maintenance-company"
  | "missing-maintenance-record";

export type NationalSearchFilters = {
  query?: string;
  status?: ElevatorStatus;
  compliance?: ComplianceIndicator;
  complianceGap?: ComplianceGapFilter;
  municipalityId?: string;
  ownerNipt?: string;
  missingQrPlacement?: boolean;
  page?: number;
  pageSize?: number;
};

export type NationalSearchElevatorRow = {
  id: string;
  registryNumber: string;
  status: ElevatorStatus;
  buildingAddress: string;
  municipality: { nameSq: string };
  ownerOrg: { name: string; nipt: string | null };
  technicalData: { serialNumber: string; manufacturer: string } | null;
  compliance: ComplianceDisplayProfile;
  complianceGaps: Array<{ title: string; level: string }>;
  hasActiveQr: boolean;
  hasQrPlacementPhoto: boolean;
};

type ElevatorSearchRecord = {
  id: string;
  registryNumber: string;
  status: ElevatorStatus;
  buildingAddress: string;
  maintenanceOrgId: string | null;
  municipality: { nameSq: string };
  ownerOrg: { name: string; nipt: string | null };
  technicalData: { serialNumber: string | null; manufacturer: string | null } | null;
  inspections: Parameters<typeof resolveElevatorComplianceView>[0]["inspections"];
  maintenanceRecords: Parameters<typeof resolveElevatorComplianceView>[0]["maintenanceRecords"];
  maintenanceCompliance: Parameters<typeof resolveElevatorComplianceView>[0]["maintenanceCompliance"];
  complianceIndicator: Parameters<typeof resolveElevatorComplianceView>[0]["complianceIndicator"];
  certificates: Parameters<typeof resolveElevatorComplianceView>[0]["certificates"];
  qrCodes: Array<{ placementPhotoDocumentId: string | null }>;
};

export const NATIONAL_SEARCH_INCLUDE = {
  municipality: true,
  ownerOrg: { select: { id: true, name: true, nipt: true } },
  technicalData: { select: { serialNumber: true, manufacturer: true, elevatorType: true } },
  building: { select: { id: true, name: true, address: true } },
  qrCodes: {
    where: { isActive: true },
    take: 1,
    select: { placementPhotoDocumentId: true },
  },
  ...ELEVATOR_COMPLIANCE_INCLUDE,
} as const;

export function buildNationalSearchWhere(
  filters: Omit<NationalSearchFilters, "page" | "pageSize">,
): Prisma.ElevatorWhereInput {
  const q = filters.query?.trim();

  return {
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.municipalityId ? { municipalityId: filters.municipalityId } : {}),
    ...(filters.missingQrPlacement
      ? {
          OR: [
            { qrCodes: { none: { isActive: true } } },
            {
              qrCodes: {
                some: {
                  isActive: true,
                  placementPhotoDocumentId: null,
                },
              },
            },
          ],
        }
      : {}),
    ...(filters.ownerNipt
      ? { ownerOrg: { nipt: { equals: filters.ownerNipt.trim().toUpperCase() } } }
      : {}),
    ...(q
      ? {
          OR: [
            { registryNumber: { contains: q, mode: "insensitive" } },
            { buildingAddress: { contains: q, mode: "insensitive" } },
            { buildingName: { contains: q, mode: "insensitive" } },
            { technicalData: { serialNumber: { contains: q, mode: "insensitive" } } },
            { technicalData: { manufacturer: { contains: q, mode: "insensitive" } } },
            { certificates: { some: { certificateNumber: { contains: q, mode: "insensitive" } } } },
            { ownerOrg: { name: { contains: q, mode: "insensitive" } } },
            { ownerOrg: { nipt: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}

function complianceIndicatorFor(elv: ElevatorSearchRecord): ComplianceIndicator {
  return resolveElevatorComplianceView({
    status: elv.status,
    maintenanceOrgId: elv.maintenanceOrgId,
    inspections: elv.inspections,
    maintenanceRecords: elv.maintenanceRecords,
    maintenanceCompliance: elv.maintenanceCompliance,
    complianceIndicator: elv.complianceIndicator,
    certificates: elv.certificates,
  }).indicator;
}

function filterByCompliance(
  items: ElevatorSearchRecord[],
  compliance?: ComplianceIndicator,
): ElevatorSearchRecord[] {
  if (!compliance) return items;
  return items.filter((elv) => complianceIndicatorFor(elv) === compliance);
}

function filterByComplianceGap(
  items: ElevatorSearchRecord[],
  gap?: ComplianceGapFilter,
): ElevatorSearchRecord[] {
  if (!gap) return items;
  return items.filter((elv) => {
    const view = resolveElevatorComplianceView({
      status: elv.status,
      maintenanceOrgId: elv.maintenanceOrgId,
      inspections: elv.inspections,
      maintenanceRecords: elv.maintenanceRecords,
      maintenanceCompliance: elv.maintenanceCompliance,
      complianceIndicator: elv.complianceIndicator,
      certificates: elv.certificates,
    });
    return view.gaps.some((g) => g.key === gap);
  });
}

function applyInMemoryFilters(
  items: ElevatorSearchRecord[],
  filters: Pick<NationalSearchFilters, "compliance" | "complianceGap">,
): ElevatorSearchRecord[] {
  let result = items;
  if (filters.compliance) {
    result = filterByCompliance(result, filters.compliance);
  }
  if (filters.complianceGap) {
    result = filterByComplianceGap(result, filters.complianceGap);
  }
  return result;
}

function toNationalSearchRow(elv: ElevatorSearchRecord): NationalSearchElevatorRow {
  const complianceView = resolveElevatorComplianceView({
    status: elv.status,
    maintenanceOrgId: elv.maintenanceOrgId,
    inspections: elv.inspections,
    maintenanceRecords: elv.maintenanceRecords,
    maintenanceCompliance: elv.maintenanceCompliance,
    complianceIndicator: elv.complianceIndicator,
    certificates: elv.certificates,
  });

  return {
    id: elv.id,
    registryNumber: elv.registryNumber,
    status: elv.status,
    buildingAddress: elv.buildingAddress,
    municipality: { nameSq: elv.municipality.nameSq },
    ownerOrg: { name: elv.ownerOrg.name, nipt: elv.ownerOrg.nipt },
    technicalData: elv.technicalData
      ? {
          serialNumber: elv.technicalData.serialNumber ?? "",
          manufacturer: elv.technicalData.manufacturer ?? "",
        }
      : null,
    compliance: complianceView.display,
    complianceGaps: complianceView.gaps
      .filter((gap) => gap.level !== "info")
      .map((gap) => ({ title: gap.title, level: gap.level })),
    hasActiveQr: Boolean(elv.qrCodes[0]),
    hasQrPlacementPhoto: Boolean(elv.qrCodes[0]?.placementPhotoDocumentId),
  };
}

function hasActiveSearchFilters(filters: NationalSearchFilters): boolean {
  return Boolean(
    filters.query?.trim() ||
      filters.status ||
      filters.compliance ||
      filters.complianceGap ||
      filters.municipalityId ||
      filters.missingQrPlacement ||
      filters.ownerNipt,
  );
}

function needsInMemoryFiltering(filters: NationalSearchFilters): boolean {
  return Boolean(filters.compliance || filters.complianceGap);
}

export class IshmtSearchService {
  static assertIshmtSearch(ctx: AuthContext) {
    if (!isIshmtStaffRole(ctx.roleCode)) {
      throw new Error("Vetëm ISHMT mund të kërkojë në regjistrin kombëtar.");
    }
  }

  /** Të gjithë ashensorët që përputhen me filtrat (pa paginim) - për eksport. */
  static async listAllMatchingElevators(
    ctx: AuthContext,
    filters: Omit<NationalSearchFilters, "page" | "pageSize">,
  ): Promise<ElevatorSearchRecord[]> {
    this.assertIshmtSearch(ctx);
    const where = buildNationalSearchWhere(filters);
    const allItems = await db.elevator.findMany({
      where,
      include: NATIONAL_SEARCH_INCLUDE,
      orderBy: { registryNumber: "asc" },
    });
    return applyInMemoryFilters(allItems as ElevatorSearchRecord[], filters);
  }

  static async searchElevators(ctx: AuthContext, filters: NationalSearchFilters) {
    this.assertIshmtSearch(ctx);
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 25, 100);
    const where = buildNationalSearchWhere(filters);

    if (needsInMemoryFiltering(filters)) {
      const filtered = await this.listAllMatchingElevators(ctx, filters);
      const total = filtered.length;
      const items = filtered
        .slice((page - 1) * pageSize, page * pageSize)
        .map((elv) => toNationalSearchRow(elv));

      if (hasActiveSearchFilters(filters)) {
        await AuditService.log({
          actorId: ctx.userId,
          action: AuditAction.VIEW_SENSITIVE_RECORD,
          entityType: "national_search",
          entityId: ctx.userId,
          metadata: { filters, resultCount: total },
        });
      }

      return { items, total, page, pageSize };
    }

    const [items, total] = await Promise.all([
      db.elevator.findMany({
        where,
        include: NATIONAL_SEARCH_INCLUDE,
        orderBy: { registryNumber: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.elevator.count({ where }),
    ]);

    const enrichedItems = (items as ElevatorSearchRecord[]).map((elv) => toNationalSearchRow(elv));

    if (hasActiveSearchFilters(filters)) {
      await AuditService.log({
        actorId: ctx.userId,
        action: AuditAction.VIEW_SENSITIVE_RECORD,
        entityType: "national_search",
        entityId: ctx.userId,
        metadata: { filters, resultCount: total },
      });
    }

    return { items: enrichedItems, total, page, pageSize };
  }

  static async searchApplications(ctx: AuthContext, query: string, page = 1, pageSize = 20) {
    this.assertIshmtSearch(ctx);
    const q = query.trim();
    if (!q) return { items: [], total: 0, page, pageSize };

    const where: Prisma.ApplicationWhereInput = {
      deletedAt: null,
      OR: [
        { applicationNumber: { contains: q, mode: "insensitive" } },
        { data: { buildingAddress: { contains: q, mode: "insensitive" } } },
        { data: { serialNumber: { contains: q, mode: "insensitive" } } },
        { ownerOrg: { name: { contains: q, mode: "insensitive" } } },
      ],
    };

    const [items, total] = await Promise.all([
      db.application.findMany({
        where,
        include: {
          ownerOrg: { select: { name: true } },
          data: { select: { buildingAddress: true, serialNumber: true } },
        },
        orderBy: { submittedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.application.count({ where }),
    ]);

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.VIEW_SENSITIVE_RECORD,
      entityType: "national_search_applications",
      entityId: ctx.userId,
      metadata: { query: q, resultCount: total },
    });

    return { items, total, page, pageSize };
  }

  static async getElevatorDetail(ctx: AuthContext, elevatorId: string) {
    this.assertIshmtSearch(ctx);

    const elevator = await db.elevator.findFirst({
      where: { id: elevatorId, deletedAt: null },
      include: {
        municipality: true,
        administrativeUnit: true,
        building: true,
        ownerOrg: true,
        installerOrg: true,
        certifierOrg: true,
        maintenanceOrg: true,
        technicalData: true,
        qrCodes: { where: { isActive: true } },
        originatingApplication: { include: { data: true } },
        ...ELEVATOR_COMPLIANCE_INCLUDE,
        certificates: { where: { status: "ACTIVE" }, orderBy: { issuedDate: "desc" } },
      },
    });

    if (!elevator) throw new Error("Ashensori nuk u gjet.");

    const regCerts = elevator.certificates.filter((c) => c.type === "REGISTRATION");
    const complianceView = resolveElevatorComplianceView({
      status: elevator.status,
      maintenanceOrgId: elevator.maintenanceOrgId,
      inspections: elevator.inspections,
      maintenanceRecords: elevator.maintenanceRecords,
      maintenanceCompliance: elevator.maintenanceCompliance,
      complianceIndicator: elevator.complianceIndicator,
      certificates: regCerts.length > 0 ? regCerts : elevator.certificates,
    });

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.VIEW_SENSITIVE_RECORD,
      entityType: "elevator",
      entityId: elevatorId,
    });

    return {
      ...elevator,
      compliance: complianceView.display,
      complianceGaps: complianceView.gaps.filter((g) => g.level !== "info"),
    };
  }
}
