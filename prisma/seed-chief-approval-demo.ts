import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedChiefApprovalDemo } from "./lib/seed-chief-approval-demo";

const prisma = new PrismaClient();

async function main() {
  console.log("Seed aplikim demo për miratim nga kryeinspektori...\n");

  const result = await seedChiefApprovalDemo(prisma);

  console.log("✓ Aplikimi demo u krijua:");
  console.log(`  Numri:   ${result.applicationNumber}`);
  console.log(`  Status:  PENDING_CHIEF_INSPECTOR (gati për miratim)`);
  console.log(`  Serial:  ${result.serialNumber}`);
  console.log(`  Shqyrtim: ${result.reviewUrl}`);
  console.log("\nHyr si kryeinspektor (Edison Konomi / I90505005E) → Shqyrtimi i aplikimeve ose linku më sipër.\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
