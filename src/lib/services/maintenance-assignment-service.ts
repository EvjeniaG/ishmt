import {
  AuditAction,
  DelegationStatus,
  DelegationType,
  MaintenanceContractStatus,
  OrgStatus,
  OrgType,
} from "@prisma/client";
import { AuditService } from "@/lib/audit/audit-service";
import { db } from "@/lib/db";
import { NotificationService } from "@/lib/services/notification-service";
import { QkbLookupService, type QkbStatus } from "@/lib/services/qkb-lookup-service";
import { CertifierInspectionService } from "@/lib/services/certifier-inspection-service";
import { NumberFormatService } from "@/lib/services/number-format-service";
import { OrganizationCapabilityService } from "@/lib/services/organization-capability-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";

export type MaintenanceCompanyOption = {
  id: string;
  name: string;
  nipt: string | null;
  qkbStatus: QkbStatus;
  qkbStatusLabel: string;
  selectable: boolean;
};

export class MaintenanceAssignmentService {
  static async listEligibleMaintenanceCompanies() {
    return db.organization.findMany({
      where: {
        type: OrgType.MAINTENANCE,
        status: OrgStatus.ACTIVE,
        qkbValidated: true,
        deletedAt: null,
      },
      select: { id: true, name: true, nipt: true },
      orderBy: { name: "asc" },
    });
  }

  /** Maintenance companies with live QKB status (ACTIVE only are selectable). */
  static async listMaintenanceCompaniesWithQkbStatus(): Promise<MaintenanceCompanyOption[]> {
    const orgs = await db.organization.findMany({
      where: { type: OrgType.MAINTENANCE, deletedAt: null },
      select: { id: true, name: true, nipt: true, qkbValidated: true, status: true },
      orderBy: { name: "asc" },
    });

    return Promise.all(
      orgs.map(async (org) => {
        const lookup = org.nipt
          ? await QkbLookupService.lookup(org.nipt, org.name)
          : null;
        const qkbStatus = lookup?.qkbStatus ?? "UNKNOWN";
        const selectable =
          qkbStatus === "ACTIVE" && org.qkbValidated && org.status === OrgStatus.ACTIVE;
        return {
          id: org.id,
          name: org.name,
          nipt: org.nipt,
          qkbStatus,
          qkbStatusLabel: lookup ? lookup.statusLabel : "NIPT i paparashtruar",
          selectable,
        };
      }),
    );
  }

  static async lookupCompanyByNipt(nipt: string): Promise<MaintenanceCompanyOption | null> {
    const org = await db.organization.findFirst({
      where: { type: OrgType.MAINTENANCE, nipt: nipt.trim().toUpperCase(), deletedAt: null },
    });
    if (!org) return null;
    const lookup = await QkbLookupService.lookup(org.nipt!, org.name);
    const selectable =
      lookup.qkbStatus === "ACTIVE" && org.qkbValidated && org.status === OrgStatus.ACTIVE;
    return {
      id: org.id,
      name: org.name,
      nipt: org.nipt,
      qkbStatus: lookup.qkbStatus,
      qkbStatusLabel: lookup.statusLabel,
      selectable,
    };
  }

  static async findMaintenanceCompaniesByName(query: string): Promise<MaintenanceCompanyOption[]> {
    const normalized = query.trim();
    if (!normalized) return [];
    const queryUpper = normalized.toUpperCase();

    const orgs = await db.organization.findMany({
      where: {
        type: OrgType.MAINTENANCE,
        deletedAt: null,
        OR: [
          { name: { contains: normalized, mode: "insensitive" } },
          { nipt: queryUpper },
        ],
      },
      select: { id: true, name: true, nipt: true, qkbValidated: true, status: true },
      orderBy: { name: "asc" },
    });

    return Promise.all(
      orgs.map(async (org) => {
        const lookup = org.nipt ? await QkbLookupService.lookup(org.nipt, org.name) : null;
        const qkbStatus = lookup?.qkbStatus ?? "UNKNOWN";
        const selectable =
          org.nipt !== null && qkbStatus === "ACTIVE" && org.qkbValidated && org.status === OrgStatus.ACTIVE;
        return {
          id: org.id,
          name: org.name,
          nipt: org.nipt,
          qkbStatus,
          qkbStatusLabel: lookup ? lookup.statusLabel : "NIPT i paparashtruar",
          selectable,
        };
      }),
    );
  }

  static async requestAssignment(
    ctx: AuthContext,
    input: {
      elevatorId: string;
      maintenance?: {
        orgId: string;
        startDate: Date;
        endDate: Date;
        contractNumber?: string;
        documentId?: string;
      };
      inspection?: {
        orgId: string;
        startDate: Date;
        endDate: Date;
        contractNumber?: string;
        documentId?: string;
      };
    },
  ) {
    if (ctx.roleCode !== ROLE_CODES.OWNER || !hasPermission(ctx, PERMISSIONS.MAINTENANCE_REQUEST_ASSIGNMENT)) {
      throw new Error("Nuk keni leje për të caktuar kompaninë e mirëmbajtjes.");
    }
    if (!input.maintenance && !input.inspection) {
      throw new Error("Zgjidhni të paktën një lloj shërbimi.");
    }

    const validateDates = (label: string, startDate: Date, endDate: Date) => {
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        throw new Error(`Datat e kontratës së ${label} nuk janë të vlefshme.`);
      }
      if (endDate.getTime() <= startDate.getTime()) {
        throw new Error(`Data e mbarimit të kontratës së ${label} duhet të jetë pas datës së fillimit.`);
      }
    };
    if (input.maintenance) validateDates("mirëmbajtjes", input.maintenance.startDate, input.maintenance.endDate);
    if (input.inspection) validateDates("inspektimit", input.inspection.startDate, input.inspection.endDate);

