import {
  AuditAction,
  CertificateStatus,
  DataUpdateType,
  DelegationStatus,
  DelegationType,
  ElevatorStatus,
  MaintenanceContractStatus,
  OrgType,
  Prisma,
} from "@prisma/client";
import { changesAffectCertificate } from "@/lib/lifecycle/certificate-affecting-fields";
import { AuditService } from "@/lib/audit/audit-service";
import { CertificateService } from "@/lib/services/certificate-service";
import { NotificationService } from "@/lib/services/notification-service";
import { NumberFormatService } from "@/lib/services/number-format-service";
import { SerialValidationService } from "@/lib/services/serial-validation-service";

export type FieldChange = {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  reason?: string;
};

type LifecycleApplication = Prisma.ApplicationGetPayload<{
  include: {
    data: true;
    targetElevator: {
      include: {
        technicalData: true;
        qrCodes: true;
        certificates: true;
      };
    };
    ownerOrg: true;
  };
}>;

function parseFieldChanges(raw: unknown): FieldChange[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is FieldChange =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as FieldChange).field === "string" &&
      typeof (item as FieldChange).newValue === "string",
  );
}

function decisionLabel(applicationNumber: string, today: Date): string {
  return `Vendim Nr.${applicationNumber.replace(/\D/g, "").slice(-6)} · ${today.toLocaleDateString("sq-AL")}`;
}

export class ElevatorLifecycleService {
  /** WF3 - Çregjistrim: QR off, certifikata revokuar, status DEREGISTERED */
  static async executeDeregistration(
    application: LifecycleApplication,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const elevator = application.targetElevator;
    if (!elevator) throw new Error("Ashensori i synuar nuk u gjet.");
    if (elevator.status === ElevatorStatus.DEREGISTERED) {
      throw new Error("Ashensori është tashmë i çregjistruar.");
    }

    const today = new Date();
    const reason =
      application.data?.deregistrationReason ??
      application.data?.deregistrationReasonType ??
      "Çregjistrim nga aplikim";
    const decision = decisionLabel(application.applicationNumber, today);

    await tx.elevator.update({
      where: { id: elevator.id },
      data: {
        status: ElevatorStatus.DEREGISTERED,
        deregistrationDate: today,
        deregistrationReason: `${reason} - ${decision}`,
      },
    });

    await tx.qrCode.updateMany({
      where: { elevatorId: elevator.id, isActive: true },
      data: { isActive: false, deactivatedAt: today },
    });

    await tx.certificate.updateMany({
      where: { elevatorId: elevator.id, status: CertificateStatus.ACTIVE },
      data: {
        status: CertificateStatus.REVOKED,
        revokedAt: today,
        revokedReason: `Çregjistrim - ${decision}`,
      },
    });

    await tx.maintenanceContract.updateMany({
      where: { elevatorId: elevator.id, isActive: true },
      data: { status: MaintenanceContractStatus.TERMINATED, isActive: false },
    });

    const statusEntry = await tx.elevatorStatusHistory.create({
      data: {
        elevatorId: elevator.id,
        fromStatus: elevator.status,
        toStatus: ElevatorStatus.DEREGISTERED,
        reason: `ÇREGJISTRUAR - ${decision}`,
        applicationId: application.id,
        actorId,
      },
    });

    await AuditService.log(
      {
        actorId,
        action: AuditAction.STATUS_CHANGE,
        entityType: "elevator",
        entityId: elevator.id,
        beforeState: { status: elevator.status },
        afterState: {
          status: ElevatorStatus.DEREGISTERED,
          deregistrationDate: today,
          decision,
        },
        metadata: { applicationId: application.id, statusHistoryId: statusEntry.id },
      },
      tx,
    );

    return { elevatorId: elevator.id, decision };
  }

