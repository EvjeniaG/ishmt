import {
  AuditAction,
  BuildingType,
  DelegationStatus,
  DelegationType,
  InspectionResult,
  InspectionType,
  MaintenanceContractStatus,
  MaintenanceType,
  OrgType,
} from "@prisma/client";
import { AuditService } from "@/lib/audit/audit-service";
import { db } from "@/lib/db";
import { ComplianceService } from "@/lib/services/compliance-service";
import { NotificationService } from "@/lib/services/notification-service";
import { OperationalEventNotificationService } from "@/lib/services/operational-event-notification-service";
import { ElevatorResponsibilityService } from "@/lib/services/elevator-responsibility-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/guards";
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import { certifierOrgHasMaintenanceAssignments } from "@/lib/certifier/certifier-maintenance-access";
import { hasServiceCapability } from "@/lib/organizations/org-capabilities";
import {
  INTERVENTION_TYPES,
  type InterventionTypeLabel,
} from "@/lib/constants/maintenance";
import {
  buildMonthlyControlDescription,
  buildMonthlyControlPayload,
  validateMonthlyControlInput,
  type SubmitMonthlyControlInput,
} from "@/lib/maintenance/monthly-control-payload";

export { INTERVENTION_TYPES, type InterventionTypeLabel };

const MONTHLY_REPORT_TYPE = "RAPORT_MUJOR";
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function mapInterventionToType(label: string): MaintenanceType {
  switch (label) {
    case "Emergjencë":
      return MaintenanceType.EMERGENCY;
    case "Zëvendësim pjesësh":
      return MaintenanceType.MODERNIZATION;
    default:
      return MaintenanceType.ROUTINE;
  }
}

/** Periodic inspection interval in months by building type (Udhëzimi Nr.1). */
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

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((p) => parseInt(p, 10));
  return (h || 0) * 60 + (m || 0);
}

export class MaintenanceWorkService {
  private static assertCanAcceptServiceContract(
    ctx: AuthContext,
    serviceType?: "MAINTENANCE" | "PERIODIC_INSPECTION",
  ) {
    if (
      hasServiceCapability(ctx, "maintenance") &&
      hasPermission(ctx, PERMISSIONS.MAINTENANCE_ACCEPT_CONTRACT)
    ) {
      return;
    }
    if (hasServiceCapability(ctx, "om")) {
      if (
        serviceType === "PERIODIC_INSPECTION" &&
        hasPermission(ctx, PERMISSIONS.CERTIFIER_ACCEPT_INSPECTION_CONTRACT)
      ) {
        return;
      }
      if (serviceType === "MAINTENANCE") {
        return;
      }
      if (!serviceType) return;
    }
    throw new Error("Nuk keni leje për të pranuar kontratën.");
  }

  private static async assertMaintenance(
    ctx: AuthContext,
    permission: PermissionCode = PERMISSIONS.MAINTENANCE_VIEW_ASSIGNED,
  ) {
    if (hasServiceCapability(ctx, "maintenance") && hasPermission(ctx, permission)) {
      return;
    }
    if (hasServiceCapability(ctx, "om")) {
      const hasMaintenanceRole = await certifierOrgHasMaintenanceAssignments(ctx.activeOrgId);
      if (
        hasMaintenanceRole &&
        (permission === PERMISSIONS.MAINTENANCE_VIEW_ASSIGNED ||
          permission === PERMISSIONS.MAINTENANCE_LOG_INTERVENTION ||
          permission === PERMISSIONS.MAINTENANCE_UPLOAD_REPORT)
      ) {
        return;
      }
    }
    throw new Error("Nuk keni leje për këtë veprim mirëmbajtjeje.");
  }

  private static assertCertifierMaintenanceAllowed(ctx: AuthContext) {
    if (!hasServiceCapability(ctx, "om")) return;
    throw new Error(
      "Kompania certifikuese nuk menaxhon mirëmbajtjen për këtë ashensor. Mirëmbajtja dhe kontrolli teknik vlejnë vetëm kur jeni caktuar edhe si kompani mirëmbajtëse.",
    );
  }

