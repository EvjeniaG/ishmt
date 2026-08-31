import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { consolidateDemoOwner } from "./lib/demo-owner";

const prisma = new PrismaClient();

async function main() {
  console.log("Harmonizim i të dhënave demo për personin përgjegjës...\n");
  const result = await consolidateDemoOwner(prisma);
  if (!result.changed) {
    console.log("Asgjë për të harmonizuar - të dhënat janë në rregull.");
    return;
  }

  console.log("✓ Harmonizimi u krye:");
  console.log(`  • Përdoruesi kanonik: ${result.canonicalUserId}`);
  console.log(`  • Organizata kanonike: ${result.canonicalOrgId}`);
  if (result.notificationsMoved > 0) {
    console.log(`  • Njoftime të zhvendosura: ${result.notificationsMoved}`);
  }
  if (result.migratedApplications > 0) {
    console.log(`  • Aplikime të zhvendosura: ${result.migratedApplications}`);
  }
  if (result.migratedElevators > 0) {
    console.log(`  • Ashensorë të zhvendosur: ${result.migratedElevators}`);
  }
  console.log("\nDilni dhe hyni përsëri me NID I90404004D për të rifreskuar sesionin.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
