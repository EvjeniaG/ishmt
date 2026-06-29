import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function verify() {
  const elevators = await db.elevator.findMany({
    where: { registryNumber: { in: ["000901 TR", "000902 TR"] } },
    include: {
      originatingApplication: {
        select: {
          applicationNumber: true,
          assetGenerationStatus: true,
          assetGenerationError: true,
        },
      },
      qrCodes: { where: { isActive: true } },
      certificates: { where: { type: "REGISTRATION", status: "ACTIVE" } },
    },
  });

  console.log("\n✓ Verification Results:\n");
  elevators.forEach((e) => {
    console.log(`  📋 ${e.registryNumber}`);
    console.log(`     Application: ${e.originatingApplication?.applicationNumber}`);
    console.log(`     Asset Status: ${e.originatingApplication?.assetGenerationStatus}`);
    console.log(`     QR Code: ${e.qrCodes[0]?.code || "❌ MISSING"}`);
    console.log(`     Certificate: ${e.certificates[0]?.certificateNumber || "❌ MISSING"}`);
    console.log(
      `     Certificate PDF: ${e.certificates[0]?.documentId ? "✓ Available" : "❌ MISSING"}`
    );
    console.log("");
  });

  await db.$disconnect();
}

verify().catch(console.error);
