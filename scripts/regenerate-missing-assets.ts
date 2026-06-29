#!/usr/bin/env node
/**
 * Migration script to regenerate missing QR codes and certificates for elevators.
 * 
 * This script resets the asset generation status so administrators can retry
 * from the ISHMT admin dashboard.
 * 
 * Usage:
 *   npx ts-node scripts/regenerate-missing-assets.ts [-elevatorId=<id>] [-registryNumber=<number>] [-dry-run]
 * 
 * Examples:
 *   npx ts-node scripts/regenerate-missing-assets.ts -elevatorId=b7394791-ced7-45d6-8e3e-4911b2bae5ad
 *   npx ts-node scripts/regenerate-missing-assets.ts -registryNumber="000901 TR"
 *   npx ts-node scripts/regenerate-missing-assets.ts -dry-run
 */

import { PrismaClient, AssetGenerationStatus } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const params = {
    elevatorId: args.find((a) => a.startsWith("-elevatorId="))?.split("=")[1],
    registryNumber: args.find((a) => a.startsWith("-registryNumber="))?.split("=")[1],
    dryRun: args.includes("-dry-run"),
  };

  console.log("🔍 Scanning for elevators with missing assets...\n");

  // Find elevators with missing QR codes or certificates
  const elevatorsWithMissingAssets = await db.elevator.findMany({
    where: {
      deletedAt: null,
      ...(params.elevatorId && { id: params.elevatorId }),
      ...(params.registryNumber && { registryNumber: params.registryNumber }),
    },
    include: {
      certificates: { where: { type: "REGISTRATION", status: "ACTIVE" } },
      qrCodes: { where: { isActive: true } },
      originatingApplication: true,
    },
  });

  if (elevatorsWithMissingAssets.length === 0) {
    console.log("✅ No elevators found matching criteria.");
    await db.$disconnect();
    return;
  }

  const problematicElevators = elevatorsWithMissingAssets.filter(
    (e) => !e.qrCodes[0]?.code || !e.certificates[0]?.documentId
  );

  if (problematicElevators.length === 0) {
    console.log("✅ All found elevators have complete assets.");
    await db.$disconnect();
    return;
  }

  console.log(`Found ${problematicElevators.length} elevators with missing assets:\n`);

  for (const elevator of problematicElevators) {
    const qrIssue = !elevator.qrCodes[0]?.code ? "missing QR code" : "missing QR image";
    const certIssue = !elevator.certificates[0]?.documentId ? "missing certificate PDF" : "unknown";
    const issues = [
      !elevator.qrCodes[0]?.code && qrIssue,
      !elevator.certificates[0]?.documentId && certIssue,
    ]
      .filter(Boolean)
      .join(", ");

    console.log(`  📋 ${elevator.registryNumber} (${issues})`);

    if (!params.dryRun) {
      console.log(`     ⏳ Marking for asset generation retry...`);
      try {
        if (elevator.originatingApplication) {
          // Update application to reset asset generation status
          await db.application.update({
            where: { id: elevator.originatingApplication.id },
            data: {
              assetGenerationStatus: AssetGenerationStatus.PENDING,
              assetGenerationError: null,
              assetGenerationCompletedAt: null,
            },
          });
          console.log(`     ✅ Application marked as PENDING - admin can now retry`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.log(`     ❌ Failed: ${message}`);
      }
    }
  }

  if (params.dryRun) {
    console.log("\n📝 Run without -dry-run to mark these elevators for regeneration.");
  } else {
    console.log("\n✨ Marked for regeneration. Admin can now trigger asset generation from the dashboard.");
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exit(1);
});
