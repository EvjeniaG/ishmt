import {
  AuditAction,
  BuildingType,
  InspectionResult,
  InspectionType,
  MaintenanceContractStatus,
  OrgStatus,
  OrgType,
} from "@prisma/client";
import { AuditService } from "@/lib/audit/audit-service";
import { db } from "@/lib/db";
import { ComplianceService } from "@/lib/services/compliance-service";
import { NotificationService } from "@/lib/services/notification-service";
import { OperationalEventNotificationService } from "@/lib/services/operational-event-notification-service";
import { OrganizationCapabilityService } from "@/lib/services/organization-capability-service";
import { ElevatorResponsibilityService } from "@/lib/services/elevator-responsibility-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/guards";
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import { hasServiceCapability } from "@/lib/organizations/org-capabilities";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function inspectionIntervalMonths(buildingType: BuildingType | null | undefined): number {
  if (buildingType === BuildingType.WORKPLACE || buildingType === BuildingType.PUBLIC_BUILDING) {
    return 6;
  }
  return 12;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export type CertifierCompanyOption = {
  id: string;
  name: string;
  nipt: string | null;
  selectable: boolean;
};

export class CertifierInspectionService {
  private static assertCertifier(
    ctx: AuthContext,
    permission: PermissionCode = PERMISSIONS.CERTIFIER_VIEW_INSPECTION_ASSIGNMENTS,
  ) {
    if (!hasServiceCapability(ctx, "om") || !hasPermission(ctx, permission)) {
      throw new Error("Nuk keni leje për kontrollin periodik OM.");
    }
  }

  static async listEligibleCertifierCompanies(): Promise<CertifierCompanyOption[]> {
    return OrganizationCapabilityService.listPeriodicInspectionProviders();
  }

  /** Certifier org with active OM/certification license. */
  static async assertCertifierOrg(orgId: string) {
    return OrganizationCapabilityService.assertPeriodicInspectionProvider(orgId);
  }

  /** Resolve certifier org for periodic inspection - same legal entity only if licensed as certifier. */
  static async resolveInspectionOrg(maintenanceOrgId: string, inspectionOrgId?: string) {
    if (inspectionOrgId && inspectionOrgId !== maintenanceOrgId) {
      return this.assertCertifierOrg(inspectionOrgId);
    }

    const maintenanceOrg = await db.organization.findFirst({
      where: { id: maintenanceOrgId, type: OrgType.MAINTENANCE, deletedAt: null },
    });
    if (!maintenanceOrg?.nipt) {
      throw new Error("Kompania e mirëmbajtjes nuk u gjet.");
    }

    const certifierWithSameNipt = await db.organization.findFirst({
      where: {
        type: OrgType.CERTIFIER,
        nipt: maintenanceOrg.nipt,
        status: OrgStatus.ACTIVE,
        deletedAt: null,
        licenses: { some: { status: "ACTIVE", expiryDate: { gte: new Date() } } },
      },
    });

    if (certifierWithSameNipt) {
      return certifierWithSameNipt;
    }

    throw new Error(
      "Kontrolli periodik kërkon organizatë OM/certifikuese të licencuar. Zgjidhni kompaninë e kontrollit.",
    );
  }

  private static async assertPeriodicInspectionContract(ctx: AuthContext, elevatorId: string) {
    const contract = await db.maintenanceContract.findFirst({
      where: {
        elevatorId,
        maintenanceOrgId: ctx.activeOrgId,
        isActive: true,
        serviceType: "PERIODIC_INSPECTION",
      },
    });
    if (!contract) {
      throw new Error("Ky ashensor nuk ka kontratë aktive kontrolli periodik me organizatën tuaj OM.");
    }
    return contract;
  }

  static async listPendingContracts(ctx: AuthContext) {
    this.assertCertifier(ctx, PERMISSIONS.CERTIFIER_ACCEPT_INSPECTION_CONTRACT);
    return db.maintenanceContract.findMany({
      where: {
        maintenanceOrgId: ctx.activeOrgId,
        status: MaintenanceContractStatus.PENDING,
        serviceType: "PERIODIC_INSPECTION",
      },
      include: { elevator: { include: { municipality: true, ownerOrg: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async acceptInspectionContract(ctx: AuthContext, contractId: string, documentId: string) {
    this.assertCertifier(ctx, PERMISSIONS.CERTIFIER_ACCEPT_INSPECTION_CONTRACT);

    const contract = await db.maintenanceContract.findFirst({
      where: {
        id: contractId,
        maintenanceOrgId: ctx.activeOrgId,
        serviceType: "PERIODIC_INSPECTION",
      },
      include: { elevator: true },
    });
    if (!contract) throw new Error("Kontrata e kontrollit periodik nuk u gjet.");
    if (contract.status !== MaintenanceContractStatus.PENDING) {
      throw new Error("Vetëm kontratat në pritje mund të pranohen.");
    }

    const document = await db.document.findFirst({
      where: { id: documentId, uploadedById: ctx.userId, deletedAt: null },
    });
    if (!document) throw new Error("Dokumenti i kontratës nuk u gjet. Ngarkojeni përsëri.");

    await db.$transaction(async (tx) => {
      await tx.maintenanceContract.update({
        where: { id: contract.id },
        data: {
          status: MaintenanceContractStatus.ACTIVE,
          isActive: true,
          respondedAt: new Date(),
          documentId,
        },
      });
      await tx.maintenanceContract.updateMany({
        where: {
          elevatorId: contract.elevatorId,
          serviceType: "PERIODIC_INSPECTION",
          isActive: true,
          id: { not: contract.id },
        },
        data: { status: MaintenanceContractStatus.TERMINATED, isActive: false },
      });
      const linkedMaintenanceContract = await tx.maintenanceContract.findFirst({
        where: {
          elevatorId: contract.elevatorId,
          maintenanceOrgId: ctx.activeOrgId,
          serviceType: "MAINTENANCE",
          status: MaintenanceContractStatus.PENDING,
        },
      });
      if (linkedMaintenanceContract) {
        await tx.maintenanceContract.update({
          where: { id: linkedMaintenanceContract.id },
          data: {
            status: MaintenanceContractStatus.ACTIVE,
            isActive: true,
            respondedAt: new Date(),
            documentId,
          },
        });
        await tx.maintenanceContract.updateMany({
          where: {
            elevatorId: contract.elevatorId,
            serviceType: "MAINTENANCE",
            isActive: true,
            id: { not: linkedMaintenanceContract.id },
          },
          data: { status: MaintenanceContractStatus.TERMINATED, isActive: false },
        });
        await tx.elevator.update({
          where: { id: contract.elevatorId },
          data: { maintenanceOrgId: ctx.activeOrgId },
        });
        await ElevatorResponsibilityService.replaceCurrent(tx, {
          elevatorId: contract.elevatorId,
          organizationId: ctx.activeOrgId,
          role: OrgType.MAINTENANCE,
          validFrom: new Date(),
        });
        await tx.elevatorDelegationHistory.updateMany({
          where: {
            elevatorId: contract.elevatorId,
            organizationId: ctx.activeOrgId,
            delegationType: "MAINTENANCE",
            status: "PENDING",
          },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });
      }
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "maintenance_contract",
          entityId: contract.id,
          afterState: { action: "INSPECTION_CONTRACT_ACCEPTED", elevatorId: contract.elevatorId },
        },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(contract.elevator.ownerOrgId, {
      title: "Kontrata e kontrollit periodik u pranua",
      body: `Organizata OM pranoi kontratën e kontrollit periodik për ashensorin ${contract.elevator.registryNumber}.`,
      entityType: "elevator",
      entityId: contract.elevatorId,
    });

    return { ok: true };
  }

  static async listAssignedElevators(ctx: AuthContext) {
    this.assertCertifier(ctx);

    const contracts = await db.maintenanceContract.findMany({
      where: {
        maintenanceOrgId: ctx.activeOrgId,
        isActive: true,
        serviceType: "PERIODIC_INSPECTION",
      },
      include: {
        elevator: {
          include: {
            municipality: true,
            originatingApplication: { include: { data: true } },
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    const now = new Date();

    return Promise.all(
      contracts
        .filter((c) => c.elevator && !c.elevator.deletedAt)
        .map(async (c) => {
          const elevator = c.elevator;
          const buildingType = elevator.originatingApplication?.data?.buildingType ?? null;
          const info = await this.getInspectionInfoForElevator(elevator.id, buildingType);

          return {
            elevatorId: elevator.id,
            registryNumber: elevator.registryNumber,
            address: elevator.buildingAddress,
            municipality: elevator.municipality?.nameSq ?? "",
            buildingType,
            requiresAttention: elevator.requiresAttention,
            contractId: c.id,
            contractNumber: c.contractNumber,
            contractEndDate: c.endDate,
            ...info,
            inspectionOverdue: info.nextDue < now,
            daysRemaining: daysBetween(now, info.nextDue),
          };
        }),
    );
  }

  private static async getInspectionInfoForElevator(
    elevatorId: string,
    buildingType: BuildingType | null | undefined,
  ) {
    const elevator = await db.elevator.findUnique({ where: { id: elevatorId } });
    if (!elevator) throw new Error("Ashensori nuk u gjet.");

    const intervalMonths = inspectionIntervalMonths(buildingType);
    const lastInspection = await db.inspection.findFirst({
      where: { elevatorId, type: InspectionType.PERIODIC },
      orderBy: { conductedDate: "desc" },
    });

    const base = lastInspection?.conductedDate ?? elevator.registrationDate;
    const nextDue = addMonths(base, intervalMonths);

    return {
      intervalMonths,
      lastInspectionDate: lastInspection?.conductedDate ?? null,
      nextDue,
    };
  }

  static async getInspectionInfo(ctx: AuthContext, elevatorId: string) {
    this.assertCertifier(ctx, PERMISSIONS.CERTIFIER_LOG_PERIODIC_INSPECTION);
    await this.assertPeriodicInspectionContract(ctx, elevatorId);

    const elevator = await db.elevator.findFirst({
      where: { id: elevatorId, deletedAt: null },
      include: { originatingApplication: { include: { data: true } } },
    });
    if (!elevator) throw new Error("Ashensori nuk u gjet.");

    const buildingType = elevator.originatingApplication?.data?.buildingType ?? null;
    const intervalMonths = inspectionIntervalMonths(buildingType);
    const lastInspection = await db.inspection.findFirst({
      where: { elevatorId, type: InspectionType.PERIODIC },
      orderBy: { conductedDate: "desc" },
    });

    const base = lastInspection?.conductedDate ?? elevator.registrationDate;
    const nextDue = addMonths(base, intervalMonths);
    const now = new Date();

    return {
      buildingType,
      intervalMonths,
      lastInspectionDate: lastInspection?.conductedDate ?? null,
      nextDue,
      daysRemaining: daysBetween(now, nextDue),
      overdue: nextDue < now,
    };
  }

  static async logPeriodicInspection(
    ctx: AuthContext,
    input: {
      elevatorId: string;
      conductedDate: Date;
      approvedBodyNumber: string;
      examinationType: string;
      result: "PASS" | "FAIL";
      findings?: string;
      reportDocumentId: string;
    },
  ) {
    this.assertCertifier(ctx, PERMISSIONS.CERTIFIER_LOG_PERIODIC_INSPECTION);
    await this.assertPeriodicInspectionContract(ctx, input.elevatorId);

    if (input.result === "FAIL" && (!input.findings || input.findings.trim().length === 0)) {
      throw new Error("Për rezultat JO KALUES duhet të specifikoni defektet e konstatuara.");
    }

    const document = await db.document.findFirst({
      where: { id: input.reportDocumentId, uploadedById: ctx.userId, deletedAt: null },
    });
    if (!document) throw new Error("Raporti i kontrollit nuk u gjet. Ngarkojeni përsëri.");

    const info = await this.getInspectionInfo(ctx, input.elevatorId);
    const result = input.result === "PASS" ? InspectionResult.PASS : InspectionResult.FAIL;
    const nextInspectionDate =
      result === InspectionResult.PASS ? addMonths(input.conductedDate, info.intervalMonths) : null;

    const inspection = await db.$transaction(async (tx) => {
      const created = await tx.inspection.create({
        data: {
          elevatorId: input.elevatorId,
          inspectorId: ctx.userId,
          type: InspectionType.PERIODIC,
          status: result,
          result,
          scheduledDate: input.conductedDate,
          conductedDate: input.conductedDate,
          approvedBodyNumber: input.approvedBodyNumber,
          examinationType: input.examinationType,
          findings: input.findings || null,
          nextInspectionDate,
          reportDocumentId: input.reportDocumentId,
        },
      });

      await tx.elevator.update({
        where: { id: input.elevatorId },
        data: { requiresAttention: result === InspectionResult.FAIL },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.CREATE,
          entityType: "inspection",
          entityId: created.id,
          afterState: { elevatorId: input.elevatorId, type: "PERIODIC", result },
        },
        tx,
      );

      return created;
    });

    const elevator = await db.elevator.findUnique({
      where: { id: input.elevatorId },
      select: { registryNumber: true },
    });

    if (elevator) {
      const resultLabel = result === InspectionResult.PASS ? "KALUES" : "JO KALUES";
      await OperationalEventNotificationService.broadcastForElevator({
        elevatorId: input.elevatorId,
        title: `Kontroll periodik ${resultLabel}`,
        body: `Ashensori ${elevator.registryNumber} · ${input.examinationType} më ${input.conductedDate.toLocaleDateString("sq-AL")}.`,
      });
    }

    await ComplianceService.recalculateForElevator(input.elevatorId);

    return inspection;
  }

  private static async assertCertifierForElevator(ctx: AuthContext, elevatorId: string) {
    this.assertCertifier(ctx, PERMISSIONS.CERTIFIER_LOG_PERIODIC_INSPECTION);
    await this.assertPeriodicInspectionContract(ctx, elevatorId);

    const elevator = await db.elevator.findFirst({
      where: { id: elevatorId, deletedAt: null },
    });
    if (!elevator) throw new Error("Ashensori nuk u gjet.");
    return elevator;
  }

  /** Plotëson inspektimin periodik legacy / pa dokument - ngarkim raporti nga OM. */
  static async enrichPeriodicInspection(
    ctx: AuthContext,
    input: {
      inspectionId: string;
      reportDocumentId: string;
      approvedBodyNumber?: string;
      notes?: string;
    },
  ) {
    const inspection = await db.inspection.findFirst({
      where: { id: input.inspectionId, type: InspectionType.PERIODIC },
      include: { elevator: { include: { originatingApplication: { include: { data: true } } } } },
    });
    if (!inspection) throw new Error("Kontrolli periodik nuk u gjet.");

    await this.assertCertifierForElevator(ctx, inspection.elevatorId);

    const document = await db.document.findFirst({
      where: { id: input.reportDocumentId, uploadedById: ctx.userId, deletedAt: null },
    });
    if (!document) throw new Error("Dokumenti nuk u gjet. Ngarkojeni përsëri.");

    const conducted = inspection.conductedDate ?? inspection.scheduledDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const conductedDay = conducted ? new Date(conducted) : null;
    if (conductedDay) conductedDay.setHours(0, 0, 0, 0);
    const isPast = conductedDay != null && conductedDay.getTime() <= today.getTime();
    const result = inspection.result ?? (isPast ? InspectionResult.PASS : InspectionResult.PENDING);

    const buildingType = inspection.elevator.originatingApplication?.data?.buildingType ?? null;
    const intervalMonths = inspectionIntervalMonths(buildingType);
    const nextInspectionDate =
      result === InspectionResult.PASS && conducted
        ? addMonths(conducted, intervalMonths)
        : inspection.nextInspectionDate;

    let findings = inspection.findings;
    if (input.notes?.trim()) {
      const prefix = findings ? `${findings}\n` : "";
      findings = `${prefix}Shënime OM: ${input.notes.trim()}`;
    }

    await db.$transaction(async (tx) => {
      await tx.inspection.update({
        where: { id: inspection.id },
        data: {
          reportDocumentId: input.reportDocumentId,
          approvedBodyNumber: input.approvedBodyNumber?.trim() || inspection.approvedBodyNumber,
          findings,
          result,
          status: result,
          nextInspectionDate,
        },
      });

      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "inspection",
          entityId: inspection.id,
          afterState: { reportDocumentId: input.reportDocumentId, enriched: true },
        },
        tx,
      );
    });

    await ComplianceService.recalculateForElevator(inspection.elevatorId);
  }

  static async listInspections(ctx: AuthContext, elevatorId?: string) {
    this.assertCertifier(ctx);
    return db.inspection.findMany({
      where: {
        type: InspectionType.PERIODIC,
        ...(elevatorId ? { elevatorId } : {}),
        elevator: {
          maintenanceContracts: {
            some: {
              maintenanceOrgId: ctx.activeOrgId,
              serviceType: "PERIODIC_INSPECTION",
              isActive: true,
            },
          },
        },
      },
      include: {
        elevator: { select: { registryNumber: true, buildingAddress: true } },
        reportDocument: { select: { id: true, originalFilename: true } },
      },
      orderBy: { conductedDate: "desc" },
    });
  }
}