    const elevator = await db.elevator.findFirst({
      where: { id: input.elevatorId, ownerOrgId: ctx.activeOrgId, deletedAt: null, status: "ACTIVE" },
    });
    if (!elevator) throw new Error("Ashensori nuk u gjet ose nuk është aktiv.");

    const sameOrgForBoth =
      Boolean(input.maintenance && input.inspection) &&
      input.maintenance!.orgId === input.inspection!.orgId;

    if (sameOrgForBoth && input.maintenance && input.inspection) {
      if (input.maintenance.contractNumber) {
        input.inspection.contractNumber = input.maintenance.contractNumber;
      }
      input.inspection.startDate = input.maintenance.startDate;
      input.inspection.endDate = input.maintenance.endDate;
    }

    const maintenanceOrg = input.maintenance
      ? await OrganizationCapabilityService.assertMaintenanceProvider(input.maintenance.orgId, {
          allowCertifier: sameOrgForBoth,
        })
      : null;

    let inspectionOrg: Awaited<ReturnType<typeof CertifierInspectionService.assertCertifierOrg>> | null = null;
    if (input.inspection) {
      inspectionOrg = sameOrgForBoth
        ? await CertifierInspectionService.assertCertifierOrg(input.inspection.orgId)
        : input.maintenance
          ? await CertifierInspectionService.resolveInspectionOrg(
              input.maintenance.orgId,
              input.inspection.orgId,
            )
          : await CertifierInspectionService.assertCertifierOrg(input.inspection.orgId);
    }

    const primaryOrg = maintenanceOrg ?? inspectionOrg;
    if (!primaryOrg) {
      throw new Error("Zgjidhni të paktën një lloj shërbimi.");
    }

    const result = await db.$transaction(async (tx) => {
      if (input.maintenance) {
        await tx.maintenanceContract.updateMany({
          where: {
            elevatorId: elevator.id,
            serviceType: "MAINTENANCE",
            status: MaintenanceContractStatus.PENDING,
          },
          data: { status: MaintenanceContractStatus.TERMINATED, isActive: false },
        });
      }
      if (input.inspection) {
        await tx.maintenanceContract.updateMany({
          where: {
            elevatorId: elevator.id,
            serviceType: "PERIODIC_INSPECTION",
            status: MaintenanceContractStatus.PENDING,
          },
          data: { status: MaintenanceContractStatus.TERMINATED, isActive: false },
        });
      }

      const delegation = await tx.elevatorDelegationHistory.create({
        data: {
          elevatorId: elevator.id,
          organizationId: primaryOrg.id,
          delegationType: DelegationType.MAINTENANCE,
          assignedById: ctx.userId,
          status: DelegationStatus.PENDING,
        },
      });

      const contracts = [];
      let sharedContractNumber: string | null = null;

      if (sameOrgForBoth && input.maintenance && input.inspection) {
        sharedContractNumber =
          input.maintenance.contractNumber ??
          (await NumberFormatService.nextContractNumber("MAINTENANCE", tx));
      }

      if (input.maintenance && maintenanceOrg) {
        contracts.push(
          await tx.maintenanceContract.create({
            data: {
              elevatorId: elevator.id,
              maintenanceOrgId: maintenanceOrg.id,
              serviceType: "MAINTENANCE",
              contractNumber: sharedContractNumber ?? input.maintenance.contractNumber ??
                (await NumberFormatService.nextContractNumber("MAINTENANCE", tx)),
              startDate: input.maintenance.startDate,
              endDate: input.maintenance.endDate,
              documentId: input.maintenance.documentId ?? null,
              status: MaintenanceContractStatus.PENDING,
              isActive: false,
            },
          }),
        );
      }
      if (input.inspection && inspectionOrg) {
        contracts.push(
          await tx.maintenanceContract.create({
            data: {
              elevatorId: elevator.id,
              maintenanceOrgId: inspectionOrg.id,
              serviceType: "PERIODIC_INSPECTION",
              contractNumber:
                sharedContractNumber ??
                input.inspection.contractNumber ??
                (await NumberFormatService.nextContractNumber("PERIODIC_INSPECTION", tx)),
              startDate: input.inspection.startDate,
              endDate: input.inspection.endDate,
              documentId: input.inspection.documentId ?? null,
              status: MaintenanceContractStatus.PENDING,
              isActive: false,
            },
          }),
        );
      }

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.CREATE,
          entityType: "maintenance_assignment",
          entityId: delegation.id,
          afterState: {
            elevatorId: elevator.id,
            maintenanceOrgId: maintenanceOrg?.id ?? null,
            inspectionOrgId: inspectionOrg?.id ?? null,
            serviceMaintenance: Boolean(input.maintenance),
            serviceInspection: Boolean(input.inspection),
            contractIds: contracts.map((c) => c.id),
          },
        },
        tx,
      );

      return { delegation, contracts };
    });

    // Notifications run after commit so a rolled-back assignment never notifies orgs.
    if (maintenanceOrg) {
      await NotificationService.notifyOrgMembers(maintenanceOrg.id, {
        title: "Ftesë për mirëmbajtje",
        body: `Jeni ftuar për shërbime te ashensori ${elevator.registryNumber}.`,
        entityType: "elevator",
        entityId: elevator.id,
      });
    }

    if (inspectionOrg && inspectionOrg.id !== maintenanceOrg?.id) {
      await NotificationService.notifyOrgMembers(inspectionOrg.id, {
        title: "Ftesë për inspektim periodik",
        body: `Jeni ftuar për inspektim periodik te ashensori ${elevator.registryNumber}.`,
        entityType: "elevator",
        entityId: elevator.id,
      });
    }

    return result;
  }

}
