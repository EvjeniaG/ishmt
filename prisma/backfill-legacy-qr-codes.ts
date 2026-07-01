import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { QrService } from "../src/lib/services/qr-service";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = (() => {
  const arg = process.argv.find((a) => a.startsWith("--limit="));
  if (!arg) return undefined;
  const n = parseInt(arg.split("=")[1] ?? "", 10);
  return Number.isFinite(n) ? n : undefined;
})();

async function main() {
  const admin = await prisma.authUser.findFirst({
    where: { email: "admin@ishmt.gov.al" },
  });
  if (!admin) {
    throw new Error("Mungon admin@ishmt.gov.al. Ekzekutoni db:seed.");
  }

  const candidates = await prisma.elevator.findMany({
    where: {
      deletedAt: null,
      OR: [
        { qrCodes: { none: { isActive: true } } },
        { qrCodes: { some: { isActive: true, imageDocumentId: null } } },
      ],
    },
    select: { id: true, registryNumber: true },
    orderBy: { registryNumber: "asc" },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  console.log(
    DRY_RUN
      ? `=== DRY RUN: ${candidates.length} ashensorë pa QR të plotë ===`
      : `=== Gjenerim QR për ${candidates.length} ashensorë ===`,
  );

  let created = 0;
  let images = 0;
  let failed = 0;

  for (const elevator of candidates) {
    if (DRY_RUN) {
      console.log(`  ${elevator.registryNumber}`);
      continue;
    }

    try {
      const before = await prisma.qrCode.findFirst({
        where: { elevatorId: elevator.id, isActive: true },
        select: { id: true, imageDocumentId: true },
      });
      const qr = await QrService.ensureQrForElevator(elevator.id, admin.id);
      if (!before) created++;
      else if (!before.imageDocumentId && qr.imageDocumentId) images++;
      if ((created + images + failed) % 200 === 0) {
        console.log(`  ... ${created + images + failed}/${candidates.length}`);
      }
    } catch (err) {
      failed++;
      console.error(
        `  ✗ ${elevator.registryNumber}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (!DRY_RUN) {
    console.log(`\nPërfundoi: ${created} QR të reja, ${images} imazhe, ${failed} dështime.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