  /** Kontratë aktive me kompaninë (çdo lloj shërbimi). */
  private static async assertElevatorAssigned(ctx: AuthContext, elevatorId: string) {
    const contract = await db.maintenanceContract.findFirst({
      where: {
        elevatorId,
        maintenanceOrgId: ctx.activeOrgId,
        isActive: true,
      },
    });
    if (!contract) {
      throw new Error("Ky ashensor nuk është nën kontratë aktive me kompaninë tuaj.");
    }
    return contract;
  }

  /** Vetëm kontratë MAINTENANCE - për ndërhyrje dhe raporte mujore. */
  private static async assertMaintenanceServiceContract(ctx: AuthContext, elevatorId: string) {
    const contract = await db.maintenanceContract.findFirst({
      where: {
        elevatorId,
        maintenanceOrgId: ctx.activeOrgId,
        isActive: true,
        serviceType: "MAINTENANCE",
      },
    });
    if (!contract) {
      if (hasServiceCapability(ctx, "om")) {
        this.assertCertifierMaintenanceAllowed(ctx);
      }
      throw new Error("Ky ashensor nuk ka kontratë aktive mirëmbajtjeje me kompaninë tuaj.");
    }
    return contract;
  }

  static async listAssignedElevators(ctx: AuthContext) {
    await this.assertMaintenance(ctx);

    const contracts = await db.maintenanceContract.findMany({
      where: {
        maintenanceOrgId: ctx.activeOrgId,
        isActive: true,
        serviceType: "MAINTENANCE",
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

    const items = await Promise.all(
      contracts
        .filter((c) => c.elevator && !c.elevator.deletedAt)
        .map(async (c) => {
          const elevator = c.elevator;
          const buildingType = elevator.originatingApplication?.data?.buildingType ?? null;

          const lastIntervention = await db.maintenanceRecord.findFirst({
            where: {
              elevatorId: elevator.id,
              maintenanceOrgId: ctx.activeOrgId,
              interventionType: { not: MONTHLY_REPORT_TYPE },
            },
            orderBy: { performedDate: "desc" },
          });

          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthlyReportThisMonth = await db.maintenanceRecord.findFirst({
            where: {
              elevatorId: elevator.id,
              maintenanceOrgId: ctx.activeOrgId,
              interventionType: MONTHLY_REPORT_TYPE,
              performedDate: { gte: monthStart },
            },
          });

          const daysSinceLast = lastIntervention
            ? daysBetween(lastIntervention.performedDate, now)
            : null;

          const contractExpiresInDays = c.endDate ? daysBetween(now, c.endDate) : null;

          const lastInspection = await db.inspection.findFirst({
            where: { elevatorId: elevator.id, conductedDate: { not: null } },
            orderBy: { conductedDate: "desc" },
          });

          const lastPeriodicPass = await db.inspection.findFirst({
            where: {
              elevatorId: elevator.id,
              type: InspectionType.PERIODIC,
              conductedDate: { not: null },
              OR: [{ result: InspectionResult.PASS }, { status: InspectionResult.PASS }],
            },
            orderBy: { conductedDate: "desc" },
          });

          const intervalMonths = inspectionIntervalMonths(buildingType);
          const baseInspectionDate = lastPeriodicPass?.conductedDate ?? elevator.registrationDate;
          const nextInspectionDue = addMonths(baseInspectionDate, intervalMonths);
          const inspectionOverdue = nextInspectionDue < now;

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
            contractExpiresInDays,
            lastInterventionDate: lastIntervention?.performedDate ?? null,
            daysSinceLast,
            monthlyReportUploaded: Boolean(monthlyReportThisMonth),
            nextInspectionDue,
            inspectionOverdue,
            inspectionIntervalMonths: intervalMonths,
            alarmNoIntervention: !lastIntervention,
            alarmNoInspectionRecorded: !lastInspection,
            alarmMonthlyReport:
              !lastIntervention || (daysSinceLast !== null && daysSinceLast > 25 && !monthlyReportThisMonth),
            alarmContractExpiring:
              contractExpiresInDays !== null && contractExpiresInDays <= 30 && contractExpiresInDays >= 0,
            alarmInspectionOverdue: inspectionOverdue,
          };
        }),
    );

    return items;
  }

  static async listPendingContracts(ctx: AuthContext) {
    this.assertCanAcceptServiceContract(ctx);
    return db.maintenanceContract.findMany({
      where: {
        maintenanceOrgId: ctx.activeOrgId,
        status: MaintenanceContractStatus.PENDING,
        serviceType: "MAINTENANCE",
      },
      include: { elevator: { include: { municipality: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  static async acceptContract(ctx: AuthContext, contractId: string, documentId: string) {
    const contract = await db.maintenanceContract.findFirst({
      where: { id: contractId, maintenanceOrgId: ctx.activeOrgId },
      include: { elevator: true },
    });
    if (!contract) throw new Error("Kontrata nuk u gjet.");
    this.assertCanAcceptServiceContract(
      ctx,
      contract.serviceType as "MAINTENANCE" | "PERIODIC_INSPECTION",
    );
    if (contract.status !== MaintenanceContractStatus.PENDING) {
      throw new Error("Vetëm kontratat në pritje mund të pranohen.");
    }
    if (contract.serviceType === "PERIODIC_INSPECTION") {
      throw new Error("Kontratat e kontrollit periodik pranohen nga organizata OM/certifikuese.");
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
      if (contract.serviceType === "MAINTENANCE") {
        await tx.maintenanceContract.updateMany({
          where: {
            elevatorId: contract.elevatorId,
            serviceType: "MAINTENANCE",
            isActive: true,
            id: { not: contract.id },
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
      }
      await tx.elevatorDelegationHistory.updateMany({
        where: {
          elevatorId: contract.elevatorId,
          organizationId: ctx.activeOrgId,
          delegationType: DelegationType.MAINTENANCE,
          status: DelegationStatus.PENDING,
        },
        data: { status: DelegationStatus.ACCEPTED, acceptedAt: new Date() },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "maintenance_contract",
          entityId: contract.id,
          afterState: { action: "CONTRACT_ACCEPTED", elevatorId: contract.elevatorId },
        },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(contract.elevator.ownerOrgId, {
      title: "Kontrata e mirëmbajtjes u pranua",
      body: `Kompania e mirëmbajtjes pranoi kontratën për ashensorin ${contract.elevator.registryNumber}.`,
      entityType: "elevator",
      entityId: contract.elevatorId,
    });

    const { ReminderSchedulerService } = await import("@/lib/services/reminder-scheduler-service");
    await ReminderSchedulerService.scheduleForContract(contractId);

    return { ok: true };
  }

  static async rejectContract(ctx: AuthContext, contractId: string, reason: string) {
    if (reason.trim().length < 5) {
      throw new Error("Arsyeja e refuzimit duhet të ketë të paktën 5 karaktere.");
    }

    const contract = await db.maintenanceContract.findFirst({
      where: { id: contractId, maintenanceOrgId: ctx.activeOrgId },
      include: { elevator: true },
    });
    if (!contract) throw new Error("Kontrata nuk u gjet.");
    this.assertCanAcceptServiceContract(
      ctx,
      contract.serviceType as "MAINTENANCE" | "PERIODIC_INSPECTION",
    );
    if (contract.status !== MaintenanceContractStatus.PENDING) {
      throw new Error("Vetëm kontratat në pritje mund të refuzohen.");
    }

    await db.$transaction(async (tx) => {
      await tx.maintenanceContract.update({
        where: { id: contract.id },
        data: {
          status: MaintenanceContractStatus.REJECTED,
          isActive: false,
          rejectionReason: reason.trim(),
          respondedAt: new Date(),
        },
      });
      await tx.elevatorDelegationHistory.updateMany({
        where: {
          elevatorId: contract.elevatorId,
          organizationId: ctx.activeOrgId,
          delegationType: DelegationType.MAINTENANCE,
          status: DelegationStatus.PENDING,
        },
        data: { status: DelegationStatus.REJECTED },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "maintenance_contract",
          entityId: contract.id,
          afterState: {
            action: "CONTRACT_REJECTED",
            elevatorId: contract.elevatorId,
            reason: reason.trim(),
          },
        },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(contract.elevator.ownerOrgId, {
      title: "Kontrata u refuzua",
      body: `Kompania e mirëmbajtjes refuzoi kontratën për ashensorin ${contract.elevator.registryNumber}. Arsye: ${reason.trim()}`,
      entityType: "elevator",
      entityId: contract.elevatorId,
    });

    return { ok: true };
  }

  static async terminateActiveContract(ctx: AuthContext, contractId: string, reason: string) {
    if (reason.trim().length < 10) {
      throw new Error("Arsyeja e ndërprerjes duhet të ketë të paktën 10 karaktere.");
    }

    const contract = await db.maintenanceContract.findFirst({
      where: {
        id: contractId,
        maintenanceOrgId: ctx.activeOrgId,
        serviceType: "MAINTENANCE",
      },
      include: { elevator: true },
    });
    if (!contract) throw new Error("Kontrata nuk u gjet.");
    this.assertCanAcceptServiceContract(ctx, "MAINTENANCE");
    if (contract.status !== MaintenanceContractStatus.ACTIVE || !contract.isActive) {
      throw new Error("Vetëm kontratat aktive mund të ndërprehen.");
    }

    const trimmedReason = reason.trim();

    await db.$transaction(async (tx) => {
      await tx.maintenanceContract.update({
        where: { id: contract.id },
        data: {
          status: MaintenanceContractStatus.TERMINATED,
          isActive: false,
          rejectionReason: trimmedReason,
          respondedAt: new Date(),
        },
      });
      if (contract.elevator.maintenanceOrgId === ctx.activeOrgId) {
        await tx.elevator.update({
          where: { id: contract.elevatorId },
          data: { maintenanceOrgId: null },
        });
        await tx.elevatorResponsibleEntity.updateMany({
          where: {
            elevatorId: contract.elevatorId,
            role: OrgType.MAINTENANCE,
            validTo: null,
          },
          data: { validTo: new Date() },
        });
      }
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "maintenance_contract",
          entityId: contract.id,
          afterState: {
            action: "CONTRACT_TERMINATED_BY_PROVIDER",
            elevatorId: contract.elevatorId,
            reason: trimmedReason,
          },
        },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(contract.elevator.ownerOrgId, {
      title: "Kontrata e mirëmbajtjes u ndërpre",
      body: `Kompania e mirëmbajtjes ndërpreu kontratën për ashensorin ${contract.elevator.registryNumber}. Arsye: ${trimmedReason}`,
      entityType: "elevator",
      entityId: contract.elevatorId,
    });

    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // 2A - Interventions
  // ---------------------------------------------------------------------------
  static async logIntervention(
    ctx: AuthContext,
    input: {
      elevatorId: string;
      performedDate: Date;
      startTime: string;
      endTime: string;
      interventionType: string;
      description: string;
      partsReplaced?: string;
      technicianName: string;
      documentId?: string;
    },
  ) {
    await this.assertMaintenance(ctx, PERMISSIONS.MAINTENANCE_LOG_INTERVENTION);
    await this.assertMaintenanceServiceContract(ctx, input.elevatorId);

    const startMin = timeToMinutes(input.startTime);
    const endMin = timeToMinutes(input.endTime);
    if (endMin <= startMin) {
      throw new Error("Ora e mbarimit duhet të jetë pas orës së fillimit.");
    }
    if (input.description.trim().length < 20) {
      throw new Error("Përshkrimi ('Çfarë u bë') duhet të ketë të paktën 20 karaktere.");
    }

    if (input.documentId) {
      const document = await db.document.findFirst({
        where: { id: input.documentId, uploadedById: ctx.userId, deletedAt: null },
      });
      if (!document) throw new Error("Dokumenti i ndërhyrjes nuk u gjet. Ngarkojeni përsëri.");
    }

    const record = await db.maintenanceRecord.create({
      data: {
        elevatorId: input.elevatorId,
        maintenanceOrgId: ctx.activeOrgId,
        type: mapInterventionToType(input.interventionType),
        interventionType: input.interventionType,
        performedDate: input.performedDate,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: endMin - startMin,
        technicianName: input.technicianName,
        description: input.description,
        partsReplaced: input.partsReplaced || null,
        documentId: input.documentId ?? null,
        createdById: ctx.userId,
      },
    });

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.CREATE,
      entityType: "maintenance_record",
      entityId: record.id,
      afterState: { elevatorId: input.elevatorId, interventionType: input.interventionType },
    });

    await ComplianceService.recalculateForElevator(input.elevatorId);

    const elevator = await db.elevator.findFirst({
      where: { id: input.elevatorId },
      select: { registryNumber: true },
    });
    if (elevator) {
      await OperationalEventNotificationService.broadcastForElevator({
        elevatorId: input.elevatorId,
        title: "Ndërhyrje mirëmbajtjeje u regjistrua",
        body: `${input.interventionType} për ashensorin ${elevator.registryNumber} më ${input.performedDate.toLocaleDateString("sq-AL")}.`,
      });
    }

    return record;
  }

  static async listInterventions(ctx: AuthContext, elevatorId?: string) {
    await this.assertMaintenance(ctx);
    return db.maintenanceRecord.findMany({
      where: {
        maintenanceOrgId: ctx.activeOrgId,
        interventionType: { not: MONTHLY_REPORT_TYPE },
        ...(elevatorId ? { elevatorId } : {}),
      },
      include: { elevator: { select: { registryNumber: true, buildingAddress: true } } },
      orderBy: { performedDate: "desc" },
      take: 100,
    });
  }

  // ---------------------------------------------------------------------------
  // 2B - Monthly field control (structured form, not PDF report)
  // ---------------------------------------------------------------------------
  static async submitMonthlyReport(
    ctx: AuthContext,
    input: SubmitMonthlyControlInput,
  ) {
    await this.assertMaintenance(ctx, PERMISSIONS.MAINTENANCE_UPLOAD_REPORT);
    await this.assertMaintenanceServiceContract(ctx, input.elevatorId);
    validateMonthlyControlInput(input);

    if (input.documentId) {
      const document = await db.document.findFirst({
        where: { id: input.documentId, uploadedById: ctx.userId, deletedAt: null },
      });
      if (!document) throw new Error("Dokumenti shtesë nuk u gjet. Ngarkojeni përsëri.");
    }

    const payload = buildMonthlyControlPayload(input);
    const description = buildMonthlyControlDescription(payload);

    let durationMinutes: number | null = null;
    if (input.startTime && input.endTime) {
      const [sh, sm] = input.startTime.split(":").map((p) => parseInt(p, 10));
      const [eh, em] = input.endTime.split(":").map((p) => parseInt(p, 10));
      durationMinutes = (eh || 0) * 60 + (em || 0) - ((sh || 0) * 60 + (sm || 0));
    }

    const record = await db.maintenanceRecord.create({
      data: {
        elevatorId: input.elevatorId,
        maintenanceOrgId: ctx.activeOrgId,
        type: MaintenanceType.ROUTINE,
        interventionType: MONTHLY_REPORT_TYPE,
        performedDate: input.performedDate,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        durationMinutes,
        technicianName: input.technicianName.trim(),
        description,
        findings: JSON.stringify(payload),
        documentId: input.documentId ?? null,
        createdById: ctx.userId,
      },
    });

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.CREATE,
      entityType: "maintenance_monthly_report",
      entityId: record.id,
      afterState: { elevatorId: input.elevatorId, period: `${input.periodYear}-${input.periodMonth}` },
    });

    await ComplianceService.recalculateForElevator(input.elevatorId);

    const elevator = await db.elevator.findFirst({
      where: { id: input.elevatorId },
      select: { registryNumber: true },
    });
    if (elevator) {
      const resultLabel = payload.result === "PASS" ? "KALUES" : "JO KALUES";
      await OperationalEventNotificationService.broadcastForElevator({
        elevatorId: input.elevatorId,
        title: "Kontroll periodik mujor u regjistrua",
        body: `${description} për ashensorin ${elevator.registryNumber} (${resultLabel}).`,
      });
    }

    return record;
  }

  static async listMonthlyReports(ctx: AuthContext, elevatorId?: string) {
    await this.assertMaintenance(ctx);
    return db.maintenanceRecord.findMany({
      where: {
        maintenanceOrgId: ctx.activeOrgId,
        interventionType: MONTHLY_REPORT_TYPE,
        ...(elevatorId ? { elevatorId } : {}),
      },
      include: {
        elevator: { select: { registryNumber: true, buildingAddress: true } },
        document: { select: { id: true, originalFilename: true } },
      },
      orderBy: { performedDate: "desc" },
      take: 100,
    });
  }
}

export type AssignedElevator = Awaited<
  ReturnType<typeof MaintenanceWorkService.listAssignedElevators>
>[number];

export { MONTHLY_REPORT_TYPE };
