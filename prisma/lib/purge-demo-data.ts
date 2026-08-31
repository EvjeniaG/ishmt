import { OrgType, type PrismaClient } from "@prisma/client";
import { DEMO_LOGIN_CREDENTIALS } from "../../src/lib/demo/demo-login-credentials";
import { DEMO_OWNER_CONSTRUCTION } from "../../src/lib/demo/demo-seed-profiles";
import { DEMO_DUAL_LICENSE_CLAIM_POOL } from "../../src/lib/demo/demo-dual-license-claim-pool";
import { DEMO_INSTALL_CLAIM_POOL } from "../../src/lib/demo/demo-install-claim-pool";
import { DEMO_OM_CLAIM_POOL } from "../../src/lib/demo/demo-om-claim-pool";

function buildAllowedCredentialNids(): Set<string> {
  return new Set(
    DEMO_LOGIN_CREDENTIALS.filter((cred) => cred.kind !== "company").map((cred) =>
      cred.identifier.trim().toUpperCase(),
    ),
  );
}

function buildAllowedCredentialNipts(): Set<string> {
  const nipts = new Set(
    DEMO_LOGIN_CREDENTIALS.filter((cred) => cred.kind === "company").map((cred) =>
      cred.identifier.trim().toUpperCase(),
    ),
  );
  if (DEMO_OWNER_CONSTRUCTION.nipt) {
    nipts.add(DEMO_OWNER_CONSTRUCTION.nipt.trim().toUpperCase());
  }
  for (const pool of [DEMO_OM_CLAIM_POOL, DEMO_INSTALL_CLAIM_POOL, DEMO_DUAL_LICENSE_CLAIM_POOL]) {
    for (const profile of pool) {
      nipts.add(profile.nipt.trim().toUpperCase());
    }
  }
  return nipts;
}

/** Heq përdoruesit dhe organizatat legacy që nuk janë në tabelën e kredencialeve demo. */
export async function pruneNonCredentialDemoAccounts(prisma: PrismaClient) {
  const allowedNids = buildAllowedCredentialNids();
  const allowedNipts = buildAllowedCredentialNipts();
  const now = new Date();

  const users = await prisma.authUser.findMany({
    where: { deletedAt: null },
    include: {
      memberships: {
        where: { deactivatedAt: null },
        include: { organization: true },
      },
    },
  });

  let deletedUsers = 0;
  for (const user of users) {
    const keepByNid = Boolean(user.nid && allowedNids.has(user.nid.toUpperCase()));
    const keepByOrg = user.memberships.some((membership) => {
      const org = membership.organization;
      if (org.deletedAt) return false;
      if (org.type === OrgType.ISHMT || org.type === OrgType.DIRECTORATE) {
        return keepByNid;
      }
      return Boolean(org.nipt && allowedNipts.has(org.nipt.toUpperCase()));
    });

    if (keepByNid || keepByOrg) continue;

    await prisma.orgMembership.updateMany({
      where: { userId: user.id, deactivatedAt: null },
      data: { deactivatedAt: now },
    });
    await prisma.authUser.update({
      where: { id: user.id },
      data: { deletedAt: now, isActive: false },
    });
    deletedUsers += 1;
  }

  const orgs = await prisma.organization.findMany({
    where: { deletedAt: null },
    include: {
      memberships: {
        where: { deactivatedAt: null },
        include: { user: true },
      },
    },
  });

  let deletedOrgs = 0;
  for (const org of orgs) {
    if (org.type === OrgType.ISHMT || org.type === OrgType.DIRECTORATE) continue;
    if (org.nipt && allowedNipts.has(org.nipt.toUpperCase())) continue;

    if (org.type === OrgType.OWNER && !org.nipt) {
      const hasAllowedOwner = org.memberships.some(
        (membership) =>
          membership.user.deletedAt === null &&
          membership.user.nid &&
          allowedNids.has(membership.user.nid.toUpperCase()),
      );
      if (hasAllowedOwner) continue;
    }

    await prisma.orgMembership.updateMany({
      where: { organizationId: org.id, deactivatedAt: null },
      data: { deactivatedAt: now },
    });
    await prisma.organization.update({
      where: { id: org.id },
      data: { deletedAt: now },
    });
    deletedOrgs += 1;
  }

  await prisma.orgInvitation.deleteMany({
    where: { organization: { deletedAt: { not: null } } },
  });
  await prisma.qkbValidation.deleteMany({
    where: { organization: { deletedAt: { not: null } } },
  });

  return { deletedUsers, deletedOrgs };
}

