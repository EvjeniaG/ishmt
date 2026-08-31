import { db } from "@/lib/db";
import { PostApprovalAssetService } from "@/lib/services/post-approval-asset-service";
import { QrService } from "@/lib/services/qr-service";

export type BackfillRegistrationAssetsResult = {
  scanned: number;
  generated: number;
  skipped: number;
  failed: number;
  errors: Array<{ registryNumber: string; error: string }>;
};

async function backfillOneElevator(elevatorId: string, actorId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const elevator = await db.elevator.findFirst({
    where: { id: elevatorId, deletedAt: null },
    include: {
      certificates: { where: { type: "REGISTRATION", status: "ACTIVE" }, take: 1 },
      qrCodes: { where: { isActive: true }, take: 1 },
      originatingApplication: true,
    },
  });

  if (!elevator) {
    return { ok: false, error: "Ashensori nuk u gjet." };
  }

  const certificate = elevator.certificates[0];
  if (!certificate) {
    return { ok: false, error: "Mungon certifikata e regjistrimit." };
  }

  if (!elevator.originatingApplication) {
    return { ok: false, error: "Mungon aplikimi burim i regjistrimit." };
  }

  if (certificate.documentId) {
    const qr = elevator.qrCodes[0];
    if (qr?.imageDocumentId) {
      return { ok: true };
    }
  }

  const qr = await QrService.ensureQrForElevator(elevator.id, actorId);

  if (certificate.documentId && qr.imageDocumentId) {
    return { ok: true };
  }

  const result = await PostApprovalAssetService.tryGenerate({
    elevatorId: elevator.id,
    certificateId: certificate.id,
    qrCodeId: qr.id,
    applicationId: elevator.originatingApplication.id,
    actorId,
  });

  if (!result.success) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}

/** Gjeneron PDF certifikate + imazh QR për ashensorë të regjistruar pa dokumente (p.sh. seed demo). */
export async function backfillRegistrationAssets(input?: {
  dryRun?: boolean;
  registryNumber?: string;
  elevatorId?: string;
  limit?: number;
  actorId?: string;
}): Promise<BackfillRegistrationAssetsResult> {
  const dryRun = input?.dryRun ?? false;

  let actorId = input?.actorId;
  if (!actorId) {
    const admin = await db.authUser.findFirst({
      where: { email: "admin@ishmt.gov.al" },
      select: { id: true },
    });
    if (!admin) {
      throw new Error("Mungon admin@ishmt.gov.al. Ekzekutoni db:seed.");
    }
    actorId = admin.id;
  }

  const candidates = await db.elevator.findMany({
    where: {
      deletedAt: null,
      ...(input?.elevatorId ? { id: input.elevatorId } : {}),
      ...(input?.registryNumber ? { registryNumber: input.registryNumber } : {}),
      certificates: {
        some: {
          type: "REGISTRATION",
          status: "ACTIVE",
          documentId: null,
        },
      },
    },
    select: { id: true, registryNumber: true },
    orderBy: { registryNumber: "asc" },
    ...(input?.limit ? { take: input.limit } : {}),
  });

  const result: BackfillRegistrationAssetsResult = {
    scanned: candidates.length,
    generated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const elevator of candidates) {
    if (dryRun) {
      console.log(`  ${elevator.registryNumber}`);
      continue;
    }

    try {
      const outcome = await backfillOneElevator(elevator.id, actorId);
      if (outcome.ok) {
        result.generated++;
        console.log(`  ✓ ${elevator.registryNumber}`);
      } else {
        result.failed++;
        result.errors.push({ registryNumber: elevator.registryNumber, error: outcome.error });
        console.error(`  ✗ ${elevator.registryNumber}: ${outcome.error}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed++;
      result.errors.push({ registryNumber: elevator.registryNumber, error: message });
      console.error(`  ✗ ${elevator.registryNumber}: ${message}`);
    }
  }

  return result;
}

export { backfillOneElevator };
