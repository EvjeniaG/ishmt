import { AssetGenerationStatus, JobRunStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { PostApprovalAssetService } from "@/lib/services/post-approval-asset-service";

export const ASSET_GENERATION_JOB_TYPE = "ASSET_GENERATION_RETRY";

export type AssetGenerationJobResult = {
  total: number;
  regenerated: number;
  failed: number;
  errors: { applicationId: string; applicationNumber: string; error: string }[];
};

export async function runAssetGenerationRetryJob(limit = 50): Promise<AssetGenerationJobResult> {
  const applications = await db.application.findMany({
    where: {
      assetGenerationStatus: { in: [AssetGenerationStatus.PENDING, AssetGenerationStatus.FAILED] },
      elevatorId: { not: null },
      deletedAt: null,
    },
    include: {
      targetElevator: {
        include: {
          certificates: { where: { type: "REGISTRATION", status: "ACTIVE" }, take: 1 },
          qrCodes: { where: { isActive: true }, take: 1 },
        },
      },
    },
    orderBy: { updatedAt: "asc" },
    take: limit,
  });

  let regenerated = 0;
  let failed = 0;
  const errors: AssetGenerationJobResult["errors"] = [];

  for (const application of applications) {
    const elevator = application.targetElevator;
    const certificate = elevator?.certificates[0];
    const qr = elevator?.qrCodes[0];

    if (!elevator || !certificate || !qr) {
      failed++;
      errors.push({
        applicationId: application.id,
        applicationNumber: application.applicationNumber,
        error: "Missing elevator, registration certificate, or active QR skeleton.",
      });
      continue;
    }

    const result = await PostApprovalAssetService.tryGenerate({
      elevatorId: elevator.id,
      certificateId: certificate.id,
      qrCodeId: qr.id,
      applicationId: application.id,
      actorId: application.createdById,
    });

    if (result.success) {
      regenerated++;
    } else {
      failed++;
      errors.push({
        applicationId: application.id,
        applicationNumber: application.applicationNumber,
        error: result.error,
      });
    }
  }

  return {
    total: applications.length,
    regenerated,
    failed,
    errors,
  };
}

export async function executeAssetGenerationRetryJobWithLogging() {
  const run = await db.sysJobRun.create({
    data: {
      jobType: ASSET_GENERATION_JOB_TYPE,
      status: JobRunStatus.STARTED,
    },
  });

  try {
    const result = await runAssetGenerationRetryJob();

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
