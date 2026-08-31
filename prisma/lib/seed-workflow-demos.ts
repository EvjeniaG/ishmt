import type { PrismaClient } from "@prisma/client";
import { DEMO_OWNER_NID } from "./demo-owner";
import { resetDemoApplications } from "./reset-demo-applications";

type DemoCtx = Awaited<ReturnType<typeof ctxForEmail>>;

async function ctxForEmail(prisma: PrismaClient, email: string) {
  const { ROLE_PERMISSION_MATRIX } = await import("../../src/lib/permissions/matrix");
  const user = await prisma.authUser.findFirst({ where: { email, deletedAt: null } });
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

async function ctxForNid(prisma: PrismaClient, nid: string) {
  const user = await prisma.authUser.findFirst({ where: { nid, deletedAt: null } });
  if (!user?.email) throw new Error(`Përdoruesi me NID '${nid}' nuk u gjet.`);
  return ctxForEmail(prisma, user.email);
}

async function buildRegistrationApplication(
  prisma: PrismaClient,
  applicationNumber: string,
  contexts: {
    owner: DemoCtx;
    installer: DemoCtx;
    certifier: DemoCtx;
  },
) {
  const { ApplicationStatus, ApplicationType } = await import("@prisma/client");
  const { ApplicationService } = await import("../../src/lib/services/application-service");
  const { RegistrationService } = await import("../../src/lib/services/registration-service");
  const { RegistrationDemoService } = await import("../../src/lib/demo/registration-demo-service");

  const application = await prisma.$transaction(async (tx) => {
    const app = await tx.application.create({
      data: {
        applicationNumber,
        type: ApplicationType.NEW_REGISTRATION,
        status: ApplicationStatus.DRAFT,
        ownerOrgId: contexts.owner.activeOrgId,
        createdById: contexts.owner.userId,
      },
    });
    await tx.applicationData.create({ data: { applicationId: app.id, applicationDate: new Date() } });
    return app;
  });

  const applicationId = application.id;
  const serialSuffix = applicationNumber.replace(/[^A-Z0-9]/g, "").slice(-4);

  await RegistrationDemoService.fillStepFields(contexts.owner, applicationId, "owner-basic-data");
  const basicData = await prisma.applicationData.findUniqueOrThrow({ where: { applicationId } });
  await ApplicationService.updateBasicData(contexts.owner, applicationId, {
    buildingAddress: basicData.buildingAddress ?? "Rruga e Dibrës Nr. 15, Tiranë",
    municipalityId: basicData.municipalityId ?? "",
    buildingName: basicData.buildingName ?? "Godina Demo IQMT",
    entrance: basicData.entrance ?? "A",
    floorLocation: basicData.floorLocation ?? "Kati 0",
    buildingType: basicData.buildingType ?? "CO_OWNERSHIP_BUILDING",
    usagePurpose: basicData.usagePurpose ?? "ELECTRIC_PASSENGER",
    responsibleEntityName: basicData.responsibleEntityName ?? "Shoqëria Demo Sh.p.k.",
    responsibleEntityIdentifier: basicData.responsibleEntityIdentifier ?? "L12345678A",
    responsibleEntityEmail: basicData.responsibleEntityEmail ?? contexts.owner.email,
    responsibleEntityPhone: basicData.responsibleEntityPhone ?? "+355692000001",
    notes: "Të dhëna demo - workflow i ri IQMT.",
  });

  await ApplicationService.assignInstaller(contexts.owner, applicationId, contexts.installer.activeOrgId);
  await RegistrationService.acceptInstallerDelegation(contexts.installer, applicationId);

  await RegistrationDemoService.fillStepFields(contexts.installer, applicationId, "installer-technical");
  await ApplicationService.completeInstallerStep(contexts.installer, applicationId, {
    elevatorType: "PASSENGER",
    manufacturer: "KONE",
    model: "MonoSpace 500",
    serialNumber: `DEMO-${new Date().getFullYear()}-${serialSuffix}`,
    manufacturingYear: 2018,
    capacityKg: 630,
    capacityPersons: 8,
    speedMs: 1,
    floorsServed: 6,
    stops: 6,
    driveType: "ELECTRIC",
  });

  await ApplicationService.assignCertifier(contexts.owner, applicationId, contexts.certifier.activeOrgId);
  await RegistrationService.acceptCertifierDelegation(contexts.certifier, applicationId);
  await ApplicationService.approveInstallerTechnicalReview(contexts.certifier, applicationId);
  await RegistrationDemoService.fillStepFields(contexts.certifier, applicationId, "certifier-certification");
  await ApplicationService.completeCertifierStep(contexts.certifier, applicationId, {
    installationCertificateNumber: `DEMO-CERT-${serialSuffix}`,
    installationCertificateDate: new Date("2018-07-15"),
    certifierNotes: "Certifikim demo OMI.",
    omiNumber: "OMI-DEMO-001",
    examinationType: "EKZAMINIM_I_PLOTE",
    examinationDate: new Date("2019-03-10"),
    conformityResult: "CONFORM",
    certificateReference: `REF-DEMO-${serialSuffix}`,
    certifierTechnicalNotes: "Gati për parashtrim te IQMT.",
  });

  await RegistrationDemoService.fillStepFields(contexts.owner, applicationId, "owner-pre-submit");

  return { applicationId, applicationNumber };
}

export type WorkflowDemoScenario = {
  applicationNumber: string;
  status: string;
  description: string;
  reviewUrl: string;
};

/** Skenarë demo të pastër - një aplikim për çdo fazë kryesore të workflow-it. */
export async function seedWorkflowDemos(prisma: PrismaClient): Promise<WorkflowDemoScenario[]> {
  const reset = await resetDemoApplications(prisma);
  console.log(
    `✓ U fshinë ${reset.deletedApplications} aplikime dhe ${reset.deletedElevators} ashensorë demo`,
  );

  const year = new Date().getFullYear();
  const owner = await ctxForNid(prisma, DEMO_OWNER_NID);
  const installer = await ctxForEmail(prisma, "installer@example.al");
  const certifier = await ctxForEmail(prisma, "certifier@example.al");
  const chief = await ctxForEmail(prisma, "kryeinspektor@ishmt.gov.al");
  const director = await ctxForEmail(prisma, "drejtori@ishmt.gov.al");
  const sectorHead = await ctxForEmail(prisma, "shef@ishmt.gov.al");
  const inspector1 = await ctxForEmail(prisma, "terren@ishmt.gov.al");
  const inspector2 = await ctxForEmail(prisma, "terren2@ishmt.gov.al");

  const { ApplicationService } = await import("../../src/lib/services/application-service");
  const contexts = { owner, installer, certifier };
  const scenarios: WorkflowDemoScenario[] = [];

  const ready = await buildRegistrationApplication(prisma, `APP-${year}-DEMO-01`, contexts);
  scenarios.push({
    applicationNumber: ready.applicationNumber,
    status: "Gati për parashtrim",
    description: "Personi përgjegjës - rishikoni dhe parashtroni te IQMT",
    reviewUrl: `/portal/applications/${ready.applicationId}`,
  });

  const chiefQueue = await buildRegistrationApplication(prisma, `APP-${year}-DEMO-02`, contexts);
  await ApplicationService.submitRegistrationToIshmt(owner, chiefQueue.applicationId);
  scenarios.push({
    applicationNumber: chiefQueue.applicationNumber,
    status: "SUBMITTED",
    description: "Kryeinspektori - delegoni te drejtori (shihni ngarkesën e inspektorëve)",
    reviewUrl: `/ishmt/review/${chiefQueue.applicationId}`,
  });

  const directorQueue = await buildRegistrationApplication(prisma, `APP-${year}-DEMO-03`, contexts);
  await ApplicationService.submitRegistrationToIshmt(owner, directorQueue.applicationId);
  await ApplicationService.delegateToDirector(chief, directorQueue.applicationId, {
    noteText: "Demo: 1 inspektor + verifikim në terren.",
    inspectorIds: [inspector1.userId],
    requiresFieldVerification: true,
  });
  scenarios.push({
    applicationNumber: directorQueue.applicationNumber,
    status: "PENDING_DIRECTOR",
    description: "Drejtor i Drejtorisë - delegoni te përgjegjësi",
    reviewUrl: `/ishmt/review/${directorQueue.applicationId}`,
  });

  const sectorQueue = await buildRegistrationApplication(prisma, `APP-${year}-DEMO-04`, contexts);
  await ApplicationService.submitRegistrationToIshmt(owner, sectorQueue.applicationId);
  await ApplicationService.delegateToDirector(chief, sectorQueue.applicationId, {
    noteText: "Demo: delegim te drejtori.",
    inspectorIds: [inspector1.userId, inspector2.userId],
  });
  await ApplicationService.delegateToSectorHead(director, sectorQueue.applicationId, {
    noteText: "Demo: delegim te përgjegjësi i sektorit.",
  });
  scenarios.push({
    applicationNumber: sectorQueue.applicationNumber,
    status: "PENDING_SECTOR_HEAD",
    description: "Përgjegjësi i sektorit - caktoni inspektorët",
    reviewUrl: `/ishmt/review/${sectorQueue.applicationId}`,
  });

  const fieldReviewQueue = await buildRegistrationApplication(prisma, `APP-${year}-DEMO-05`, contexts);
  await ApplicationService.submitRegistrationToIshmt(owner, fieldReviewQueue.applicationId);
  await ApplicationService.delegateToDirector(chief, fieldReviewQueue.applicationId, {
    noteText: "Demo: 2 inspektorë + verifikim në terren.",
    inspectorIds: [inspector1.userId, inspector2.userId],
    requiresFieldVerification: true,
  });
  await ApplicationService.delegateToSectorHead(director, fieldReviewQueue.applicationId, {
    noteText: "Demo: delegim te përgjegjësi.",
  });
  await ApplicationService.assignFieldInspectors(sectorHead, fieldReviewQueue.applicationId, {
    inspectorIds: [inspector1.userId, inspector2.userId],
    noteText: "Demo: caktim inspektorësh - shqyrtim dosje + terren.",
  });
  scenarios.push({
    applicationNumber: fieldReviewQueue.applicationNumber,
    status: "PENDING_FIELD_REVIEW",
    description: "Inspektorët - shqyrtoni dosjen; inspektori i parë ka detyrë terreni",
    reviewUrl: `/ishmt/review/${fieldReviewQueue.applicationId}`,
  });

  const sectorReportQueue = await buildRegistrationApplication(prisma, `APP-${year}-DEMO-06`, contexts);
  await ApplicationService.submitRegistrationToIshmt(owner, sectorReportQueue.applicationId);
  await ApplicationService.delegateToDirector(chief, sectorReportQueue.applicationId, {
    inspectorIds: [inspector1.userId],
  });
  await ApplicationService.delegateToSectorHead(director, sectorReportQueue.applicationId, {});
  await ApplicationService.assignFieldInspectors(sectorHead, sectorReportQueue.applicationId, {
    inspectorIds: [inspector1.userId],
  });
  const sectorReportAssignment = await prisma.applicationFieldReviewAssignment.findFirstOrThrow({
    where: { applicationId: sectorReportQueue.applicationId, inspectorId: inspector1.userId },
  });
  await ApplicationService.submitFieldReport(
    inspector1,
    sectorReportAssignment.id,
    "Demo: dosja e plotë - rekomandohet vazhdimi.",
    { submit: true },
  );
  scenarios.push({
    applicationNumber: sectorReportQueue.applicationNumber,
    status: "PENDING_SECTOR_HEAD_REPORT",
    description: "Përgjegjësi - dërgoni raportin te drejtori",
    reviewUrl: `/ishmt/review/${sectorReportQueue.applicationId}`,
  });

  const directorReportQueue = await buildRegistrationApplication(prisma, `APP-${year}-DEMO-07`, contexts);
  await ApplicationService.submitRegistrationToIshmt(owner, directorReportQueue.applicationId);
  await ApplicationService.delegateToDirector(chief, directorReportQueue.applicationId, {
    inspectorIds: [inspector1.userId],
  });
  await ApplicationService.delegateToSectorHead(director, directorReportQueue.applicationId, {});
  await ApplicationService.assignFieldInspectors(sectorHead, directorReportQueue.applicationId, {
    inspectorIds: [inspector1.userId],
  });
  const directorReportAssignment = await prisma.applicationFieldReviewAssignment.findFirstOrThrow({
    where: { applicationId: directorReportQueue.applicationId, inspectorId: inspector1.userId },
  });
  await ApplicationService.submitFieldReport(
    inspector1,
    directorReportAssignment.id,
    "Demo: raport inspektori - dosja konforme.",
    { submit: true },
  );
  await ApplicationService.forwardToDirectorFromSectorHead(
    sectorHead,
    directorReportQueue.applicationId,
    "Demo: raport përgjegjësi - rekomandohet miratimi.",
  );
  scenarios.push({
    applicationNumber: directorReportQueue.applicationNumber,
    status: "PENDING_DIRECTOR_REPORT",
    description: "Drejtor - dërgoni raportin te kryeinspektori",
    reviewUrl: `/ishmt/review/${directorReportQueue.applicationId}`,
  });

  const chiefDecisionQueue = await buildRegistrationApplication(prisma, `APP-${year}-DEMO-08`, contexts);
  await ApplicationService.submitRegistrationToIshmt(owner, chiefDecisionQueue.applicationId);
  await ApplicationService.delegateToDirector(chief, chiefDecisionQueue.applicationId, {
    noteText: "Demo: zinxhir i plotë - gati për vendim final.",
    inspectorIds: [inspector1.userId, inspector2.userId],
    requiresFieldVerification: true,
  });
  await ApplicationService.delegateToSectorHead(director, chiefDecisionQueue.applicationId, {});
  await ApplicationService.assignFieldInspectors(sectorHead, chiefDecisionQueue.applicationId, {
    inspectorIds: [inspector1.userId, inspector2.userId],
  });
  const chiefDecisionAssignments = await prisma.applicationFieldReviewAssignment.findMany({
    where: { applicationId: chiefDecisionQueue.applicationId },
  });
  for (const assignment of chiefDecisionAssignments) {
    const fieldCtx = assignment.inspectorId === inspector1.userId ? inspector1 : inspector2;
    await ApplicationService.submitFieldReport(
      fieldCtx,
      assignment.id,
      `Demo: raport ${fieldCtx.lastName} - dosja në rregull.`,
      { submit: true },
    );
  }
  await ApplicationService.forwardToDirectorFromSectorHead(
    sectorHead,
    chiefDecisionQueue.applicationId,
    "Demo: rekomandohet miratimi.",
  );
  await ApplicationService.forwardToChiefFromDirector(
    director,
    chiefDecisionQueue.applicationId,
    "Demo: dërgohet për vendim final.",
  );
  scenarios.push({
    applicationNumber: chiefDecisionQueue.applicationNumber,
    status: "PENDING_CHIEF_INSPECTOR",
    description: "Kryeinspektori - miratim / refuzim / kthim (verifikimi terreni ende në pritje)",
    reviewUrl: `/ishmt/review/${chiefDecisionQueue.applicationId}`,
  });

  console.log("\nSkenarë demo workflow:");
  console.log("  Fjalëkalimi për të gjithë: Ishmt2026\n");
  for (const s of scenarios) {
    console.log(`  • ${s.applicationNumber} - ${s.status}`);
    console.log(`    ${s.description}`);
    console.log(`    ${s.reviewUrl}`);
  }

  console.log("\n  Llogaritë demo:");
  console.log("    Pronari: NID I90404004D (portal)");
  console.log("    Kryeinspektori: kryeinspektor@ishmt.gov.al");
  console.log("    Drejtori: drejtori@ishmt.gov.al");
  console.log("    Përgjegjësi: shef@ishmt.gov.al");
  console.log("    Inspektorët: terren@ishmt.gov.al, terren2@ishmt.gov.al");

  return scenarios;
}
