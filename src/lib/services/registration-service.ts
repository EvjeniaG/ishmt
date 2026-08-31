import {
  ApplicationStatus,
  ApplicationType,
  AuditAction,
  ConformityResult,
  DelegationStatus,
  DelegationType,
  ElevatorType,
  OrgType,
  Prisma,
  ReturnTargetRole,
} from "@prisma/client";
import { SerialValidationService } from "@/lib/services/serial-validation-service";
import { AuditService } from "@/lib/audit/audit-service";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/permissions/guards";
import { ROLE_CODES } from "@/lib/constants/roles";
import { isReturnedToRole } from "@/lib/workflows/return-targets";
import {
  assertTransition,
  resolveReturnResumeStatus,
} from "@/lib/workflows/application-workflow";
import { initialInstallerTechnicalReviewExtended } from "@/lib/registration/installer-technical-review";
import { activeCertifierOrgWhere } from "@/lib/organizations/licensed-org-filters";
import { ApplicationService } from "@/lib/services/application-service";
import { assertInstallerDistinctFromCertifier } from "@/lib/registration/registration-party-rules";
import { NotificationService } from "@/lib/services/notification-service";
import {
  mapConformityResult,
  mapRegistrationBuildingType,
  mapRegistrationUsagePurpose,
  mapSpeedRangeToMs,
} from "@/lib/registration/building-type-map";
import type { RegistrationBasicDataInput } from "@/lib/validations/registration-basic-data";
import { parseRegistrationBuildingGps } from "@/lib/validations/registration-basic-data";
import { reverseGeocodeCoordinates } from "@/lib/geo/reverse-geocode";
import type { RegistrationTechnicalDataInput } from "@/lib/validations/registration-technical-data";
import type { RegistrationCertificationDataInput } from "@/lib/validations/registration-certification-data";
import {
  getMissingRequiredApplicationDocuments,
  getMissingRequiredApplicationDocumentsForPhases,
  getRegistrationDocumentSpecsByPhase,
} from "@/lib/documents/application-document-checklist";
import { DocumentService } from "@/lib/services/document-service";
import { OrganizationCapabilityService } from "@/lib/services/organization-capability-service";
import { resolveLegacyDistrictCode } from "@/lib/registration/municipality-legacy-district";

const DELEGATION_EXPIRY_DAYS = 7;

function driveTypeToElevatorType(drive: string): ElevatorType {
  if (drive.includes("HIDRAULIK")) return ElevatorType.PASSENGER;
  if (drive === "PERSONA_ME_AFTESI_TE_KUFIZUAR") return ElevatorType.HANDICAPPED;
  return ElevatorType.PASSENGER;
}

export class RegistrationService {
  static assertNewRegistration(app: { type: ApplicationType }) {
    if (app.type !== ApplicationType.NEW_REGISTRATION) {
      throw new Error("Ky proces vlen vetëm për regjistrim të ri.");
    }
  }

