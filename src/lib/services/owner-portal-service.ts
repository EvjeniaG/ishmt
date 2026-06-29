import { ApplicationStatus, ElevatorStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveElevatorComplianceView } from "@/lib/elevators/resolve-elevator-compliance";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";

const EXPIRY_WINDOW_DAYS = 30;

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export class OwnerPortalService {
  static assertOwner(ctx: AuthContext) {
    if (ctx.roleCode !== ROLE_CODES.OWNER) {
      throw new Error("Vetëm personi përgjegjës mund të aksesojë këtë modul.");
    }
  }

  static async globalSearch(orgId: string, query: string) {
    const q = query.trim();
    if (!q) return { elevators: [], applications: [] };

    const elevators = await db.elevator.findMany({
      where: {
        ownerOrgId: orgId,
        deletedAt: null,
        OR: [
          { registryNumber: { contains: q, mode: "insensitive" } },
          { buildingAddress: { contains: q, mode: "insensitive" } },
          { technicalData: { serialNumber: { contains: q, mode: "insensitive" } } },
          { certificates: { some: { certificateNumber: { contains: q, mode: "insensitive" } } } },
        ],
      },
      include: { municipality: true, technicalData: true },
      take: 20,
    });

    const applications = await db.application.findMany({
      where: {
        ownerOrgId: orgId,
        deletedAt: null,
        OR: [
          { applicationNumber: { contains: q, mode: "insensitive" } },
          { data: { buildingAddress: { contains: q, mode: "insensitive" } } },
          { data: { serialNumber: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { data: true },
      take: 10,
    });

    return { elevators, applications };
  }

  static async listCertificates(orgId: string) {
    return db.certificate.findMany({
      where: { elevator: { ownerOrgId: orgId, deletedAt: null } },
      include: {
        elevator: { select: { id: true, registryNumber: true, buildingAddress: true } },
      },
      orderBy: { issuedDate: "desc" },
    });
  }

  static async listQrCodes(orgId: string) {
    return db.qrCode.findMany({
      where: { elevator: { ownerOrgId: orgId, deletedAt: null }, isActive: true },
      include: {
        elevator: {
          select: { id: true, registryNumber: true, buildingAddress: true, municipality: { select: { nameSq: true } } },
        },
      },
      orderBy: { generatedAt: "desc" },
    });
  }

  static async listMaintenance(orgId: string) {
    const elevators = await db.elevator.findMany({
      where: { ownerOrgId: orgId, deletedAt: null, status: ElevatorStatus.ACTIVE },
      include: {
        maintenanceOrg: true,
        maintenanceContracts: { where: { isActive: true }, orderBy: { endDate: "desc" }, take: 1 },
        municipality: true,
      },
      orderBy: { registryNumber: "asc" },
    });

    return elevators.map((elv) => ({
      id: elv.id,
      registryNumber: elv.registryNumber,
      address: elv.buildingAddress,
      municipality: elv.municipality.nameSq,
      maintenanceCompany: elv.maintenanceOrg?.name ?? null,
      contract: elv.maintenanceContracts[0] ?? null,
      hasMaintenance: Boolean(elv.maintenanceOrgId),
    }));
  }

  static async listInspections(orgId: string) {
    return db.inspection.findMany({
      where: { elevator: { ownerOrgId: orgId, deletedAt: null } },
      include: {
        elevator: { select: { id: true, registryNumber: true, buildingAddress: true } },
        inspector: { select: { firstName: true, lastName: true } },
      },
      orderBy: { conductedDate: "desc" },
    });
  }

  static async listHistory(orgId: string, limit = 50) {
    const [elevatorIds, applicationIds, orgId_] = await Promise.all([
      db.elevator.findMany({ where: { ownerOrgId: orgId, deletedAt: null }, select: { id: true } }),
      db.application.findMany({ where: { ownerOrgId: orgId, deletedAt: null }, select: { id: true } }),
      orgId,
    ]);

    const eIds = elevatorIds.map((e) => e.id);
    const aIds = applicationIds.map((a) => a.id);

    return db.auditLog.findMany({
      where: {
        OR: [
          { entityType: "organization", entityId: orgId_ },
          { entityType: "elevator", entityId: { in: eIds } },
          { entityType: "application", entityId: { in: aIds } },
          { entityType: "document", entityId: { in: await this.getDocumentIds(eIds, aIds) } },
        ],
      },
      include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  private static async getDocumentIds(elevatorIds: string[], applicationIds: string[]) {
    const links = await db.documentLink.findMany({
      where: {
        OR: [
          { entityType: "elevator", entityId: { in: elevatorIds } },
          { entityType: "application", entityId: { in: applicationIds } },
        ],
      },
      select: { documentId: true },
    });
    return [...new Set(links.map((l) => l.documentId))];
  }

  static async getProfileData(ctx: AuthContext) {
    this.assertOwner(ctx);

    const [user, org] = await Promise.all([
      db.authUser.findUnique({
        where: { id: ctx.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          nid: true,
        },
      }),
      db.organization.findFirst({
        where: { id: ctx.activeOrgId, deletedAt: null },
        include: {
          municipality: { include: { region: true } },
        },
      }),
    ]);

    if (!user || !org) throw new Error("Profili nuk u gjet.");

    return { user, org };
  }

  static async listElevatorsWithFilters(
    orgId: string,
    filters?: {
      status?: string;
      municipalityId?: string;
      missingMaintenance?: boolean;
      complianceIndicator?: string;
      expiringCertificate?: boolean;
      overdueInspection?: boolean;
      missingQrPlacement?: boolean;
    },
  ) {
    const now = new Date();
    const expiryThreshold = addDays(now, EXPIRY_WINDOW_DAYS);

    const elevators = await db.elevator.findMany({
      where: {
        ownerOrgId: orgId,
        deletedAt: null,
        ...(filters?.status ? { status: filters.status as ElevatorStatus } : {}),
        ...(filters?.municipalityId ? { municipalityId: filters.municipalityId } : {}),
        ...(filters?.missingMaintenance ? { maintenanceOrgId: null } : {}),
      },
      include: {
        municipality: true,
        technicalData: true,
        maintenanceOrg: true,
        complianceIndicator: true,
        certificates: { where: { status: "ACTIVE", type: "REGISTRATION" }, take: 1 },
        qrCodes: { where: { isActive: true }, take: 1 },
        inspections: { orderBy: { conductedDate: "desc" }, take: 1 },
        maintenanceRecords: { orderBy: { performedDate: "desc" }, take: 1 },
        maintenanceCompliance: true,
        maintenanceContracts: { where: { isActive: true }, orderBy: { endDate: "desc" }, take: 1 },
      },
      orderBy: { registryNumber: "asc" },
    });

    return elevators
      .filter((elv) => {
        if (filters?.complianceIndicator) {
          const indicator = resolveElevatorComplianceView({
            status: elv.status,
            maintenanceOrgId: elv.maintenanceOrgId,
            inspections: elv.inspections,
            maintenanceRecords: elv.maintenanceRecords,
            maintenanceCompliance: elv.maintenanceCompliance,
            complianceIndicator: elv.complianceIndicator,
            certificates: elv.certificates,
          }).indicator;
          if (indicator !== filters.complianceIndicator) return false;
        }
        if (filters?.expiringCertificate) {
          const cert = elv.certificates[0];
          if (!cert?.expiryDate || cert.expiryDate > expiryThreshold) return false;
        }
        if (filters?.overdueInspection) {
          const next = elv.inspections[0]?.nextInspectionDate;
          if (!next || next >= now) return false;
        }
        if (filters?.missingQrPlacement) {
          const qr = elv.qrCodes[0];
          if (qr?.placementPhotoDocumentId) return false;
        }
        return true;
      })
      .map((elv) => {
        const complianceView = resolveElevatorComplianceView({
          status: elv.status,
          maintenanceOrgId: elv.maintenanceOrgId,
          inspections: elv.inspections,
          maintenanceRecords: elv.maintenanceRecords,
          maintenanceCompliance: elv.maintenanceCompliance,
          complianceIndicator: elv.complianceIndicator,
          certificates: elv.certificates,
        });
        return { ...elv, compliance: complianceView.display, complianceGaps: complianceView.gaps.filter((g) => g.level !== "info") };
      });
  }

  static async listReturnedApplications(orgId: string) {
    return db.application.findMany({
      where: {
        ownerOrgId: orgId,
        deletedAt: null,
        OR: [
          { status: ApplicationStatus.RETURNED },
          { returnToRole: "OWNER" },
        ],
      },
      include: {
        data: { include: { municipality: true } },
        returnedBy: { select: { firstName: true, lastName: true } },
        installerOrg: true,
        certifierOrg: true,
      },
      orderBy: { returnedAt: "desc" },
    });
  }
}
