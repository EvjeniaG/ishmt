import "dotenv/config";
import { BuildingType, PrismaClient } from "@prisma/client";
import { seedPipelineDemos } from "./lib/seed-pipeline-demos";

const prisma = new PrismaClient();

function inspectionIntervalMonths(buildingType: BuildingType | null): number {
  if (buildingType === BuildingType.WORKPLACE || buildingType === BuildingType.PUBLIC_BUILDING) {
    return 6;
  }
  return 12;
}

async function main() {
  console.log("Seed demo pipeline (raportime, mirëmbajtje, inspektime)...\n");

  const elevators = await prisma.elevator.findMany({
    where: {
      deletedAt: null,
      technicalData: {
        serialNumber: { in: ["KN-2025-884512", "SCH-2024-553120"] },
      },
    },
    include: {
      technicalData: true,
      originatingApplication: { include: { data: true } },
    },
    orderBy: { registryNumber: "asc" },
  });

  if (elevators.length < 2) {
    throw new Error(
      "Nuk u gjetën 2 ashensorët demo (KN-2025-884512, SCH-2024-553120). Ekzekutoni fillimisht `npm run db:seed:demo`.",
    );
  }

  const [maintenanceUser, certifierUser, fieldInspectorUser, sectorHeadUser, ownerUser] =
    await Promise.all([
    prisma.authUser.findFirst({ where: { email: "mirembajtje@servisashensore.al" } }),
    prisma.authUser.findFirst({ where: { email: "cert@omicert.al" } }),
    prisma.authUser.findFirst({ where: { email: "terren@ishmt.gov.al" } }),
    prisma.authUser.findFirst({ where: { email: "shef@ishmt.gov.al" } }),
    prisma.authUser.findFirst({ where: { email: "personi përgjegjës i ashensorit@example.al" } }),
  ]);

  if (!maintenanceUser || !certifierUser || !fieldInspectorUser || !sectorHeadUser || !ownerUser) {
    throw new Error("Përdoruesit demo mungojnë. Ekzekutoni `npm run db:seed:demo`.");
  }

  const maintenanceOrg = await prisma.organization.findFirst({
    where: { nipt: "K33333333C", deletedAt: null },
  });
  const certifierOrg = await prisma.organization.findFirst({
    where: { nipt: "K22222222B", deletedAt: null },
  });

  if (!maintenanceOrg || !certifierOrg) {
    throw new Error("Organizatat demo mungojnë.");
  }

  const demoElevators = elevators.map((e) => ({
    id: e.id,
    registryNumber: e.registryNumber,
    buildingName: e.buildingName ?? e.registryNumber,
    inspectionIntervalMonths: inspectionIntervalMonths(
      e.originatingApplication?.data?.buildingType ?? null,
    ),
  }));

  const result = await seedPipelineDemos(prisma, demoElevators, {
    ownerUserId: ownerUser.id,
    maintenanceUserId: maintenanceUser.id,
    certifierUserId: certifierUser.id,
    fieldInspectorUserId: fieldInspectorUser.id,
    sectorHeadUserId: sectorHeadUser.id,
    maintenanceOrgId: maintenanceOrg.id,
    certifierOrgId: certifierOrg.id,
  });

  console.log("✓ Raportime qytetarësh:", result.citizenReports.join(", "));
  console.log("✓ Ashensorë:", result.elevators.join(" · "));
  console.log("\nShiko:");
  console.log("  • /ishmt/reports - raportimet e qytetarëve");
  console.log("  • /portal/sherbimi - mirëmbajtja (login: NIPT K33333333C)");
  console.log("  • /portal/omi - inspektimet (login: NIPT K22222222B)");
  console.log("  • /portal/elevators - dosjet e personit përgjegjës të ashensorit");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