  static async updateBasicData(
    ctx: AuthContext,
    applicationId: string,
    input: RegistrationBasicDataInput,
  ) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { data: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (!ApplicationService.canAccess(ctx, application)) throw new Error("Nuk keni leje.");
    this.assertNewRegistration(application);

    const allowed: ApplicationStatus[] = [
      ApplicationStatus.DRAFT,
      ApplicationStatus.RETURNED,
      ApplicationStatus.BASIC_DATA_COMPLETED,
      ApplicationStatus.CERTIFICATION_COMPLETED,
      ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES,
      ApplicationStatus.PENDING_OWNER_SUBMISSION,
    ];
    if (!allowed.includes(application.status)) {
      throw new Error(`Nuk mund të përditësohen të dhënat bazë në statusin '${application.status}'.`);
    }
    if (application.status === ApplicationStatus.RETURNED && !isReturnedToRole(application, ReturnTargetRole.OWNER)) {
      throw new Error("Korrigjimi duhet të bëhet nga roli i caktuar nga IQMT.");
    }
    if (ctx.roleCode !== ROLE_CODES.OWNER) throw new Error("Vetëm personi përgjegjës mund të plotësojë të dhënat bazë.");

    const municipality = await db.geoMunicipality.findUnique({
      where: { id: input.municipalityId },
      select: { code: true, legacyRegistryCode: true, nameSq: true },
    });
    if (!municipality) throw new Error("Bashkia e zgjedhur nuk u gjet.");
    const legacyDistrictCode = resolveLegacyDistrictCode(municipality);
    if (!legacyDistrictCode) {
      throw new Error(`Nuk u llogarit dot kodi i distriktit për bashkinë ${municipality.nameSq}.`);
    }

    const isAdministrator = input.responsibleEntityType === "ADMINISTRATOR";

    let buildingAddress = input.buildingAddress?.trim() || "";
    let gpsLatitude: number | null = null;
    let gpsLongitude: number | null = null;

    if (input.buildingAddressMode === "gps") {
      const gps = parseRegistrationBuildingGps(input);
      if (gps) {
        gpsLatitude = gps.latitude;
        gpsLongitude = gps.longitude;
        if (!buildingAddress) {
          buildingAddress =
            (await reverseGeocodeCoordinates(gps.latitude, gps.longitude)) ?? buildingAddress;
        }
      }
    }

    const extended = {
      elevatorConditionType: input.elevatorConditionType,
      applicationSubtype: input.applicationSubtype,
      existingRegisteredElevatorsCount: input.existingRegisteredElevatorsCount,
      elevatorInServiceDate: input.elevatorInServiceDate,
      buildingAddressMode: input.buildingAddressMode,
      responsibleEntityType: input.responsibleEntityType,
      responsibleIdentifierType: input.responsibleIdentifierType,
      representedBy: isAdministrator ? undefined : input.representedBy,
      representativePosition: isAdministrator ? undefined : input.representativePosition,
      registrationBuildingType: input.registrationBuildingType,
      buildingMainUse: input.buildingMainUse,
      businessNameIfWorkplace: input.businessNameIfWorkplace,
      businessNiptIfWorkplace: input.businessNiptIfWorkplace,
      usagePurposeCode: input.usagePurposeCode,
      usagePurposeOther: input.usagePurposeOther,
    };

    const isOwnerReturnCorrection =
      application.status === ApplicationStatus.RETURNED &&
      isReturnedToRole(application, ReturnTargetRole.OWNER) &&
      input.saveAsDraft !== "true";

    const isPreSubmitEdit =
      application.status === ApplicationStatus.CERTIFICATION_COMPLETED ||
      application.status === ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES ||
      application.status === ApplicationStatus.PENDING_OWNER_SUBMISSION;

    const isAdvancing =
      !isOwnerReturnCorrection &&
      !isPreSubmitEdit &&
      input.saveAsDraft !== "true";

    if (isAdvancing) {
      const uploadedPurposes = await DocumentService.listPurposesForEntity("application", applicationId);
      const dataForDocs = {
        ...application.data,
        specificPosition: input.specificPosition ?? application.data?.specificPosition,
        registrationExtendedData: extended,
      };
      const missingOwnerDocs = getMissingRequiredApplicationDocumentsForPhases({
        type: ApplicationType.NEW_REGISTRATION,
        data: dataForDocs,
        uploadedPurposes,
        phases: ["owner"],
      });
      if (missingOwnerDocs.length > 0) {
        throw new Error(
          `Ngarkoni dokumentet e detyrueshme para se të vazhdoni: ${missingOwnerDocs.map((d) => d.label).join(", ")}.`,
        );
      }
    }

    const willTransition =
      isAdvancing &&
      application.status !== ApplicationStatus.BASIC_DATA_COMPLETED;
    const toStatus = willTransition
      ? assertTransition(application.type, application.status, "SAVE_BASIC_DATA", ctx.roleCode)
      : null;

    // Data update + status transition + history + audit are committed atomically.
    const existingTechnical =
      (application.data?.additionalTechnical as Record<string, unknown> | null) ?? {};
    const additionalTechnical = {
      ...existingTechnical,
      installationDate: input.elevatorInServiceDate,
      commissioningDate:
        (existingTechnical.commissioningDate as string | undefined) ?? input.elevatorInServiceDate,
    };

    await db.$transaction(async (tx) => {
      await tx.applicationData.update({
        where: { applicationId },
        data: {
          applicationDate: new Date(input.applicationDate),
          buildingAddress: buildingAddress || null,
          gpsLatitude,
          gpsLongitude,
          municipalityId: input.municipalityId,
          administrativeUnitId: input.administrativeUnitId || null,
          buildingName: input.buildingName,
          entrance: input.entrance,
          specificPosition: input.specificPosition,
          legacyDistrictCode,
          buildingType: mapRegistrationBuildingType(input.registrationBuildingType),
          usagePurpose: mapRegistrationUsagePurpose(input.usagePurposeCode),
          responsibleEntityName: input.responsibleEntityName,
          responsibleEntityIdentifier: input.responsibleIdentifier,
          responsibleEntityEmail: input.responsibleEmail,
          responsibleEntityPhone: input.responsiblePhone,
          notes: input.ownerNotes,
          registrationExtendedData: extended,
          additionalTechnical,
        },
      });

      if (toStatus) {
        await tx.application.update({ where: { id: applicationId }, data: { status: toStatus } });
        await tx.applicationWorkflowHistory.create({
          data: {
            applicationId,
            fromStatus: application.status,
            toStatus,
            action: "SAVE_BASIC_DATA",
            actorId: ctx.userId,
          },
        });
        await AuditService.log(
          {
            actorId: ctx.userId,
            action: AuditAction.UPDATE,
            entityType: "application",
            entityId: applicationId,
            afterState: { action: "APPLICATION_BASIC_DATA_UPDATED", status: toStatus },
          },
          tx,
        );
      }
    });

    if (isOwnerReturnCorrection) {
      return ApplicationService.applyReturnCorrection(
        ctx,
        application,
        ReturnTargetRole.OWNER,
        "OWNER_CORRECTION_COMPLETED",
      );
    }

    return ApplicationService.getById(ctx, applicationId);
  }

