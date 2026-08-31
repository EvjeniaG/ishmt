import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { backfillFieldVerificationAssignments } from "./lib/backfill-field-verification-assignments";

const prisma = new PrismaClient();

async function main() {
  console.log("Backfill i caktimeve të verifikimit në terren...\n");
  const result = await backfillFieldVerificationAssignments(prisma);
  console.log(
    `\nPërmbledhje: ${result.created} të krijuara, ${result.skipped} të anashkaluara, ${result.scanned} të skanuara.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