async function deleteDocumentsForEntity(
  prisma: PrismaClient,
  entityType: string,
  entityIds: string[],
) {
  if (entityIds.length === 0) return 0;

  const documentLinks = await prisma.documentLink.findMany({
    where: { entityType, entityId: { in: entityIds } },
    select: { documentId: true },
  });
  const documentIds = [...new Set(documentLinks.map((link) => link.documentId))];
  if (documentIds.length === 0) return 0;

  await prisma.documentAccessLog.deleteMany({ where: { documentId: { in: documentIds } } });
  await prisma.documentLink.deleteMany({ where: { documentId: { in: documentIds } } });
  const deleted = await prisma.document.deleteMany({ where: { id: { in: documentIds } } });
  return deleted.count;
}

async function hardDeleteElevatorForDemo(prisma: PrismaClient, elevatorId: string) {
  await deleteDocumentsForEntity(prisma, "elevator", [elevatorId]);
  await deleteDocumentsForEntity(prisma, "qr_code", [
    ...(
      await prisma.qrCode.findMany({ where: { elevatorId }, select: { id: true } })
    ).map((row) => row.id),
  ]);

  const qrIds = (await prisma.qrCode.findMany({ where: { elevatorId }, select: { id: true } })).map(
    (row) => row.id,
  );
  if (qrIds.length > 0) {
    await prisma.qrScanLog.deleteMany({ where: { qrCodeId: { in: qrIds } } });
  }

  await prisma.scheduledReminder.deleteMany({ where: { elevatorId } });
  await prisma.incident.deleteMany({ where: { elevatorId } });
  await prisma.fieldInspectionAssignment.deleteMany({ where: { elevatorId } });
  await prisma.inspection.deleteMany({ where: { elevatorId } });
  await prisma.maintenanceRecord.deleteMany({ where: { elevatorId } });
  await prisma.maintenanceContract.deleteMany({ where: { elevatorId } });
  await prisma.maintenanceComplianceStatus.deleteMany({ where: { elevatorId } });
  await prisma.certificate.deleteMany({ where: { elevatorId } });
  await prisma.qrCode.deleteMany({ where: { elevatorId } });
  await prisma.elevatorComplianceStatus.deleteMany({ where: { elevatorId } });
  await prisma.elevatorTechnicalDataVersion.deleteMany({ where: { elevatorId } });
  await prisma.elevatorTechnicalData.deleteMany({ where: { elevatorId } });
  await prisma.elevatorResponsibleEntity.deleteMany({ where: { elevatorId } });
  await prisma.elevatorStatusHistory.deleteMany({ where: { elevatorId } });
  await prisma.elevatorOwnershipHistory.deleteMany({ where: { elevatorId } });
  await prisma.elevatorDelegationHistory.deleteMany({ where: { elevatorId } });

  const reportIds = (
    await prisma.citizenReport.findMany({ where: { elevatorId }, select: { id: true } })
  ).map((row) => row.id);
  if (reportIds.length > 0) {
    await prisma.citizenReportAction.deleteMany({ where: { reportId: { in: reportIds } } });
    await prisma.citizenReport.deleteMany({ where: { id: { in: reportIds } } });
  }

  await prisma.application.updateMany({ where: { elevatorId }, data: { elevatorId: null } });
  await prisma.elevator.delete({ where: { id: elevatorId } });
}