  /** WF3 - Ndryshim kryesor (korrigjim gabimesh): fusha + CR i ri */
  static async executeDataCorrection(
    application: LifecycleApplication,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const elevator = application.targetElevator;
    if (!elevator) throw new Error("Ashensori i synuar nuk u gjet.");

    const changes = parseFieldChanges(application.data?.correctionFields);
    if (changes.length === 0) {
      throw new Error("Nuk ka fusha të ndryshuara në aplikim.");
    }

    const serialChange = changes.find((c) => c.field === "serialNumber");
    if (serialChange) {
      await SerialValidationService.assertUnique(serialChange.newValue, {
        excludeApplicationId: application.id,
        excludeElevatorId: elevator.id,
      });
    }

    const today = new Date();
    const decision = decisionLabel(application.applicationNumber, today);
    const { elevatorUpdates, technicalUpdates, applicationDataUpdates } =
      this.mapChangesToUpdates(changes, elevator);

    await this.applyResponsibleEntityChanges(application, elevator, changes, actorId, tx);

    if (Object.keys(applicationDataUpdates).length > 0 && application.data) {
      await tx.applicationData.update({
        where: { applicationId: application.id },
        data: applicationDataUpdates,
      });
    }

    if (Object.keys(elevatorUpdates).length > 0) {
      await tx.elevator.update({ where: { id: elevator.id }, data: elevatorUpdates });
    }

    if (Object.keys(technicalUpdates).length > 0 && elevator.technicalData) {
      const currentVersion = await tx.elevatorTechnicalDataVersion.findFirst({
        where: { elevatorId: elevator.id, isCurrent: true },
        orderBy: { versionNumber: "desc" },
      });
      const nextVersion = (currentVersion?.versionNumber ?? 0) + 1;

      if (currentVersion) {
        await tx.elevatorTechnicalDataVersion.update({
          where: { id: currentVersion.id },
          data: { isCurrent: false },
        });
      }

      const version = await tx.elevatorTechnicalDataVersion.create({
        data: {
          elevatorId: elevator.id,
          applicationId: application.id,
          versionNumber: nextVersion,
          isCurrent: true,
          elevatorType: elevator.technicalData.elevatorType,
          manufacturer:
            (technicalUpdates.manufacturer as string | undefined) ?? elevator.technicalData.manufacturer,
          model: (technicalUpdates.model as string | undefined) ?? elevator.technicalData.model,
          serialNumber:
            (technicalUpdates.serialNumber as string | undefined) ?? elevator.technicalData.serialNumber,
          manufacturingYear:
            (technicalUpdates.manufacturingYear as number | undefined) ??
            elevator.technicalData.manufacturingYear,
          capacityKg:
            (technicalUpdates.capacityKg as number | undefined) ?? elevator.technicalData.capacityKg,
          capacityPersons:
            (technicalUpdates.capacityPersons as number | undefined) ??
            elevator.technicalData.capacityPersons,
          speedMs:
            (technicalUpdates.speedMs as Prisma.Decimal | undefined) ?? elevator.technicalData.speedMs,
          floorsServed:
            (technicalUpdates.floorsServed as number | undefined) ?? elevator.technicalData.floorsServed,
          stops: (technicalUpdates.stops as number | undefined) ?? elevator.technicalData.stops,
          driveType:
            (technicalUpdates.driveType as string | undefined) ?? elevator.technicalData.driveType,
          changeReason: `Korrigjim - ${decision}`,
          createdById: actorId,
          additionalData: {
            correctionChanges: changes,
            previousVersionId: currentVersion?.id ?? null,
          },
        },
      });

      if (Object.keys(technicalUpdates).length > 0) {
        await tx.elevatorTechnicalData.update({
          where: { elevatorId: elevator.id },
          data: technicalUpdates,
        });
      }

      await tx.elevatorTechnicalData.update({
        where: { elevatorId: elevator.id },
        data: { currentVersionId: version.id },
      });
    }

    await tx.elevatorStatusHistory.create({
      data: {
        elevatorId: elevator.id,
        fromStatus: elevator.status,
        toStatus: elevator.status,
        reason: `NDRYSHUAR - ${decision}`,
        applicationId: application.id,
        actorId,
      },
    });

    const affectsCertificate = changes.length > 0;

    let newCertNumber: string | undefined;
    if (affectsCertificate) {
      const newCert = await this.issueReplacementCertificate(
        elevator.id,
        application.id,
        application.ownerOrgId,
        actorId,
        `Ndryshim të dhënash - ${decision}`,
        tx,
      );
      newCertNumber = newCert.certificateNumber;
    }

    await AuditService.log(
      {
        actorId,
        action: AuditAction.UPDATE,
        entityType: "elevator",
        entityId: elevator.id,
        beforeState: { changes: changes.map((c) => ({ field: c.field, old: c.oldValue })) },
        afterState: {
          changes: changes.map((c) => ({ field: c.field, new: c.newValue })),
          ...(newCertNumber ? { newCertificate: newCertNumber } : {}),
          certificateReissued: affectsCertificate,
        },
        metadata: { applicationId: application.id, lifecycle: "DATA_CORRECTION" },
      },
      tx,
    );

    return {
      elevatorId: elevator.id,
      decision,
      ...(newCertNumber ? { newCertificateNumber: newCertNumber } : {}),
    };
  }

