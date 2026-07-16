import { ApplicationStatus, OrgStatus, OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { withDemoDataElevatorScope } from "@/lib/demo/demo-data-mode";

export const INSTALLER_ACTIVE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.PENDING_INSTALLER,
  ApplicationStatus.INSTALLER_INVITED,
  ApplicationStatus.INSTALLER_ACCEPTED,
  ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
];

export const CERTIFIER_ACTIVE_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.PENDING_CERTIFIER,
  ApplicationStatus.CERTIFIER_INVITED,
  ApplicationStatus.CERTIFIER_ACCEPTED,
  ApplicationStatus.CERTIFICATION_IN_PROGRESS,
];

const activityInclude = {
  installerOrg: { select: { id: true, name: true, nipt: true } },
  certifierOrg: { select: { id: true, name: true, nipt: true } },
  ownerOrg: { select: { name: true } },
  data: { select: { buildingAddress: true, serialNumber: true, manufacturer: true } },
} as const;

const PREVIEW_LIMIT = 5;

async function fetchCardMetrics() {
  const now = new Date();
  const expiryThreshold = new Date(now);
  expiryThreshold.setDate(expiryThreshold.getDate() + 30);

  const [
    activeInstallers,
    activeCertifiers,
    expiringLicenses,
    revokedLicenses,
    suspendedCompanies,
    applicationsUsingLicensed,
    activeInstallations,
    activeCertifications,
    registeredElevators,
  ] = await Promise.all([
    db.organization.count({
      where: { type: OrgType.INSTALLER, status: OrgStatus.ACTIVE, deletedAt: null },
    }),
    db.organization.count({
      where: { type: OrgType.CERTIFIER, status: OrgStatus.ACTIVE, deletedAt: null },
    }),
    db.organizationLicense.count({
      where: {
        status: OrgStatus.ACTIVE,
        expiryDate: { lte: expiryThreshold, gte: now },
        organization: { deletedAt: null },
      },
    }),
    db.organizationLicense.count({
      where: { status: OrgStatus.REVOKED },
    }),
    db.organization.count({
      where: {
        type: { in: [OrgType.INSTALLER, OrgType.CERTIFIER] },
        status: OrgStatus.SUSPENDED,
        deletedAt: null,
      },
    }),
    db.application.count({
      where: {
        deletedAt: null,
        status: {
          notIn: [
            ApplicationStatus.DRAFT,
            ApplicationStatus.CANCELLED,
            ApplicationStatus.REJECTED,
          ],
        },
        OR: [{ installerOrgId: { not: null } }, { certifierOrgId: { not: null } }],
      },
    }),
    db.application.count({
      where: {
        deletedAt: null,
        installerOrgId: { not: null },
        status: { in: INSTALLER_ACTIVE_STATUSES },
      },
    }),
    db.application.count({
      where: {
        deletedAt: null,
        certifierOrgId: { not: null },
        status: { in: CERTIFIER_ACTIVE_STATUSES },
      },
    }),
    db.elevator.count({ where: withDemoDataElevatorScope({ deletedAt: null }) }),
  ]);

  return {
    activeInstallers,
    activeCertifiers,
    expiringLicenses,
    revokedLicenses,
    suspendedCompanies,
    applicationsUsingLicensed,
    activeInstallations,
    activeCertifications,
    registeredElevators,
  };
}

async function fetchTopInstallerWorkload(limit?: number) {
  const grouped = await db.application.groupBy({
    by: ["installerOrgId"],
    where: {
      deletedAt: null,
      installerOrgId: { not: null },
      status: { in: INSTALLER_ACTIVE_STATUSES },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    ...(limit ? { take: limit } : {}),
  });

  const orgIds = grouped
    .map((r) => r.installerOrgId)
    .filter((id): id is string => Boolean(id));

  const orgs = await db.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true, nipt: true },
  });
  const orgById = new Map(orgs.map((o) => [o.id, o]));

  return grouped
    .filter((r) => r.installerOrgId)
    .map((r) => ({
      org: orgById.get(r.installerOrgId!),
      count: r._count.id,
    }))
    .filter((r) => r.org);
}

async function fetchTopCertifierWorkload(limit?: number) {
  const grouped = await db.application.groupBy({
    by: ["certifierOrgId"],
    where: {
      deletedAt: null,
      certifierOrgId: { not: null },
      status: { in: CERTIFIER_ACTIVE_STATUSES },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    ...(limit ? { take: limit } : {}),
  });

  const orgIds = grouped
    .map((r) => r.certifierOrgId)
    .filter((id): id is string => Boolean(id));

  const orgs = await db.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true, nipt: true },
  });
  const orgById = new Map(orgs.map((o) => [o.id, o]));

  return grouped
    .filter((r) => r.certifierOrgId)
    .map((r) => ({
      org: orgById.get(r.certifierOrgId!),
      count: r._count.id,
    }))
    .filter((r) => r.org);
}

export class DirectorateDashboardService {
  static async getOverview() {
    const [
      cards,
      activeInstallationApps,
      activeCertificationApps,
      topInstallers,
      topCertifiers,
      recentCompanies,
    ] = await Promise.all([
      fetchCardMetrics(),
      db.application.findMany({
        where: {
          deletedAt: null,
          installerOrgId: { not: null },
          status: { in: INSTALLER_ACTIVE_STATUSES },
        },
        include: activityInclude,
        orderBy: { updatedAt: "desc" },
        take: PREVIEW_LIMIT,
      }),
      db.application.findMany({
        where: {
          deletedAt: null,
          certifierOrgId: { not: null },
          status: { in: CERTIFIER_ACTIVE_STATUSES },
        },
        include: activityInclude,
        orderBy: { updatedAt: "desc" },
        take: PREVIEW_LIMIT,
      }),
      fetchTopInstallerWorkload(PREVIEW_LIMIT),
      fetchTopCertifierWorkload(PREVIEW_LIMIT),
      db.organization.findMany({
        where: {
          deletedAt: null,
          type: { in: [OrgType.INSTALLER, OrgType.CERTIFIER] },
        },
        include: {
          municipality: true,
          licenses: {
            where: { status: OrgStatus.ACTIVE },
            take: 1,
            orderBy: { expiryDate: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: PREVIEW_LIMIT,
      }),
    ]);

    return {
      cards,
      activeInstallationApps,
      activeCertificationApps,
      topInstallers,
      topCertifiers,
      recentCompanies,
    };
  }

  /** @deprecated Use getOverview() */
  static async getMetrics() {
    return this.getOverview();
  }

  static async getActiveInstallations() {
    return db.application.findMany({
      where: {
        deletedAt: null,
        installerOrgId: { not: null },
        status: { in: INSTALLER_ACTIVE_STATUSES },
      },
      include: activityInclude,
      orderBy: { updatedAt: "desc" },
    });
  }

  static async getActiveCertifications() {
    return db.application.findMany({
      where: {
        deletedAt: null,
        certifierOrgId: { not: null },
        status: { in: CERTIFIER_ACTIVE_STATUSES },
      },
      include: activityInclude,
      orderBy: { updatedAt: "desc" },
    });
  }

  static async getInstallerWorkload() {
    return fetchTopInstallerWorkload();
  }

  static async getCertifierWorkload() {
    return fetchTopCertifierWorkload();
  }

  static async getStatusBreakdown() {
    return db.organization.groupBy({
      by: ["type", "status"],
      _count: { id: true },
      where: {
        deletedAt: null,
        type: { in: [OrgType.INSTALLER, OrgType.CERTIFIER] },
      },
    });
  }
}
