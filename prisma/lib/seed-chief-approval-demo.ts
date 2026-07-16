import {
  ApplicationStatus,
  ApplicationType,
  PrismaClient,
} from "@prisma/client";
import { ApplicationService } from "../../src/lib/services/application-service";
import { RegistrationService } from "../../src/lib/services/registration-service";
import { RegistrationDemoService } from "../../src/lib/demo/registration-demo-service";
import { ROLE_PERMISSION_MATRIX } from "../../src/lib/permissions/matrix";
import type { RoleCode } from "../../src/lib/constants/roles";
import type { AuthContext } from "../../src/lib/permissions/guards";

const DEMO_APPLICATION_SUFFIX = "DEMO-CHIEF";

export function chiefApprovalDemoApplicationNumber(year = new Date().getFullYear()) {
  return `APP-${year}-${DEMO_APPLICATION_SUFFIX}`;
}

async function ctxForEmail(prisma: PrismaClient, email: string): Promise<AuthContext> {
  const user = await prisma.authUser.findFirst({ where: { email } });
  if (!user) throw new Error(`Përdoruesi demo '${email}' nuk u gjet.`);

  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.id, deactivatedAt: null },
    include: { organization: true, role: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) throw new Error(`Anëtarësia mungon për '${email}'.`);

  const roleCode = membership.role.code as RoleCode;

  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    activeOrgId: membership.organizationId,
    activeOrgType: membership.organization.type,
    activeOrgName: membership.organization.name,
    roleCode,
    permissions: ROLE_PERMISSION_MATRIX[roleCode] ?? [],
  };
}

async function deleteApplicationCascade(prisma: PrismaClient, applicationId: string) {
  const links = await prisma.documentLink.findMany({
    where: { entityType: "application", entityId: applicationId },
    select: { documentId: true },
  });

  await prisma.documentLink.deleteMany({
    where: { entityType: "application", entityId: applicationId },
  });

  const documentIds = [...new Set(links.map((link) => link.documentId))];
  if (documentIds.length > 0) {
    await prisma.documentAccessLog.deleteMany({ where: { documentId: { in: documentIds } } });
    await prisma.document.deleteMany({ where: { id: { in: documentIds } } });
  }

  await prisma.applicationWorkflowHistory.deleteMany({ where: { applicationId } });
  await prisma.applicationDelegation.deleteMany({ where: { applicationId } });
  await prisma.applicationData.deleteMany({ where: { applicationId } });
  await prisma.application.delete({ where: { id: applicationId } });
}

async function createDraftApplication(
  prisma: PrismaClient,
  applicationNumber: string,
  ownerCtx: AuthContext,
) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        applicationNumber,
        type: ApplicationType.NEW_REGISTRATION,
        status: ApplicationStatus.DRAFT,
        ownerOrgId: ownerCtx.activeOrgId,
        createdById: ownerCtx.userId,
      },
    });

    await tx.applicationData.create({
      data: {
        applicationId: application.id,
        applicationDate: new Date(),
      },
    });

    await tx.applicationWorkflowHistory.create({
      data: {
        applicationId: application.id,
        fromStatus: null,
        toStatus: ApplicationStatus.DRAFT,
        action: "CREATE",
        actorId: ownerCtx.userId,
      },
    });

    return application;
  });
}

/**
 * Aplikim regjistrimi demo i plotë — gati për miratim nga kryeinspektori.
 * Idempotent: rivendos APP-{year}-DEMO-CHIEF çdo herë.
 */