  static async assignInstaller(ctx: AuthContext, applicationId: string, installerOrgId: string) {
    const application = await db.application.findFirst({ where: { id: applicationId, deletedAt: null } });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    this.assertNewRegistration(application);

    const allowed: ApplicationStatus[] = [ApplicationStatus.BASIC_DATA_COMPLETED, ApplicationStatus.RETURNED];
    if (!allowed.includes(application.status)) {
      throw new Error(`Caktimi i instaluesit nuk lejohet në statusin '${application.status}'.`);
    }

    await OrganizationCapabilityService.assertInstallerProvider(installerOrgId);
    assertInstallerDistinctFromCertifier(installerOrgId, application.certifierOrgId);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DELEGATION_EXPIRY_DAYS);

    const toStatus = assertTransition(application.type, application.status, "ASSIGN_INSTALLER", ctx.roleCode);

    await db.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: { status: toStatus, installerOrgId },
      });
      await tx.applicationDelegation.upsert({
        where: {
          applicationId_organizationId_accessType: {
            applicationId,
            organizationId: installerOrgId,
            accessType: DelegationType.INSTALLER,
          },
        },
        update: { status: DelegationStatus.INVITED, invitedAt: new Date(), expiresAt, invitedById: ctx.userId },
        create: {
          applicationId,
          organizationId: installerOrgId,
          accessType: DelegationType.INSTALLER,
          status: DelegationStatus.INVITED,
          invitedById: ctx.userId,
          expiresAt,
        },
      });
      await tx.applicationWorkflowHistory.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus,
          action: "INSTALLER_DELEGATED",
          actorId: ctx.userId,
        },
      });
      await AuditService.log(
        { actorId: ctx.userId, action: AuditAction.WORKFLOW_TRANSITION, entityType: "application", entityId: applicationId, afterState: { installerOrgId, status: toStatus } },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(installerOrgId, {
      title: "Ftesë për instalim",
      body: `Jeni ftuar për aplikimin ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async respondInstallerDelegation(ctx: AuthContext, applicationId: string, accept: boolean) {
    return accept
      ? this.acceptInstallerDelegation(ctx, applicationId)
      : this.rejectInstallerDelegation(ctx, applicationId);
  }

  static async acceptInstallerDelegation(ctx: AuthContext, applicationId: string) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { delegations: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (application.installerOrgId !== ctx.activeOrgId) throw new Error("Ky aplikim nuk është për organizatën tuaj.");

    const delegation = application.delegations.find((d) => d.accessType === DelegationType.INSTALLER);
    const inviteStatuses: DelegationStatus[] = [DelegationStatus.PENDING, DelegationStatus.INVITED];
    if (!delegation || !inviteStatuses.includes(delegation.status)) {
      throw new Error("Nuk ka ftesë aktive.");
    }
    if (delegation.expiresAt && delegation.expiresAt < new Date()) {
      throw new Error("Ftesa ka skaduar.");
    }

    const toStatus = assertTransition(application.type, application.status, "ACCEPT_DELEGATION", ctx.roleCode);

    await db.$transaction(async (tx) => {
      await tx.applicationDelegation.update({
        where: { id: delegation.id },
        data: { status: DelegationStatus.ACCEPTED, acceptedAt: new Date() },
      });
      await tx.application.update({ where: { id: applicationId }, data: { status: toStatus } });
      await tx.applicationWorkflowHistory.create({
        data: { applicationId, fromStatus: application.status, toStatus, action: "INSTALLER_ACCEPTED", actorId: ctx.userId },
      });
      await AuditService.log(
        { actorId: ctx.userId, action: AuditAction.WORKFLOW_TRANSITION, entityType: "application", entityId: applicationId, afterState: { action: "INSTALLER_ACCEPTED" } },
        tx,
      );
    });

    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title: "Instaluesi pranoi ftesën",
      body: `Kompania instaluese pranoi aplikimin ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async rejectInstallerDelegation(ctx: AuthContext, applicationId: string) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { delegations: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    const delegation = application.delegations.find((d) => d.accessType === DelegationType.INSTALLER);
    if (!delegation) throw new Error("Delegimi nuk u gjet.");

    const toStatus = assertTransition(application.type, application.status, "REJECT_DELEGATION", ctx.roleCode);

    await db.$transaction(async (tx) => {
      await tx.applicationDelegation.update({
        where: { id: delegation.id },
        data: { status: DelegationStatus.REJECTED },
      });
      await tx.application.update({
        where: { id: applicationId },
        data: { status: toStatus, installerOrgId: null },
      });
      await tx.applicationWorkflowHistory.create({
        data: { applicationId, fromStatus: application.status, toStatus, action: "INSTALLER_REJECTED", actorId: ctx.userId },
      });
    });

    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title: "Instaluesi refuzoi ftesën",
      body: `Duhet të zgjidhni një kompani tjetër instaluese për ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async submitTechnicalData(ctx: AuthContext, applicationId: string, input: RegistrationTechnicalDataInput) {
    const application = await db.application.findFirst({ where: { id: applicationId, deletedAt: null } });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (application.installerOrgId !== ctx.activeOrgId) throw new Error("Ky aplikim nuk është për organizatën tuaj.");

    const allowed: ApplicationStatus[] = [
      ApplicationStatus.INSTALLER_ACCEPTED,
      ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
      ApplicationStatus.PENDING_INSTALLER,
      ApplicationStatus.RETURNED,
    ];
    if (!allowed.includes(application.status)) {
      throw new Error(`Të dhënat teknike nuk mund të dorëzohen në statusin '${application.status}'.`);
    }
    if (
      application.status === ApplicationStatus.RETURNED &&
      !isReturnedToRole(application, ReturnTargetRole.INSTALLER)
    ) {
      throw new Error("Korrigjimi duhet të bëhet nga roli i caktuar nga IQMT.");
    }

    await this.assertSerialUnique(input.serialNumber, applicationId);

    // Validate the installer-phase document checklist before completing this step,
    // so EU declarations / safety-component lists are enforced where the installer
    // actually uploads them (instead of only at the certifier completion step).
    const checklistData = {
      additionalTechnical: {
        commissioningDate: input.commissioningDate,
        installationDate: input.installationDate,
      },
    };
    const installerPurposes = new Set(
      getRegistrationDocumentSpecsByPhase("installer", checklistData).map((spec) => spec.purpose),
    );
    const uploadedInstallerLinks = await db.documentLink.findMany({
      where: {
        entityType: "application",
        entityId: applicationId,
        purpose: { in: Array.from(installerPurposes) },
      },
      select: { purpose: true },
    });
    const missingInstallerDocs = getMissingRequiredApplicationDocuments({
      type: ApplicationType.NEW_REGISTRATION,
      data: checklistData,
      uploadedPurposes: uploadedInstallerLinks.map((l) => l.purpose ?? ""),
    }).filter((doc) => installerPurposes.has(doc.purpose));
    if (missingInstallerDocs.length > 0) {
      const list = missingInstallerDocs.map((d) => `Mungon ${d.label}.`).join(" ");
      throw new Error(`Dokumentacioni i instaluesit i paplotë: ${list}`);
    }

    const technicalExtended = {
      brand: input.brand,
      elevatorDriveType: input.elevatorDriveType,
      elevatorDriveTypeOther: input.elevatorDriveTypeOther,
      usageClassification: input.usageClassification,
      installationDate: input.installationDate,
      commissioningDate: input.commissioningDate,
      installationYear: input.installationYear,
      speedRange: input.speedRange,
      openings: input.openings,
      accessibleForDisabled: input.accessibleForDisabled,
      cabinDimensions: input.cabinDimensions,
      doorDimensions: input.doorDimensions,
      installerTechnicalNotes: input.installerTechnicalNotes,
    };

    const fromStatus = application.status;
    const isInstallerReturnCorrection =
      fromStatus === ApplicationStatus.RETURNED &&
      isReturnedToRole(application, ReturnTargetRole.INSTALLER);
    const toStatus = isInstallerReturnCorrection
      ? fromStatus
      : assertTransition(application.type, fromStatus, "COMPLETE_INSTALLER", ctx.roleCode);

    await db.$transaction(async (tx) => {
      await tx.applicationData.update({
        where: { applicationId },
        data: {
          manufacturer: input.manufacturer,
          model: input.model ?? input.brand,
          serialNumber: input.serialNumber,
          manufacturingYear: input.installationYear,
          capacityKg: input.capacityKg,
          capacityPersons: input.capacityPersons,
          speedMs: mapSpeedRangeToMs(input.speedRange),
          floorsServed: input.floorsServed,
          stops: input.stops,
          driveType: input.elevatorDriveType,
          elevatorType: driveTypeToElevatorType(input.elevatorDriveType),
          additionalTechnical: technicalExtended,
        },
      });
      if (!isInstallerReturnCorrection) {
        await tx.application.update({ where: { id: applicationId }, data: { status: toStatus } });
        await tx.applicationWorkflowHistory.create({
          data: { applicationId, fromStatus, toStatus, action: "TECHNICAL_DATA_COMPLETED", actorId: ctx.userId },
        });
        await AuditService.log(
          { actorId: ctx.userId, action: AuditAction.WORKFLOW_TRANSITION, entityType: "application", entityId: applicationId, afterState: { action: "TECHNICAL_DATA_COMPLETED" } },
          tx,
        );
      }
    });

    if (isInstallerReturnCorrection) {
      return ApplicationService.applyReturnCorrection(
        ctx,
        application,
        ReturnTargetRole.INSTALLER,
        "INSTALLER_CORRECTION_COMPLETED",
      );
    }

    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title: "Të dhënat teknike u plotësuan",
      body: `Instaluesi përfundoi të dhënat teknike për ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async assignCertifier(ctx: AuthContext, applicationId: string, certifierOrgId: string) {
    const application = await db.application.findFirst({ where: { id: applicationId, deletedAt: null } });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    const allowed: ApplicationStatus[] = [
      ApplicationStatus.TECHNICAL_DATA_COMPLETED,
      ApplicationStatus.INSTALLER_COMPLETED,
      ApplicationStatus.RETURNED,
    ];
    if (!allowed.includes(application.status)) {
      throw new Error(`Caktimi i certifikuesit nuk lejohet në statusin '${application.status}'.`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + DELEGATION_EXPIRY_DAYS);
    await this.assertActiveLicensedCompany(certifierOrgId, OrgType.CERTIFIER);
    assertInstallerDistinctFromCertifier(application.installerOrgId, certifierOrgId);

    const toStatus = assertTransition(application.type, application.status, "ASSIGN_CERTIFIER", ctx.roleCode);

    await db.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: { status: toStatus, certifierOrgId },
      });
      await tx.applicationDelegation.upsert({
        where: {
          applicationId_organizationId_accessType: {
            applicationId,
            organizationId: certifierOrgId,
            accessType: DelegationType.CERTIFIER,
          },
        },
        update: { status: DelegationStatus.INVITED, invitedAt: new Date(), expiresAt, invitedById: ctx.userId },
        create: {
          applicationId,
          organizationId: certifierOrgId,
          accessType: DelegationType.CERTIFIER,
          status: DelegationStatus.INVITED,
          invitedById: ctx.userId,
          expiresAt,
        },
      });
      await tx.applicationWorkflowHistory.create({
        data: { applicationId, fromStatus: application.status, toStatus, action: "CERTIFIER_DELEGATED", actorId: ctx.userId },
      });
    });

    await NotificationService.notifyOrgMembers(certifierOrgId, {
      title: "Ftesë për certifikim",
      body: `Jeni ftuar për certifikimin e aplikimit ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async respondCertifierDelegation(ctx: AuthContext, applicationId: string, accept: boolean) {
    return accept
      ? this.acceptCertifierDelegation(ctx, applicationId)
      : this.rejectCertifierDelegation(ctx, applicationId);
  }

  static async acceptCertifierDelegation(ctx: AuthContext, applicationId: string) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { delegations: true, data: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (application.certifierOrgId !== ctx.activeOrgId) throw new Error("Ky aplikim nuk është për organizatën tuaj.");

    const delegation = application.delegations.find((d) => d.accessType === DelegationType.CERTIFIER);
    const inviteStatuses: DelegationStatus[] = [DelegationStatus.PENDING, DelegationStatus.INVITED];
    if (!delegation || !inviteStatuses.includes(delegation.status)) {
      throw new Error("Nuk ka ftesë aktive.");
    }

    const toStatus = assertTransition(application.type, application.status, "ACCEPT_CERTIFIER", ctx.roleCode);

    await db.$transaction(async (tx) => {
      await tx.applicationDelegation.update({
        where: { id: delegation.id },
        data: { status: DelegationStatus.ACCEPTED, acceptedAt: new Date() },
      });
      await tx.application.update({ where: { id: applicationId }, data: { status: toStatus } });
      if (application.data) {
        await tx.applicationData.update({
          where: { applicationId },
          data: {
            registrationExtendedData: initialInstallerTechnicalReviewExtended(
              application.data.registrationExtendedData,
            ) as Prisma.InputJsonValue,
          },
        });
      }
      await tx.applicationWorkflowHistory.create({
        data: { applicationId, fromStatus: application.status, toStatus, action: "CERTIFIER_ACCEPTED", actorId: ctx.userId },
      });
    });

    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title: "Certifikuesi pranoi ftesën",
      body: `OM / certifikuesi pranoi aplikimin ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async rejectCertifierDelegation(ctx: AuthContext, applicationId: string) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { delegations: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");

    const delegation = application.delegations.find((d) => d.accessType === DelegationType.CERTIFIER);
    if (!delegation) throw new Error("Delegimi nuk u gjet.");

    const toStatus = assertTransition(application.type, application.status, "REJECT_DELEGATION", ctx.roleCode);

    await db.$transaction(async (tx) => {
      await tx.applicationDelegation.update({
        where: { id: delegation.id },
        data: { status: DelegationStatus.REJECTED },
      });
      await tx.application.update({
        where: { id: applicationId },
        data: { status: toStatus, certifierOrgId: null },
      });
      await tx.applicationWorkflowHistory.create({
        data: { applicationId, fromStatus: application.status, toStatus, action: "CERTIFIER_REJECTED", actorId: ctx.userId },
      });
    });

    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title: "Certifikuesi refuzoi ftesën",
      body: `Duhet të zgjidhni një OM tjetër për ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async submitCertificationData(
    ctx: AuthContext,
    applicationId: string,
    input: RegistrationCertificationDataInput,
  ) {
    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { data: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (application.certifierOrgId !== ctx.activeOrgId) throw new Error("Ky aplikim nuk është për organizatën tuaj.");

    const allowed: ApplicationStatus[] = [
      ApplicationStatus.CERTIFIER_ACCEPTED,
      ApplicationStatus.CERTIFICATION_IN_PROGRESS,
      ApplicationStatus.PENDING_CERTIFIER,
      ApplicationStatus.RETURNED,
    ];
    if (!allowed.includes(application.status)) {
      throw new Error(`Certifikimi nuk mund të dorëzohet në statusin '${application.status}'.`);
    }
    if (
      application.status === ApplicationStatus.RETURNED &&
      !isReturnedToRole(application, ReturnTargetRole.CERTIFIER)
    ) {
      throw new Error("Korrigjimi duhet të bëhet nga roli i caktuar nga IQMT.");
    }

    const allCertificationPurposes = [
      "INITIAL_INSPECTION_CERT",
      "EU_DECLARATION_CE",
      "EU_DECLARATION_INSTALLER",
      "SAFETY_COMPONENTS_LIST",
    ];
    const uploadedLinks = await db.documentLink.findMany({
      where: {
        entityType: "application",
        entityId: applicationId,
        purpose: { in: allCertificationPurposes },
      },
      select: { purpose: true },
    });
    const uploadedPurposes = uploadedLinks.map((l) => l.purpose ?? "");
    const missingDocs = getMissingRequiredApplicationDocuments({
      type: ApplicationType.NEW_REGISTRATION,
      data: application.data,
      uploadedPurposes,
    }).filter((doc) => allCertificationPurposes.includes(doc.purpose));
    if (missingDocs.length > 0) {
      const list = missingDocs.map((d) => `Mungon ${d.label}.`).join(" ");
      throw new Error(`Dokumentacioni i paplotë: ${list}`);
    }

    const conformity = mapConformityResult(input.conformityResultCode);
    const existingTechnical =
      application.data?.additionalTechnical && typeof application.data.additionalTechnical === "object"
        ? (application.data.additionalTechnical as Record<string, unknown>)
        : {};
    const certExtended = {
      certifierResponsiblePerson: input.certifierResponsiblePerson,
      reportNumber: input.reportNumber,
      euDeclarationPresent: input.euDeclarationPresent,
      euDeclarationNumber: input.euDeclarationNumber,
      conformityResultCode: input.conformityResultCode,
      examinationTypeCode: input.examinationType,
    };

    const isCertifierReturnCorrection =
      application.status === ApplicationStatus.RETURNED &&
      isReturnedToRole(application, ReturnTargetRole.CERTIFIER);
    const toStatus = isCertifierReturnCorrection
      ? application.status
      : conformity === "NON_CONFORM"
        ? ApplicationStatus.CERTIFICATION_COMPLETED_WITH_ISSUES
        : assertTransition(application.type, application.status, "COMPLETE_CERTIFIER", ctx.roleCode);

    await db.$transaction(async (tx) => {
      await tx.applicationData.update({
        where: { applicationId },
        data: {
          omiNumber: input.omiNumber,
          examinationType: input.examinationType,
          examinationDate: new Date(input.examinationDate),
          conformityResult: conformity as ConformityResult,
          certificateReference: input.certificateReference,
          certifierTechnicalNotes: input.certifierTechnicalNotes,
          installationCertificateNumber: input.installationCertificateNumber,
          installationCertificateDate: new Date(input.installationCertificateDate),
          additionalTechnical: { ...existingTechnical, ...certExtended } as Prisma.InputJsonValue,
        },
      });
      if (!isCertifierReturnCorrection) {
        await tx.application.update({ where: { id: applicationId }, data: { status: toStatus } });
        await tx.applicationWorkflowHistory.create({
          data: { applicationId, fromStatus: application.status, toStatus, action: "CERTIFICATION_COMPLETED", actorId: ctx.userId },
        });
        await AuditService.log(
          { actorId: ctx.userId, action: AuditAction.WORKFLOW_TRANSITION, entityType: "application", entityId: applicationId, afterState: { conformity, status: toStatus } },
          tx,
        );
      }
    });

    if (isCertifierReturnCorrection) {
      return ApplicationService.applyReturnCorrection(
        ctx,
        application,
        ReturnTargetRole.CERTIFIER,
        "CERTIFIER_CORRECTION_COMPLETED",
      );
    }

    await NotificationService.notifyOrgMembers(application.ownerOrgId, {
      title: conformity === "NON_CONFORM" ? "Certifikimi - jo konform" : "Certifikimi u plotësua",
      body: `Certifikuesi përfundoi dokumentacionin për ${application.applicationNumber}.`,
      entityType: "application",
      entityId: applicationId,
    });

    // Raportim i dyfishtë: njoftohen njëkohësisht IQMT dhe Drejtoria e Tregut.
    if (conformity !== "NON_CONFORM") {
      const reportTargets = await db.organization.findMany({
        where: { type: { in: [OrgType.ISHMT, OrgType.DIRECTORATE] }, deletedAt: null },
        select: { id: true, type: true },
      });
      await Promise.all(
        reportTargets.map((org) =>
          org.type === OrgType.ISHMT
            ? NotificationService.notifyIshmtOperationsStaff(org.id, {
                title: "Raport certifikimi i ri",
                body: `Raporti i certifikimit për ${application.applicationNumber} u përcoll njëkohësisht tek IQMT dhe Drejtoria e Politikave të Tregut.`,
                entityType: "application",
                entityId: applicationId,
              })
            : NotificationService.notifyOrgMembers(org.id, {
                title: "Raport certifikimi i ri",
                body: `Raporti i certifikimit për ${application.applicationNumber} u përcoll njëkohësisht tek IQMT dhe Drejtoria e Politikave të Tregut.`,
                entityType: "application",
                entityId: applicationId,
              }),
        ),
      );
    }

    return ApplicationService.getById(ctx, applicationId);
  }

  static async submitToIshmt(ctx: AuthContext, applicationId: string, confirmed: boolean) {
    if (!confirmed) throw new Error("Duhet të konfirmoni saktësinë e të dhënave.");

    const application = await db.application.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { data: true },
    });
    if (!application) throw new Error("Aplikimi nuk u gjet.");
    if (ctx.roleCode !== ROLE_CODES.OWNER) throw new Error("Vetëm personi përgjegjës mund të parashtrojë aplikimin.");

    const allowed: ApplicationStatus[] = [ApplicationStatus.CERTIFICATION_COMPLETED, ApplicationStatus.PENDING_OWNER_SUBMISSION];
    if (!allowed.includes(application.status)) {
      throw new Error(`Parashtrimi nuk lejohet në statusin '${application.status}'.`);
    }

    if (application.data?.conformityResult === "NON_CONFORM") {
      throw new Error("Aplikimi me rezultat jo konform nuk mund të parashtrohet.");
    }

    const missing = ApplicationService.validateSubmissionReadiness(application, application.data);
    if (missing.length > 0) {
      throw new Error(`Aplikimi nuk është i plotë: ${missing.join("; ")}`);
    }

    if (application.data?.serialNumber) {
      await this.assertSerialUnique(application.data.serialNumber, applicationId);
    }

    const toStatus = assertTransition(application.type, application.status, "SUBMIT", ctx.roleCode);

    await db.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: applicationId },
        data: {
          status: toStatus,
          submittedAt: new Date(),
          returnReason: null,
          returnToRole: null,
          returnToRoles: Prisma.JsonNull,
          requiredCorrection: null,
        },
      });
      await tx.applicationWorkflowHistory.create({
        data: { applicationId, fromStatus: application.status, toStatus, action: "APPLICATION_SUBMITTED_TO_ISHMT", actorId: ctx.userId },
      });
      await AuditService.log(
        { actorId: ctx.userId, action: AuditAction.WORKFLOW_TRANSITION, entityType: "application", entityId: applicationId, afterState: { action: "APPLICATION_SUBMITTED_TO_ISHMT" } },
        tx,
      );
    });

    return ApplicationService.getById(ctx, applicationId);
  }

  static async listLicensedInstallers() {
    const now = new Date();
    return db.organization.findMany({
      where: {
        type: OrgType.INSTALLER,
        status: { in: ["ACTIVE", "ACTIVE_AUTHORIZED"] },
        deletedAt: null,
        licenses: { some: { status: "ACTIVE", expiryDate: { gte: now } } },
      },
      include: {
        municipality: true,
        licenses: { where: { status: "ACTIVE" }, orderBy: { expiryDate: "asc" } },
      },
      orderBy: { name: "asc" },
    });
  }

  static async listLicensedCertifiers() {
    const now = new Date();
    return db.organization.findMany({
      where: {
        type: OrgType.CERTIFIER,
        status: { in: ["ACTIVE", "ACTIVE_AUTHORIZED"] },
        deletedAt: null,
        licenses: { some: { status: "ACTIVE", expiryDate: { gte: now } } },
      },
      include: {
        municipality: true,
        licenses: { where: { status: "ACTIVE" }, orderBy: { expiryDate: "asc" } },
      },
      orderBy: { name: "asc" },
    });
  }

  private static async assertSerialUnique(serialNumber: string, applicationId: string) {
    await SerialValidationService.assertUnique(serialNumber, { excludeApplicationId: applicationId });
  }

  static getChecklist(application: {
    status: ApplicationStatus;
    installerOrgId: string | null;
    certifierOrgId: string | null;
    delegations?: { accessType: DelegationType; status: DelegationStatus }[];
  }, data: {
    buildingAddress?: string | null;
    serialNumber?: string | null;
    omiNumber?: string | null;
    conformityResult?: string | null;
  } | null) {
    const instAccepted = application.delegations?.some(
      (d) => d.accessType === DelegationType.INSTALLER && d.status === DelegationStatus.ACCEPTED,
    );
    const certAccepted = application.delegations?.some(
      (d) => d.accessType === DelegationType.CERTIFIER && d.status === DelegationStatus.ACCEPTED,
    );

    return [
      { key: "basic", label: "Të dhënat bazë janë plotësuar", ok: Boolean(data?.buildingAddress) },
      { key: "installer", label: "Kompania instaluese ka pranuar ftesën", ok: Boolean(instAccepted) },
      { key: "technical", label: "Të dhënat teknike janë plotësuar", ok: Boolean(data?.serialNumber) },
      { key: "certifier", label: "Kompania certifikuese ka pranuar ftesën", ok: Boolean(certAccepted) },
      { key: "certification", label: "Certifikimi është plotësuar", ok: Boolean(data?.omiNumber) },
      { key: "conformity", label: "Rezultati i konformitetit është i pranueshëm", ok: data?.conformityResult !== "NON_CONFORM" },
      { key: "installerOrg", label: "Instaluesi aktiv i licencuar", ok: Boolean(application.installerOrgId) },
      { key: "certifierOrg", label: "Certifikuesi aktiv i licencuar", ok: Boolean(application.certifierOrgId) },
    ];
  }

  static resumeAfterReturn(returnToRole: ReturnTargetRole): ApplicationStatus {
    return resolveReturnResumeStatus(returnToRole);
  }

  private static async assertActiveLicensedCompany(organizationId: string, type: OrgType) {
    if (type !== OrgType.CERTIFIER) {
      throw new Error("Verifikimi i licencës mbështetet vetëm për kompanitë OM.");
    }

    const org = await db.organization.findFirst({
      where: { ...activeCertifierOrgWhere(), id: organizationId },
    });
    if (!org) throw new Error("Kompania e zgjedhur nuk është aktive ose licenca OM ka skaduar.");
  }
}
