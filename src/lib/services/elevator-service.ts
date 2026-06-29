import {
  AuditAction,
  ComplianceIndicator,
  DelegationStatus,
  DelegationType,
  ElevatorStatus,
  OrgType,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { computeElevatorComplianceIndicator, ELEVATOR_COMPLIANCE_INCLUDE } from "@/lib/elevators/elevator-compliance-stats";
import { AuditService } from "@/lib/audit/audit-service";
import { NumberFormatService } from "@/lib/services/number-format-service";
import { CertificateService } from "@/lib/services/certificate-service";
import { BuildingService } from "@/lib/services/building-service";
import { QrService } from "@/lib/services/qr-service";
import { PostApprovalAssetService } from "@/lib/services/post-approval-asset-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";

type ApprovedApplication = Prisma.ApplicationGetPayload<{
  include: {
    data: { include: { municipality: true } };
    ownerOrg: true;
    installerOrg: true;
    certifierOrg: true;
  };
}>;

export class ElevatorService {
  static async createFromApprovedApplication(
    application: ApprovedApplication,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    if (!application.installerOrgId || !application.certifierOrgId || !application.data) {
      throw new Error("Aplikimi nuk ka të dhëna të plota për krijimin e ashensorit.");
    }

    const data = application.data;

    if (
      !data.municipalityId ||
      !data.buildingAddress ||
      !data.elevatorType ||
      !data.manufacturer ||
      !data.serialNumber ||
      !data.floorsServed
    ) {
      throw new Error("Të dhënat teknike dhe vendndodhja nuk janë të plota.");
    }

    const municipality = data.municipality ?? (await tx.geoMunicipality.findUnique({
      where: { id: data.municipalityId },
    }));

    if (!municipality) {
      throw new Error("Bashkia nuk u gjet.");
    }

    const registryNumber = await NumberFormatService.nextRegistryNumber(
      data.municipalityId,
      municipality,
      tx,
    );
    const today = new Date();

    const certifierMetadata = {
      omiNumber: data.omiNumber,
      examinationType: data.examinationType,
      examinationDate: data.examinationDate,
      conformityResult: data.conformityResult,
      certificateReference: data.certificateReference ?? data.installationCertificateNumber,
      installationCertificateDate: data.installationCertificateDate,
      certifierNotes: data.certifierNotes,
      certifierTechnicalNotes: data.certifierTechnicalNotes,
    };

    const elevator = await tx.elevator.create({
      data: {
        registryNumber,
        applicationId: application.id,
        status: ElevatorStatus.ACTIVE,
        ownerOrgId: application.ownerOrgId,
        installerOrgId: application.installerOrgId,
        certifierOrgId: application.certifierOrgId,
        buildingAddress: data.buildingAddress,
        municipalityId: data.municipalityId,
        administrativeUnitId: data.administrativeUnitId,
        buildingName: data.buildingName,
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
        registrationDate: today,
        activationDate: today,
      },
    });

    await AuditService.log(
      {
        actorId,
        action: AuditAction.CREATE,
        entityType: "elevator",
        entityId: elevator.id,
        afterState: {
          registryNumber,
          applicationId: application.id,
          status: ElevatorStatus.ACTIVE,
        },
      },
      tx,
    );

    await BuildingService.linkElevatorToBuilding(
      {
        elevatorId: elevator.id,
        address: data.buildingAddress,
        municipalityId: data.municipalityId,
        administrativeUnitId: data.administrativeUnitId,
        buildingName: data.buildingName,
        buildingType: data.buildingType,
        ownerOrgId: application.ownerOrgId,
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
      },
      tx,
    );

    const technicalVersion = await tx.elevatorTechnicalDataVersion.create({
      data: {
        elevatorId: elevator.id,
        applicationId: application.id,
        versionNumber: 1,
        isCurrent: true,
        elevatorType: data.elevatorType,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        manufacturingYear: data.manufacturingYear,
        capacityKg: data.capacityKg,
        capacityPersons: data.capacityPersons,
        speedMs: data.speedMs,
        floorsServed: data.floorsServed,
        stops: data.stops,
        driveType: data.driveType,
        additionalData: {
          ...(data.additionalTechnical && typeof data.additionalTechnical === "object"
            ? (data.additionalTechnical as Record<string, unknown>)
            : {}),
          certifierMetadata,
        },
        changeReason: "Regjistrim i ri nga aplikimi i miratuar",
        createdById: actorId,
      },
    });

    await AuditService.log(
      {
        actorId,
        action: AuditAction.CREATE,
        entityType: "elevator_technical_data_version",
        entityId: technicalVersion.id,
        afterState: { elevatorId: elevator.id, versionNumber: 1 },
      },
      tx,
    );

    await tx.elevatorTechnicalData.create({
      data: {
        elevatorId: elevator.id,
        elevatorType: data.elevatorType,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        manufacturingYear: data.manufacturingYear,
        capacityKg: data.capacityKg,
        capacityPersons: data.capacityPersons,
        speedMs: data.speedMs,
        floorsServed: data.floorsServed,
        stops: data.stops,
        driveType: data.driveType,
        additionalData: technicalVersion.additionalData ?? Prisma.JsonNull,
        currentVersionId: technicalVersion.id,
      },
    });

    await AuditService.log(
      {
        actorId,
        action: AuditAction.CREATE,
        entityType: "elevator_technical_data",
        entityId: elevator.id,
        afterState: { elevatorId: elevator.id, currentVersionId: technicalVersion.id },
      },
      tx,
    );

    const validFrom = today;

    for (const [orgId, role] of [
      [application.ownerOrgId, OrgType.OWNER],
      [application.installerOrgId, OrgType.INSTALLER],
      [application.certifierOrgId, OrgType.CERTIFIER],
    ] as const) {
      const entity = await tx.elevatorResponsibleEntity.create({
        data: {
          elevatorId: elevator.id,
          organizationId: orgId,
          role,
          validFrom,
          applicationId: application.id,
        },
      });

      await AuditService.log(
        {
          actorId,
          action: AuditAction.CREATE,
          entityType: "elevator_responsible_entity",
          entityId: entity.id,
          afterState: { elevatorId: elevator.id, organizationId: orgId, role },
        },
        tx,
      );
    }

    for (const [orgId, delegationType] of [
      [application.installerOrgId, DelegationType.INSTALLER],
      [application.certifierOrgId, DelegationType.CERTIFIER],
    ] as const) {
      await tx.elevatorDelegationHistory.create({
        data: {
          elevatorId: elevator.id,
          organizationId: orgId,
          delegationType,
          assignedById: actorId,
          acceptedAt: today,
          status: DelegationStatus.ACCEPTED,
        },
      });
    }

    const statusEntry = await tx.elevatorStatusHistory.create({
      data: {
        elevatorId: elevator.id,
        fromStatus: null,
        toStatus: ElevatorStatus.ACTIVE,
        reason: "Regjistrim i ri nga aplikimi i miratuar",
        applicationId: application.id,
        actorId,
      },
    });

    await AuditService.log(
      {
        actorId,
        action: AuditAction.CREATE,
        entityType: "elevator_status_history",
        entityId: statusEntry.id,
        afterState: { elevatorId: elevator.id, toStatus: ElevatorStatus.ACTIVE },
      },
      tx,
    );

    const ownershipEntry = await tx.elevatorOwnershipHistory.create({
      data: {
        elevatorId: elevator.id,
        oldOwnerId: application.ownerOrgId,
        newOwnerId: application.ownerOrgId,
        changeDate: today,
        applicationId: application.id,
        reason: "Pronësi fillestare - regjistrim i ri",
        createdById: actorId,
      },
    });

    await AuditService.log(
      {
        actorId,
        action: AuditAction.CREATE,
        entityType: "elevator_ownership_history",
        entityId: ownershipEntry.id,
        afterState: {
          elevatorId: elevator.id,
          ownerOrgId: application.ownerOrgId,
        },
      },
      tx,
    );

    await tx.application.update({
      where: { id: application.id },
      data: { elevatorId: elevator.id },
    });

    const certificate = await CertificateService.createRegistrationCertificateMetadata(
      {
        elevatorId: elevator.id,
        applicationId: application.id,
        issuedByOrgId: application.ownerOrgId,
        issuedByUserId: actorId,
        issuedDate: today,
      },
      tx,
    );

    const qr = await QrService.createQrSkeleton(elevator.id, actorId, tx);

    return { elevator, certificate, qr };
  }

  static async getByRegistryNumber(registryNumber: string) {
    return db.elevator.findFirst({
      where: { registryNumber, deletedAt: null },
      include: {
        technicalData: true,
        municipality: true,
        ownerOrg: true,
        installerOrg: true,
        certifierOrg: true,
        certificates: { where: { status: "ACTIVE" }, orderBy: { issuedDate: "desc" } },
        qrCodes: { where: { isActive: true } },
      },
    });
  }

  static async listForOwner(
    ownerOrgId: string,
    filters?: {
      status?: string;
      municipalityId?: string;
      complianceIndicator?: string;
      missingMaintenance?: boolean;
    },
  ) {
    const where: Prisma.ElevatorWhereInput = {
      ownerOrgId,
      deletedAt: null,
    };

    if (filters?.status) where.status = filters.status as Prisma.EnumElevatorStatusFilter["equals"];
    if (filters?.municipalityId) where.municipalityId = filters.municipalityId;
    if (filters?.missingMaintenance) where.maintenanceOrgId = null;

    const elevators = await db.elevator.findMany({
      where,
      include: {
        municipality: true,
        technicalData: true,
        maintenanceOrg: true,
        qrCodes: { where: { isActive: true }, take: 1 },
        maintenanceContracts: { where: { isActive: true }, orderBy: { endDate: "desc" }, take: 1 },
        ...ELEVATOR_COMPLIANCE_INCLUDE,
      },
      orderBy: { registryNumber: "asc" },
    });

    if (filters?.complianceIndicator) {
      return elevators.filter(
        (elv) =>
          computeElevatorComplianceIndicator(elv) ===
          (filters.complianceIndicator as ComplianceIndicator),
      );
    }

    return elevators;
  }

  static async getDigitalFile(elevatorId: string, ownerOrgId?: string | null) {
    const elevator = await db.elevator.findFirst({
      where: {
        id: elevatorId,
        deletedAt: null,
        ...(ownerOrgId ? { ownerOrgId } : {}),
      },
      include: {
        municipality: true,
        administrativeUnit: true,
        ownerOrg: true,
        installerOrg: true,
        certifierOrg: true,
        maintenanceOrg: true,
        technicalData: { include: { currentVersion: true } },
        technicalVersions: {
          orderBy: { versionNumber: "desc" },
          include: { createdBy: { select: { firstName: true, lastName: true } }, application: true },
        },
        certificates: { orderBy: { issuedDate: "desc" } },
        qrCodes: { where: { isActive: true }, take: 1 },
        maintenanceContracts: {
          orderBy: { startDate: "desc" },
          include: {
            maintenanceOrg: true,
            document: { select: { id: true, originalFilename: true } },
          },
        },
        maintenanceRecords: {
          orderBy: { performedDate: "desc" },
          include: {
            maintenanceOrg: true,
            document: { select: { id: true, originalFilename: true } },
          },
        },
        maintenanceCompliance: true,
        inspections: {
          orderBy: { conductedDate: "desc" },
          include: { inspector: { select: { firstName: true, lastName: true } } },
        },
        complianceIndicator: true,
        statusHistory: { orderBy: { createdAt: "desc" }, include: { actor: true } },
        ownershipHistory: {
          orderBy: { changeDate: "desc" },
          include: { oldOwner: true, newOwner: true },
        },
        delegationHistory: { orderBy: { assignedAt: "desc" }, include: { organization: true } },
        originatingApplication: {
          include: {
            ownerOrg: true,
            installerOrg: true,
            certifierOrg: true,
            delegations: { include: { organization: true } },
            data: {
              include: {
                municipality: true,
                administrativeUnit: true,
              },
            },
            workflowHistory: { orderBy: { createdAt: "desc" } },
          },
        },
        targetApplications: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { data: true },
        },
      },
    });

    return elevator;
  }

  static async ensureDigitalFileAssets(elevatorId: string, ownerOrgId: string | null | undefined, actorId: string) {
    const elevator = await db.elevator.findFirst({
      where: {
        id: elevatorId,
        deletedAt: null,
        ...(ownerOrgId ? { ownerOrgId } : {}),
      },
      include: {
        certificates: { where: { type: "REGISTRATION", status: "ACTIVE" }, take: 1 },
        qrCodes: { where: { isActive: true }, take: 1 },
        originatingApplication: true,
      },
    });

    if (!elevator) return null;

    const certificate = elevator.certificates[0];
    let qr = elevator.qrCodes[0];
    if (!certificate || !elevator.originatingApplication) {
      return this.getDigitalFile(elevatorId, ownerOrgId);
    }

    if (!qr) {
      qr = await db.$transaction((tx) => QrService.createQrSkeleton(elevatorId, actorId, tx));
    }

    if (!certificate.documentId || !qr.imageDocumentId) {
      try {
        await PostApprovalAssetService.tryGenerate({
          elevatorId: elevator.id,
          certificateId: certificate.id,
          qrCodeId: qr.id,
          applicationId: elevator.originatingApplication.id,
          actorId,
        });
      } catch {
        return this.getDigitalFile(elevatorId, ownerOrgId);
      }
    }

    return this.getDigitalFile(elevatorId, ownerOrgId);
  }

  static canOwnerAccess(elevator: { ownerOrgId: string }, activeOrgId: string) {
    return elevator.ownerOrgId === activeOrgId;
  }

  static async recordPhysicalVerification(ctx: AuthContext, elevatorId: string) {
    if (!hasPermission(ctx, PERMISSIONS.APPLICATIONS_REVIEW)) {
      throw new Error("Vetëm inspektori mund të regjistrojë verifikimin fizik.");
    }

    const elevator = await db.elevator.findFirst({
      where: { id: elevatorId, deletedAt: null },
    });
    if (!elevator) throw new Error("Ashensori nuk u gjet.");
    if (!elevator.requiresAttention) {
      throw new Error("Ky ashensor nuk pret verifikim fizik.");
    }

    await db.$transaction(async (tx) => {
      await tx.elevator.update({
        where: { id: elevatorId },
        data: { requiresAttention: false },
      });
      await tx.elevatorStatusHistory.create({
        data: {
          elevatorId,
          fromStatus: elevator.status,
          toStatus: elevator.status,
          reason: "Verifikim fizik në terren u konfirmua nga inspektori",
          actorId: ctx.userId,
        },
      });
      await AuditService.log(
        {
          actorId: ctx.userId,
          action: AuditAction.UPDATE,
          entityType: "elevator",
          entityId: elevatorId,
          afterState: { requiresAttention: false, physicalVerificationCompleted: true },
        },
        tx,
      );
    });

    return { ok: true };
  }
}