export async function seedChiefApprovalDemo(prisma: PrismaClient) {
  const year = new Date().getFullYear();
  const applicationNumber = chiefApprovalDemoApplicationNumber(year);

  const existing = await prisma.application.findFirst({
    where: { applicationNumber, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    await deleteApplicationCascade(prisma, existing.id);
  }

  const ownerCtx = await ctxForEmail(prisma, "personi përgjegjës i ashensorit@example.al");
  const installerCtx = await ctxForEmail(prisma, "installer@ashensorepro.al");
  const certifierCtx = await ctxForEmail(prisma, "cert@inspektomi.al");
  const reviewerCtx = await ctxForEmail(prisma, "specialist@ishmt.gov.al");

  const application = await createDraftApplication(prisma, applicationNumber, ownerCtx);
  const applicationId = application.id;

  await RegistrationDemoService.fillStepFields(ownerCtx, applicationId, "owner-basic-data");

  const basicData = await prisma.applicationData.findUniqueOrThrow({ where: { applicationId } });
  await ApplicationService.updateBasicData(ownerCtx, applicationId, {
    buildingAddress: basicData.buildingAddress ?? "",
    municipalityId: basicData.municipalityId ?? "",
    buildingName: basicData.buildingName ?? undefined,
    entrance: basicData.entrance ?? undefined,
    floorLocation: basicData.floorLocation ?? undefined,
    buildingType: basicData.buildingType ?? "CO_OWNERSHIP_BUILDING",
    usagePurpose: basicData.usagePurpose ?? "ELECTRIC_PASSENGER",
    responsibleEntityName: basicData.responsibleEntityName ?? "",
    responsibleEntityIdentifier: basicData.responsibleEntityIdentifier ?? "",
    responsibleEntityEmail: basicData.responsibleEntityEmail ?? "",
    responsibleEntityPhone: basicData.responsibleEntityPhone ?? "",
    notes: basicData.notes ?? undefined,
  });

  await ApplicationService.assignInstaller(ownerCtx, applicationId, installerCtx.activeOrgId);
  await RegistrationService.acceptInstallerDelegation(installerCtx, applicationId);

  const serialNumber = `DEMO-CHIEF-${year}-${Date.now().toString(36).toUpperCase()}`;
  const technicalData = {
    elevatorType: "PASSENGER",
    manufacturer: "KONE",
    model: "MonoSpace 500",
    serialNumber,
    manufacturingYear: 2018,
    capacityKg: 630,
    capacityPersons: 8,
    speedMs: 1,
    floorsServed: 6,
    stops: 6,
    driveType: "ELECTRIC",
  };

  await RegistrationDemoService.fillStepFields(installerCtx, applicationId, "installer-technical");
  await ApplicationService.completeInstallerStep(installerCtx, applicationId, {
    ...technicalData,
    serialNumber,
  });

  await ApplicationService.assignCertifier(ownerCtx, applicationId, certifierCtx.activeOrgId);
  await RegistrationService.acceptCertifierDelegation(certifierCtx, applicationId);

  const certDate = new Date("2018-07-15");
  const examDate = new Date("2019-03-10");
  const certificationData = {
    installationCertificateNumber: `DEMO-CERT-${year}`,
    installationCertificateDate: certDate,
    certifierNotes: "Ashensor ekzistues - raport demo OMI.",
    omiNumber: "OMI-DEMO-001",
    examinationType: "EKZAMINIM_I_PLOTE",
    examinationDate: examDate,
    conformityResult: "CONFORM" as const,
    certificateReference: `REF-DEMO-${year}`,
    certifierTechnicalNotes: "Demo gati për miratim nga kryeinspektori.",
  };

  await RegistrationDemoService.fillStepFields(certifierCtx, applicationId, "certifier-certification");
  await ApplicationService.completeCertifierStep(certifierCtx, applicationId, certificationData);

  await RegistrationDemoService.fillStepFields(ownerCtx, applicationId, "owner-pre-submit");
  await ApplicationService.submitRegistrationToIshmt(ownerCtx, applicationId);
  await ApplicationService.pickupForReview(reviewerCtx, applicationId);
  await ApplicationService.forwardToAdmin(reviewerCtx, applicationId, {
    comment: "Demo: dosja e plotë — rekomandohet miratimi nga kryeinspektori.",
  });

  const finalApp = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicationNumber: true,
      status: true,
      assignedInspectorId: true,
    },
  });

  if (finalApp?.status !== ApplicationStatus.PENDING_CHIEF_INSPECTOR) {
    throw new Error(`Demo aplikimi nuk arriti statusin e pritur: ${finalApp?.status}`);
  }

  return {
    applicationId: finalApp.id,
    applicationNumber: finalApp.applicationNumber,
    reviewUrl: `/ishmt/review/${finalApp.id}`,
    serialNumber,
  };
}
