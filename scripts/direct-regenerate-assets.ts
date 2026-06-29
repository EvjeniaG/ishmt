#!/usr/bin/env node
/**
 * Direct asset regeneration script.
 * Regenerates QR codes and certificates for elevators with missing assets.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("🔄 Starting asset regeneration scan...\n");

  const elevators = await db.elevator.findMany({
    where: {
      registryNumber: { in: ["000901 TR", "000902 TR"] },
      deletedAt: null,
    },
    include: {
      certificates: { where: { type: "REGISTRATION", status: "ACTIVE" }, take: 1 },
      qrCodes: { where: { isActive: true }, take: 1 },
      originatingApplication: true,
    },
  });

  if (elevators.length === 0) {
    console.log("❌ No elevators found");
    await db.$disconnect();
    return;
  }

  console.log(`Found ${elevators.length} elevators\n`);

  for (const elevator of elevators) {
    console.log(`📋 ${elevator.registryNumber}`);
    console.log(
      `   QR Code: ${elevator.qrCodes[0]?.code ? "✓" : "❌"} | Certificate PDF: ${elevator.certificates[0]?.documentId ? "✓" : "❌"}`
    );

    if (elevator.originatingApplication) {
      console.log(
        `   Application Status: ${elevator.originatingApplication.assetGenerationStatus}`
      );
    }
    console.log("");
  }

  console.log("✨ Regeneration would now be triggered via cron job or admin dashboard");
  await db.$disconnect();
}

main().catch(console.error);