  /** WF3 - Përditësim (ndryshime reale): fusha + CR i ri */
  static async executeDataUpdate(
    application: LifecycleApplication,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const elevator = application.targetElevator;
    if (!elevator) throw new Error("Ashensori i synuar nuk u gjet.");

    const updateType = application.data?.updateType as DataUpdateType | null | undefined;
    const changes = parseFieldChanges(application.data?.updateFields);
    if (changes.length === 0) {
      throw new Error("Nuk ka fusha të përditësuara në aplikim.");
    }

    const serialChange = changes.find((c) => c.field === "serialNumber");
    if (serialChange) {
      await SerialValidationService.assertUnique(serialChange.newValue, {
        excludeApplicationId: application.id,
        excludeElevatorId: elevator.id,
      });
    }

    const today = new Date();
    const decision = decisionLabel(application.applicationNumber, today);
    const { elevatorUpdates, technicalUpdates, applicationDataUpdates } =
      this.mapChangesToUpdates(changes, elevator);

    if (updateType === DataUpdateType.MAINTENANCE_COMPANY_CHANGE) {
      await this.applyMaintenanceCompanyChange(elevator, changes, actorId, tx);
    }

    if (updateType === DataUpdateType.RESPONSIBLE_ENTITY_CHANGE) {
      await this.applyResponsibleEntityChanges(application, elevator, changes, actorId, tx);
    } else if (updateType === DataUpdateType.OWNERSHIP_TRANSFER) {
      await this.applyOwnershipTransfer(application, elevator, changes, actorId, tx);
    }

    if (Object.keys(elevatorUpdates).length > 0) {
      await tx.elevator.update({ where: { id: elevator.id }, data: elevatorUpdates });
    }

    if (Object.keys(technicalUpdates).length > 0 && elevator.technicalData) {
      await tx.elevatorTechnicalData.update({
        where: { elevatorId: elevator.id },
        data: technicalUpdates,
      });
    }

    if (Object.keys(applicationDataUpdates).length > 0 && application.data) {
      await tx.applicationData.update({
        where: { applicationId: application.id },
        data: applicationDataUpdates,
      });
    }

    await tx.elevatorStatusHistory.create({
      data: {
        elevatorId: elevator.id,
        fromStatus: elevator.status,
        toStatus: elevator.status,
        reason: `PËRDITËSUAR - ${decision}`,
        applicationId: application.id,
        actorId,
      },
    });

    const contactOnly =
      updateType === DataUpdateType.CONTACT_UPDATE &&
      changes.every((c) =>
        ["responsibleEntityPhone", "responsibleEntityEmail"].includes(c.field),
      );

    const affectsCertificate =
      !contactOnly &&
      (changesAffectCertificate(changes) || changes.length > 0);

    let newCertNumber: string | undefined;
    if (affectsCertificate) {
      const newCert = await this.issueReplacementCertificate(
        elevator.id,
        application.id,
        application.ownerOrgId,
        actorId,
        `Përditësim - ${decision}`,
        tx,
      );
      newCertNumber = newCert.certificateNumber;
    }

    await AuditService.log(
      {
        actorId,
        action: AuditAction.UPDATE,
        entityType: "elevator",
        entityId: elevator.id,
        afterState: {
          updateType: application.data?.updateType,
          changes,
          ...(newCertNumber ? { newCertificate: newCertNumber } : {}),
          certificateReissued: affectsCertificate,
        },
        metadata: { applicationId: application.id, lifecycle: "DATA_UPDATE" },
      },
      tx,
    );

    return {
      elevatorId: elevator.id,
      decision,
      ...(newCertNumber ? { newCertificateNumber: newCertNumber } : {}),
    };
  }

