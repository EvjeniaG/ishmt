/**
 * Aplikim regjistrimi demo i plotë — gati për miratim nga kryeinspektori.
 * Idempotent: rivendos APP-{year}-DEMO-CHIEF çdo herë.
 */
export async function seedChiefApprovalDemo(prisma: import("@prisma/client").PrismaClient) {
  const { ApplicationStatus, ApplicationType } = await import("@prisma/client");
  const { ApplicationService } = await import("../../src/lib/services/application-service");
  const { RegistrationService } = await import("../../src/lib/services/registration-service");
  const { RegistrationDemoService } = await import("../../src/lib/demo/registration-demo-service");
  const { ROLE_PERMISSION_MATRIX } = await import("../../src/lib/permissions/matrix");
  const year = new Date().getFullYear();
  const applicationNumber = `APP-${year}-DEMO-CHIEF`;

  async function ctxForEmail(email: string) {
    const user = await prisma.authUser.findFirst({ where: { email } });
    if (!user) throw new Error(`Përdoruesi demo '${email}' nuk u gjet.`);

    const membership = await prisma.orgMembership.findFirst({
      where: { userId: user.id, deactivatedAt: null },
      include: { organization: true, role: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) throw new Error(`Anëtarësia mungon për '${email}'.`);

    const roleCode = membership.role.code as import("../../src/lib/constants/roles").RoleCode;

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

  const existing = await prisma.application.findFirst({
    where: { applicationNumber, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    await prisma.applicationParticipation.deleteMany({ where: { applicationId: existing.id } });
    await prisma.applicationInternalNote.deleteMany({ where: { applicationId: existing.id } });
    await prisma.applicationFieldReviewAssignment.deleteMany({ where: { applicationId: existing.id } });
    await prisma.applicationWorkflowHistory.deleteMany({ where: { applicationId: existing.id } });
    await prisma.applicationDelegation.deleteMany({ where: { applicationId: existing.id } });
    await prisma.applicationData.deleteMany({ where: { applicationId: existing.id } });
    await prisma.application.delete({ where: { id: existing.id } });
  }

  const ownerCtx = await ctxForEmail("personi përgjegjës i ashensorit@example.al");
  const installerCtx = await ctxForEmail("installer@ashensorepro.al");
  const certifierCtx = await ctxForEmail("cert@inspektomi.al");
  const chiefCtx = await ctxForEmail("kryeinspektor@ishmt.gov.al");
  const directorCtx = await ctxForEmail("drejtori@ishmt.gov.al");
  const sectorCtx = await ctxForEmail("shef@ishmt.gov.al");
  const fieldCtx1 = await ctxForEmail("terren@ishmt.gov.al");
  const fieldCtx2 = await ctxForEmail("terren2@ishmt.gov.al");

  const application = await prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        applicationNumber,
        type: ApplicationType.NEW_REGISTRATION,
        status: ApplicationStatus.DRAFT,
        ownerOrgId: ownerCtx.activeOrgId,
        createdById: ownerCtx.userId,
      },
    });
    await tx.applicationData.create({ data: { applicationId: app.id, applicationDate: new Date() } });
    return app;
  });

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
  await RegistrationDemoService.fillStepFields(installerCtx, applicationId, "installer-technical");
  await ApplicationService.completeInstallerStep(installerCtx, applicationId, {
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
  });

  await ApplicationService.assignCertifier(ownerCtx, applicationId, certifierCtx.activeOrgId);
  await RegistrationService.acceptCertifierDelegation(certifierCtx, applicationId);
  await RegistrationDemoService.fillStepFields(certifierCtx, applicationId, "certifier-certification");
  await ApplicationService.completeCertifierStep(certifierCtx, applicationId, {
    installationCertificateNumber: `DEMO-CERT-${year}`,
    installationCertificateDate: new Date("2018-07-15"),
    certifierNotes: "Ashensor ekzistues - raport demo OMI.",
    omiNumber: "OMI-DEMO-001",
    examinationType: "EKZAMINIM_I_PLOTE",
    examinationDate: new Date("2019-03-10"),
    conformityResult: "CONFORM",
    certificateReference: `REF-DEMO-${year}`,
    certifierTechnicalNotes: "Demo gati për miratim nga kryeinspektori.",
  });

  await RegistrationDemoService.fillStepFields(ownerCtx, applicationId, "owner-pre-submit");
  await ApplicationService.submitRegistrationToIshmt(ownerCtx, applicationId);

  const inspectorIds = [fieldCtx1.userId, fieldCtx2.userId];

  await ApplicationService.delegateToDirector(chiefCtx, applicationId, {
    noteText: "Demo: delegim te drejtori — 2 inspektorë për shqyrtim.",
    inspectorIds,
  });
  await ApplicationService.delegateToSectorHead(directorCtx, applicationId, {
    noteText: "Demo: delegim te përgjegjësi i sektorit.",
  });
  await ApplicationService.assignFieldInspectors(sectorCtx, applicationId, {
    inspectorIds,
    noteText: "Demo: delegim te inspektorët.",
  });

  const assignments = await prisma.applicationFieldReviewAssignment.findMany({
    where: { applicationId, inspectorId: { in: inspectorIds } },
  });

  for (const assignment of assignments) {
    const fieldCtx = assignment.inspectorId === fieldCtx1.userId ? fieldCtx1 : fieldCtx2;
    await ApplicationService.submitFieldReport(
      fieldCtx,
      assignment.id,
      `Demo: raport inspektori ${fieldCtx.lastName} — dosja në rregull.`,
      { submit: true },
    );
  }

  await ApplicationService.forwardToDirectorFromSectorHead(
    sectorCtx,
    applicationId,
    "Demo: raport përgjegjësi — rekomandohet vazhdimi.",
  );
  await ApplicationService.forwardToChiefFromDirector(
    directorCtx,
    applicationId,
    "Demo: raport drejtor — dërgohet për vendim final.",
  );

  const finalApp = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, applicationNumber: true, status: true },
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

export function chiefApprovalDemoApplicationNumber(year = new Date().getFullYear()) {
  return `APP-${year}-DEMO-CHIEF`;
}
