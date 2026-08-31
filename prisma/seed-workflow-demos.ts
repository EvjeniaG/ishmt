import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedWorkflowDemos } from "./lib/seed-workflow-demos";

const prisma = new PrismaClient();

async function main() {
  console.log("Rivendosje të dhënash demo workflow...\n");
  await seedWorkflowDemos(prisma);
  console.log("\n✓ Demo workflow u krijua.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
