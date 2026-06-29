import { AuditAction, JobRunStatus, OrgStatus, OrgType } from "@prisma/client";
import { db } from "@/lib/db";
import { AuditService } from "@/lib/audit/audit-service";

export const LICENSE_EXPIRY_JOB_TYPE = "LICENSE_EXPIRY_SUSPENSION";

export type LicenseExpiryJobResult = {
  organizationsSuspended: number;
  licensesExpired: number;
  organizationIds: string[];
};

export async function runLicenseExpirySuspensionJob(): Promise<LicenseExpiryJobResult> {
  const now = new Date();

  const expiredLicenses = await db.organizationLicense.findMany({
    where: {
      status: OrgStatus.ACTIVE,
      expiryDate: { lt: now },
      organization: {
        type: { in: [OrgType.INSTALLER, OrgType.CERTIFIER] },
        status: OrgStatus.ACTIVE,
        deletedAt: null,
      },
    },
    include: { organization: true },
  });

  const orgIds = [...new Set(expiredLicenses.map((l) => l.organizationId))];
  let suspendedCount = 0;

  if (orgIds.length > 0) {
    await db.$transaction(async (tx) => {
      await tx.organizationLicense.updateMany({
        where: { id: { in: expiredLicenses.map((l) => l.id) } },
        data: { status: OrgStatus.REVOKED },
      });

      for (const orgId of orgIds) {
        const org = await tx.organization.update({
          where: { id: orgId },
          data: { status: OrgStatus.SUSPENDED },
        });

        await AuditService.log(
          {
            actorId: null,
            action: AuditAction.STATUS_CHANGE,
            entityType: "organization",
            entityId: orgId,
            metadata: { reason: "LICENSE_EXPIRED", jobType: LICENSE_EXPIRY_JOB_TYPE },
            afterState: org,
          },
          tx,
        );

        suspendedCount++;
      }
    });
  }

  return {
    organizationsSuspended: suspendedCount,
    licensesExpired: expiredLicenses.length,
    organizationIds: orgIds,
  };
}

export async function executeLicenseExpiryJobWithLogging() {
  const run = await db.sysJobRun.create({
    data: {
      jobType: LICENSE_EXPIRY_JOB_TYPE,
      status: JobRunStatus.STARTED,
    },
  });

  try {
    const result = await runLicenseExpirySuspensionJob();

    await db.sysJobRun.update({
      where: { id: run.id },
      data: {
        status: JobRunStatus.COMPLETED,
        completedAt: new Date(),
        metadata: result,
      },
    });

    return { runId: run.id, ...result };
  } catch (error) {
    await db.sysJobRun.update({
      where: { id: run.id },
      data: {
        status: JobRunStatus.FAILED,
        completedAt: new Date(),
        errorLog: { message: error instanceof Error ? error.message : "Unknown error" },
      },
    });
    throw error;
  }
}
