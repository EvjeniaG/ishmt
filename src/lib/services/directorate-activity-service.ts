import {
  ApplicationStatus,
  ApplicationType,
  OrgType,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  CERTIFIER_ACTIVE_STATUSES,
  INSTALLER_ACTIVE_STATUSES,
} from "@/lib/services/directorate-dashboard-service";

export type CompanyActivityPhase = "all" | "installation" | "certification";
export type CompanyActivityCompanyRole = "installer" | "certifier";

export type CompanyActivityFilters = {
  phase?: CompanyActivityPhase;
  search?: string;
  type?: ApplicationType;
  status?: ApplicationStatus;
  companyId?: string;
  companyRole?: CompanyActivityCompanyRole;
  municipalityId?: string;
  dateFrom?: string;
  dateTo?: string;
};

import { applicationInclude } from "@/lib/services/application-service";

function buildWhere(filters: CompanyActivityFilters): Prisma.ApplicationWhereInput {
  const phase = filters.phase ?? "all";
  const conditions: Prisma.ApplicationWhereInput[] = [
    { deletedAt: null },
    {
      OR: [{ installerOrgId: { not: null } }, { certifierOrgId: { not: null } }],
    },
  ];

  if (filters.status) {
    conditions.push({ status: filters.status });
  } else {
    conditions.push({
      status: {
        notIn: [
          ApplicationStatus.DRAFT,
          ApplicationStatus.CANCELLED,
          ApplicationStatus.REJECTED,
        ],
      },
    });
  }

  if (phase === "installation") {
    conditions.push({ installerOrgId: { not: null } });
    if (!filters.status) {
      conditions.push({ status: { in: INSTALLER_ACTIVE_STATUSES } });
    }
  } else if (phase === "certification") {
    conditions.push({ certifierOrgId: { not: null } });
    if (!filters.status) {
      conditions.push({ status: { in: CERTIFIER_ACTIVE_STATUSES } });
    }
  }

  if (filters.type) {
    conditions.push({ type: filters.type });
  }

  if (filters.companyId) {
    if (filters.companyRole === "installer") {
      conditions.push({ installerOrgId: filters.companyId });
    } else if (filters.companyRole === "certifier") {
      conditions.push({ certifierOrgId: filters.companyId });
    } else {
      conditions.push({
        OR: [
          { installerOrgId: filters.companyId },
          { certifierOrgId: filters.companyId },
        ],
      });
    }
  }

  if (filters.municipalityId) {
    conditions.push({ data: { municipalityId: filters.municipalityId } });
  }

  if (filters.dateFrom || filters.dateTo) {
    const updatedAt: Prisma.DateTimeFilter = {};
    if (filters.dateFrom) updatedAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      updatedAt.lte = end;
    }
    conditions.push({ updatedAt });
  }

  const search = filters.search?.trim();
  if (search) {
    conditions.push({
      OR: [
        { applicationNumber: { contains: search, mode: "insensitive" } },
        { ownerOrg: { name: { contains: search, mode: "insensitive" } } },
        { ownerOrg: { nipt: { contains: search, mode: "insensitive" } } },
        { installerOrg: { name: { contains: search, mode: "insensitive" } } },
        { certifierOrg: { name: { contains: search, mode: "insensitive" } } },
        { data: { buildingAddress: { contains: search, mode: "insensitive" } } },
        { data: { serialNumber: { contains: search, mode: "insensitive" } } },
        { data: { buildingName: { contains: search, mode: "insensitive" } } },
        { originElevator: { registryNumber: { contains: search, mode: "insensitive" } } },
        { targetElevator: { registryNumber: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  return { AND: conditions };
}

export class DirectorateActivityService {
  static async listCompanyActivity(filters: CompanyActivityFilters = {}) {
    return db.application.findMany({
      where: buildWhere(filters),
      include: applicationInclude,
      orderBy: { updatedAt: "desc" },
    });
  }

  static async getCompanyActivityById(id: string) {
    return db.application.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ installerOrgId: { not: null } }, { certifierOrgId: { not: null } }],
      },
      include: applicationInclude,
    });
  }

  static async getFilterOptions() {
    const [companies, municipalities] = await Promise.all([
      db.organization.findMany({
        where: {
          deletedAt: null,
          type: { in: [OrgType.INSTALLER, OrgType.CERTIFIER] },
        },
        select: { id: true, name: true, type: true, nipt: true },
        orderBy: { name: "asc" },
      }),
      db.geoMunicipality.findMany({
        where: { isActive: true },
        select: { id: true, nameSq: true },
        orderBy: { nameSq: "asc" },
      }),
    ]);

    return { companies, municipalities };
  }
}

export type CompanyActivityItem = Awaited<
  ReturnType<typeof DirectorateActivityService.listCompanyActivity>
>[number];

export function parseCompanyActivityFilters(
  params: Record<string, string | undefined>,
): CompanyActivityFilters {
  const phase =
    params.phase === "installation" || params.phase === "certification"
      ? params.phase
      : "all";

  const companyRole =
    params.companyRole === "installer" || params.companyRole === "certifier"
      ? params.companyRole
      : undefined;

  const type = Object.values(ApplicationType).includes(params.type as ApplicationType)
    ? (params.type as ApplicationType)
    : undefined;

  const status = Object.values(ApplicationStatus).includes(params.status as ApplicationStatus)
    ? (params.status as ApplicationStatus)
    : undefined;

  return {
    phase,
    search: params.q?.trim() || undefined,
    type,
    status,
    companyId: params.companyId || undefined,
    companyRole,
    municipalityId: params.municipalityId || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };
}

const ACTIVITY_QUERY_KEYS = [
  "phase",
  "q",
  "type",
  "status",
  "companyId",
  "companyRole",
  "municipalityId",
  "dateFrom",
  "dateTo",
] as const;

export function serializeCompanyActivityQuery(
  params: Record<string, string | undefined>,
): string {
  const sp = new URLSearchParams();
  for (const key of ACTIVITY_QUERY_KEYS) {
    const value = params[key];
    if (value) sp.set(key, value);
  }
  const serialized = sp.toString();
  return serialized ? `?${serialized}` : "";
}