  /** WF3 - Modernizim: version i ri teknik + certifikatë e re */
  static async executeModernization(
    application: LifecycleApplication,
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const elevator = application.targetElevator;
    if (!elevator) throw new Error("Ashensori i synuar nuk u gjet.");
    if (!application.data?.modernizationType) {
      throw new Error("Lloji i modernizimit nuk është specifikuar.");
    }

    const today = new Date();
    const decision = decisionLabel(application.applicationNumber, today);
    const modType = application.data.modernizationType;
    const modNotes = application.data.modernizationNotes ?? "";
    const d = application.data;
    const td = elevator.technicalData;

    if (elevator.technicalData || d?.elevatorType) {
      const currentVersion = await tx.elevatorTechnicalDataVersion.findFirst({
        where: { elevatorId: elevator.id, isCurrent: true },
        orderBy: { versionNumber: "desc" },
      });
      const nextVersion = (currentVersion?.versionNumber ?? 0) + 1;

      if (currentVersion) {
        await tx.elevatorTechnicalDataVersion.update({
          where: { id: currentVersion.id },
          data: { isCurrent: false },
        });
      }

      const version = await tx.elevatorTechnicalDataVersion.create({
        data: {
          elevatorId: elevator.id,
          applicationId: application.id,
          versionNumber: nextVersion,
          isCurrent: true,
          elevatorType: d?.elevatorType ?? td!.elevatorType,
          manufacturer: d?.manufacturer ?? td!.manufacturer,
          model: d?.model ?? td?.model,
          serialNumber: d?.serialNumber ?? td!.serialNumber,
          manufacturingYear: d?.manufacturingYear ?? td?.manufacturingYear,
          capacityKg: d?.capacityKg ?? td?.capacityKg,
          capacityPersons: d?.capacityPersons ?? td?.capacityPersons,
          speedMs: d?.speedMs ?? td?.speedMs,
          floorsServed: d?.floorsServed ?? td!.floorsServed,
          stops: d?.stops ?? td?.stops,
          driveType: d?.driveType ?? td?.driveType,
          changeReason: `Modernizim (${modType}) - ${decision}`,
          createdById: actorId,
          additionalData: {
            modernizationType: modType,
            modernizationNotes: modNotes,
            previousVersionId: currentVersion?.id ?? null,
            certifierMetadata: {
              omiNumber: d?.omiNumber,
              examinationType: d?.examinationType,
              examinationDate: d?.examinationDate,
              conformityResult: d?.conformityResult,
              certificateReference: d?.certificateReference ?? d?.installationCertificateNumber,
            },
          },
        },
      });

      await tx.elevatorTechnicalData.update({
        where: { elevatorId: elevator.id },
        data: {
          currentVersionId: version.id,
          elevatorType: d?.elevatorType ?? td!.elevatorType,
          manufacturer: d?.manufacturer ?? td!.manufacturer,
          model: d?.model ?? td?.model,
          serialNumber: d?.serialNumber ?? td!.serialNumber,
          manufacturingYear: d?.manufacturingYear ?? td?.manufacturingYear,
          capacityKg: d?.capacityKg ?? td?.capacityKg,
          capacityPersons: d?.capacityPersons ?? td?.capacityPersons,
          speedMs: d?.speedMs ?? td?.speedMs,
          floorsServed: d?.floorsServed ?? td!.floorsServed,
          stops: d?.stops ?? td?.stops,
          driveType: d?.driveType ?? td?.driveType,
          additionalData: {
            ...(typeof td?.additionalData === "object" && td?.additionalData !== null
              ? (td.additionalData as Record<string, unknown>)
              : {}),
            lastModernization: {
              type: modType,
              notes: modNotes,
              applicationId: application.id,
              date: today.toISOString(),
            },
          },
        },
      });
    }

    await tx.elevator.update({
      where: { id: elevator.id },
      data: { requiresAttention: false },
    });

    await tx.elevatorStatusHistory.create({
      data: {
        elevatorId: elevator.id,
        fromStatus: elevator.status,
        toStatus: elevator.status,
        reason: `MODERNIZUAR (${modType}) - ${decision}`,
        applicationId: application.id,
        actorId,
      },
    });

    const newCert = await this.issueReplacementCertificate(
      elevator.id,
      application.id,
      application.ownerOrgId,
      actorId,
      `Modernizim - ${decision}`,
      tx,
    );

    await AuditService.log(
      {
        actorId,
        action: AuditAction.UPDATE,
        entityType: "elevator",
        entityId: elevator.id,
        afterState: { modernizationType: modType, newCertificate: newCert.certificateNumber },
        metadata: { applicationId: application.id, lifecycle: "MODERNIZATION" },
      },
      tx,
    );

    return { elevatorId: elevator.id, decision, newCertificateNumber: newCert.certificateNumber };
  }

