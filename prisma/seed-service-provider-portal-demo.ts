import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedServiceProviderPortalDemo } from "./lib/seed-service-provider-portal-demo";
import { SERVICE_PROVIDER_DEMO_PAGES } from "../src/lib/demo/service-provider-demo-constants";

const prisma = new PrismaClient();

async function main() {
  console.log("Demo portal kompani shërbimi (Instalim · Mirëmbajtje · OM)...\n");

  const result = await seedServiceProviderPortalDemo(prisma);

  console.log("✓ Demo u krijua.\n");
  console.log("Hyrje:");
  console.log(`  NIPT:     ${result.nipt}`);
  console.log(`  Email:    ${result.email}`);
  console.log(`  Fjalëkalimi: ${result.password}`);
  console.log(`\n  ${result.elevatorCount} ashensorë · ${result.applicationCount} aplikime demo\n`);
  console.log("Faqet për të parë:");
  for (const page of SERVICE_PROVIDER_DEMO_PAGES) {
    console.log(`  [${page.group}] ${page.label}`);
    console.log(`      ${page.href}`);
    console.log(`      ${page.description}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