async function findDemoElevatorIds(prisma: PrismaClient, applicationIds: string[]) {
  const linkedElevators =
    applicationIds.length > 0
      ? await prisma.elevator.findMany({
          where: {
            OR: [
              { applicationId: { in: applicationIds } },
              { targetApplications: { some: { id: { in: applicationIds } } } },
            ],
          },
          select: { id: true },
        })
      : [];

  const demoElevators = await prisma.elevator.findMany({
    where: {
      OR: [
        { registryNumber: { startsWith: "DEMO-" } },
        { registryNumber: { startsWith: "000" } },
        { technicalData: { serialNumber: { startsWith: "DEMO" } } },
        { technicalData: { serialNumber: { startsWith: "SP-DEMO" } } },
      ],
    },
    select: { id: true },
  });

  return [...new Set([...linkedElevators.map((row) => row.id), ...demoElevators.map((row) => row.id)])];
}

/** Fshin aplikimet demo (jo MIG-*) dhe ashensorët e lidhur - mbaj përdoruesit dhe organizatat. */
export async function resetDemoApplications(prisma: PrismaClient) {
  const applications = await prisma.application.findMany({
    where: { NOT: { applicationNumber: { startsWith: "MIG-" } } },
    select: { id: true },
  });
  const applicationIds = applications.map((row) => row.id);
  const elevatorIds = await findDemoElevatorIds(prisma, applicationIds);

  for (const elevatorId of elevatorIds) {
    await hardDeleteElevatorForDemo(prisma, elevatorId);
  }

  if (applicationIds.length > 0) {
    await prisma.fieldInspectionAssignment.deleteMany({
      where: { applicationId: { in: applicationIds } },
    });
    await prisma.applicationParticipation.deleteMany({
      where: { applicationId: { in: applicationIds } },
    });
    await prisma.applicationInternalNote.deleteMany({
      where: { applicationId: { in: applicationIds } },
    });
    await prisma.applicationFieldReviewAssignment.deleteMany({
      where: { applicationId: { in: applicationIds } },
    });
    await prisma.applicationWorkflowHistory.deleteMany({
      where: { applicationId: { in: applicationIds } },
    });
    await prisma.applicationDelegation.deleteMany({
      where: { applicationId: { in: applicationIds } },
    });
    await deleteDocumentsForEntity(prisma, "application", applicationIds);
    await prisma.applicationData.deleteMany({
      where: { applicationId: { in: applicationIds } },
    });
    await prisma.application.deleteMany({
      where: { id: { in: applicationIds } },
    });
  }

  await prisma.citizenReportAction.deleteMany({
    where: { report: { NOT: { reportNumber: { startsWith: "MIG-" } } } },
  });
  await prisma.citizenReport.deleteMany({
    where: { NOT: { reportNumber: { startsWith: "MIG-" } } },
  });

  const year = new Date().getFullYear();
  await prisma.applicationSequence.updateMany({
    where: { year, typeCode: "REG" },
    data: { lastSequence: 0 },
  });

  return {
    deletedApplications: applicationIds.length,
    deletedElevators: elevatorIds.length,
  };
}

export type PurgeDemoDataResult = Awaited<ReturnType<typeof purgeDemoData>>;

/** Pastron të gjitha të dhënat demo/transaksionale; mbaj vetëm kredencialet demo. */
export async function purgeDemoData(
  prisma: PrismaClient,
  options?: { keepAllUsers?: boolean },
) {
  await prisma.maintenanceContract.deleteMany({});
  await prisma.maintenanceRecord.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.fieldInspectionAssignment.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.orgInvitation.deleteMany({});

  const reset = await resetDemoApplications(prisma);
  const pruned = options?.keepAllUsers
    ? { deletedUsers: 0, deletedOrgs: 0 }
    : await pruneNonCredentialDemoAccounts(prisma);

  const [notifications, auditLogs, reminders, jobRuns] = await Promise.all([
    prisma.notification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.scheduledReminder.deleteMany(),
    prisma.sysJobRun.deleteMany(),
  ]);

  const year = new Date().getFullYear();
  await Promise.all([
    prisma.registrySequence.updateMany({
      where: { year },
      data: { lastSequence: 0 },
    }),
    prisma.certificateSequence.updateMany({
      where: { year },
      data: { lastSequence: 0 },
    }),
  ]);

  return {
    ...reset,
    ...pruned,
    deletedNotifications: notifications.count,
    deletedAuditLogs: auditLogs.count,
    deletedScheduledReminders: reminders.count,
    deletedJobRuns: jobRuns.count,
  };
}