  /** WF3 - Ndryshim dytësor: kontakt / mirëmbajtje pa ISHMT */
  static async applyMinorContactUpdate(
    actorId: string,
    elevatorId: string,
    ownerOrgId: string,
    input: { phone?: string; email?: string; address?: string },
  ) {
    const elevator = await import("@/lib/db").then((m) =>
      m.db.elevator.findFirst({ where: { id: elevatorId, ownerOrgId, deletedAt: null } }),
    );
    if (!elevator) throw new Error("Ashensori nuk u gjet.");

    const { db } = await import("@/lib/db");
    await db.$transaction(async (tx) => {
      if (input.phone || input.email || input.address) {
        await tx.organization.update({
          where: { id: ownerOrgId },
          data: {
            ...(input.phone ? { phone: input.phone } : {}),
            ...(input.email ? { email: input.email } : {}),
            ...(input.address ? { address: input.address } : {}),
          },
        });
      }

      await AuditService.log(
        {
          actorId,
          action: AuditAction.UPDATE,
          entityType: "elevator_minor_change",
          entityId: elevatorId,
          afterState: { type: "CONTACT_UPDATE", ...input },
          metadata: { selfService: true, noIshmtApproval: true },
        },
        tx,
      );
    });
  }

  private static async applyResponsibleEntityChanges(
    application: LifecycleApplication,
    elevator: NonNullable<LifecycleApplication["targetElevator"]>,
    changes: FieldChange[],
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const nameChange = changes.find((c) => c.field === "responsibleEntityName");
    const idChange = changes.find((c) => c.field === "responsibleEntityIdentifier");
    if (!nameChange && !idChange) return;

    const today = new Date();

    await tx.organization.update({
      where: { id: application.ownerOrgId },
      data: {
        ...(nameChange ? { name: nameChange.newValue } : {}),
        ...(idChange ? { nipt: idChange.newValue } : {}),
      },
    });

    await tx.elevatorResponsibleEntity.updateMany({
      where: { elevatorId: elevator.id, role: OrgType.OWNER, validTo: null },
      data: { validTo: today },
    });

    await tx.elevatorResponsibleEntity.create({
      data: {
        elevatorId: elevator.id,
        organizationId: application.ownerOrgId,
        role: OrgType.OWNER,
        validFrom: today,
        applicationId: application.id,
      },
    });

    await tx.applicationData.update({
      where: { applicationId: application.id },
      data: {
        ...(nameChange ? { responsibleEntityName: nameChange.newValue } : {}),
        ...(idChange ? { responsibleEntityIdentifier: idChange.newValue } : {}),
      },
    });
  }

  private static async applyOwnershipTransfer(
    application: LifecycleApplication,
    elevator: NonNullable<LifecycleApplication["targetElevator"]>,
    changes: FieldChange[],
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const idChange = changes.find((c) => c.field === "responsibleEntityIdentifier");
    if (!idChange?.newValue.trim()) return;

    const newOwner = await tx.organization.findFirst({
      where: {
        type: OrgType.OWNER,
        nipt: idChange.newValue.trim().toUpperCase(),
        deletedAt: null,
        status: "ACTIVE",
      },
    });
    if (!newOwner) {
      throw new Error("Nuk u gjet organizatë personi përgjegjës i ashensorite aktive me NIPT-in e ri.");
    }
    if (newOwner.id === elevator.ownerOrgId) return;

    const today = new Date();

    await tx.elevatorOwnershipHistory.create({
      data: {
        elevatorId: elevator.id,
        oldOwnerId: elevator.ownerOrgId,
        newOwnerId: newOwner.id,
        changeDate: today,
        applicationId: application.id,
        reason: "Transferim pronësie - aplikim i miratuar",
        createdById: actorId,
      },
    });

    await tx.elevator.update({
      where: { id: elevator.id },
      data: { ownerOrgId: newOwner.id },
    });

    await tx.elevatorResponsibleEntity.updateMany({
      where: { elevatorId: elevator.id, role: OrgType.OWNER, validTo: null },
      data: { validTo: today },
    });

    await tx.elevatorResponsibleEntity.create({
      data: {
        elevatorId: elevator.id,
        organizationId: newOwner.id,
        role: OrgType.OWNER,
        validFrom: today,
        applicationId: application.id,
      },
    });
  }

  private static async applyMaintenanceCompanyChange(
    elevator: NonNullable<LifecycleApplication["targetElevator"]>,
    changes: FieldChange[],
    actorId: string,
    tx: Prisma.TransactionClient,
  ) {
    const orgChange = changes.find((c) => c.field === "maintenanceOrgId");
    if (!orgChange?.newValue) {
      throw new Error("Zgjidhni kompaninë e re të mirëmbajtjes.");
    }

    const newOrg = await tx.organization.findFirst({
      where: {
        id: orgChange.newValue,
        type: OrgType.MAINTENANCE,
        deletedAt: null,
        status: "ACTIVE",
        qkbValidated: true,
      },
    });
    if (!newOrg) {
      throw new Error("Kompania e mirëmbajtjes së re nuk u gjet ose nuk është aktive.");
    }

    await tx.maintenanceContract.updateMany({
      where: { elevatorId: elevator.id, serviceType: "MAINTENANCE", isActive: true },
      data: { status: MaintenanceContractStatus.TERMINATED, isActive: false },
    });

    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);

    await tx.maintenanceContract.create({
      data: {
        elevatorId: elevator.id,
        maintenanceOrgId: newOrg.id,
        serviceType: "MAINTENANCE",
        contractNumber: await NumberFormatService.nextContractNumber("MAINTENANCE", tx),
        startDate: start,
        endDate: end,
        status: MaintenanceContractStatus.PENDING,
        isActive: false,
      },
    });

    await tx.elevatorDelegationHistory.create({
      data: {
        elevatorId: elevator.id,
        organizationId: newOrg.id,
        delegationType: DelegationType.MAINTENANCE,
        assignedById: actorId,
        status: DelegationStatus.PENDING,
      },
    });

    await tx.elevator.update({
      where: { id: elevator.id },
      data: { maintenanceOrgId: null },
    });

    await NotificationService.notifyOrgMembers(newOrg.id, {
      title: "Ftesë për mirëmbajtje (përditësim)",
      body: `Jeni caktuar si mirëmbajtës i ri për ashensorin ${elevator.registryNumber}. Prisni konfirmimin e kontratës.`,
      entityType: "elevator",
      entityId: elevator.id,
    });
  }

  private static mapChangesToUpdates(
    changes: FieldChange[],
    elevator: NonNullable<LifecycleApplication["targetElevator"]>,
  ) {
    const elevatorUpdates: Prisma.ElevatorUpdateInput = {};
    const technicalUpdates: Prisma.ElevatorTechnicalDataUpdateInput = {};
    const applicationDataUpdates: Prisma.ApplicationDataUpdateInput = {};

    for (const change of changes) {
      switch (change.field) {
        case "buildingAddress":
          elevatorUpdates.buildingAddress = change.newValue;
          break;
        case "buildingName":
          elevatorUpdates.buildingName = change.newValue;
          break;
        case "serialNumber":
          technicalUpdates.serialNumber = change.newValue;
          break;
        case "manufacturer":
          technicalUpdates.manufacturer = change.newValue;
          break;
        case "model":
          technicalUpdates.model = change.newValue;
          break;
        case "responsibleEntityName":
          applicationDataUpdates.responsibleEntityName = change.newValue;
          break;
        case "responsibleEntityIdentifier":
          applicationDataUpdates.responsibleEntityIdentifier = change.newValue;
          break;
        case "responsibleEntityPhone":
          applicationDataUpdates.responsibleEntityPhone = change.newValue;
          break;
        case "responsibleEntityEmail":
          applicationDataUpdates.responsibleEntityEmail = change.newValue;
          break;
        case "omiNumber":
          applicationDataUpdates.omiNumber = change.newValue;
          break;
        case "examinationType":
          applicationDataUpdates.examinationType = change.newValue;
          break;
        case "floorsServed":
          technicalUpdates.floorsServed = parseInt(change.newValue, 10) || undefined;
          break;
        case "capacityKg":
          technicalUpdates.capacityKg = parseInt(change.newValue, 10) || undefined;
          break;
        default:
          break;
      }
    }

    return { elevatorUpdates, technicalUpdates, applicationDataUpdates };
  }

  private static async issueReplacementCertificate(
    elevatorId: string,
    applicationId: string,
    issuedByOrgId: string,
    actorId: string,
    reason: string,
    tx: Prisma.TransactionClient,
  ) {
    const activeCerts = await tx.certificate.findMany({
      where: { elevatorId, status: CertificateStatus.ACTIVE, type: "REGISTRATION" },
    });

    const newCert = await CertificateService.createRegistrationCertificateMetadata(
      { elevatorId, applicationId, issuedByOrgId, issuedByUserId: actorId },
      tx,
    );

    for (const old of activeCerts) {
      await tx.certificate.update({
        where: { id: old.id },
        data: {
          status: CertificateStatus.SUPERSEDED,
          supersededById: newCert.id,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      });
    }

    return newCert;
  }

  static async validateBeforeSubmit(application: {
    id: string;
    type: import("@prisma/client").ApplicationType;
    elevatorId: string | null;
    data: LifecycleApplication["data"];
    installerOrgId?: string | null;
    certifierOrgId?: string | null;
  }) {
    const data = application.data;
    if (application.type === "DEREGISTRATION") {
      if (!data?.deregistrationReasonType || !data.deregistrationReason?.trim()) {
        throw new Error("Plotësoni arsyen e çregjistrimit.");
      }
    }
    if (application.type === "DATA_CORRECTION") {
      const changes = parseFieldChanges(data?.correctionFields);
      if (changes.length === 0) throw new Error("Specifikoni të paktën një fushë për korrigjim.");
      const serial = changes.find((c) => c.field === "serialNumber");
      if (serial) {
        await SerialValidationService.assertUnique(serial.newValue, {
          excludeApplicationId: application.id,
          excludeElevatorId: application.elevatorId ?? undefined,
        });
      }
    }
    if (application.type === "DATA_UPDATE") {
      if (!data?.updateType) throw new Error("Zgjidhni llojin e përditësimit.");
      if (data.updateType === "OWNERSHIP_TRANSFER") return;
      const changes = parseFieldChanges(data?.updateFields);
      if (changes.length === 0) throw new Error("Specifikoni të paktën një fushë për përditësim.");
      if (
        data.updateType === "MAINTENANCE_COMPANY_CHANGE" &&
        !changes.some((c) => c.field === "maintenanceOrgId")
      ) {
        throw new Error("Zgjidhni kompaninë e re të mirëmbajtjes.");
      }
      const serial = changes.find((c) => c.field === "serialNumber");
      if (serial) {
        await SerialValidationService.assertUnique(serial.newValue, {
          excludeApplicationId: application.id,
          excludeElevatorId: application.elevatorId ?? undefined,
        });
      }
    }
    if (application.type === "MODERNIZATION") {
      if (!data?.modernizationType) throw new Error("Zgjidhni llojin e modernizimit.");
      if (!data?.modernizationNotes?.trim() || data.modernizationNotes.trim().length < 10) {
        throw new Error("Përshkrimi i modernizimit duhet të ketë të paktën 10 karaktere.");
      }
      if (!application.installerOrgId) throw new Error("Caktoni kompaninë instaluese.");
      if (!application.certifierOrgId) throw new Error("Caktoni kompaninë certifikuese.");
      if (!data?.serialNumber?.trim()) throw new Error("Numri serial mungon.");
      if (!data?.manufacturer?.trim()) throw new Error("Prodhuesi mungon.");
      if (!data?.floorsServed) throw new Error("Katet e shërbyer mungojnë.");
      if (!data?.installationCertificateNumber?.trim()) {
        throw new Error("Numri i certifikatës së instalimit mungon.");
      }
      if (!data?.installationCertificateDate) {
        throw new Error("Data e certifikatës së instalimit mungon.");
      }
      await SerialValidationService.assertUnique(data.serialNumber.trim(), {
        excludeApplicationId: application.id,
        excludeElevatorId: application.elevatorId ?? undefined,
      });
    }
  }

  static async notifyLifecycleComplete(
    application: LifecycleApplication,
    title: string,
    body: string,
  ) {
    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title,
      body,
      entityType: "application",
      entityId: application.id,
    });
  }
}
