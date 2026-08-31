import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { purgeDemoData } from "./lib/purge-demo-data";

const prisma = new PrismaClient();

async function main() {
  const keepAllUsers = process.argv.includes("--keep-users");
  console.log(
    keepAllUsers
      ? "Duke fshirë të dhënat demo (përdoruesit dhe organizatat mbeten të paprekura)...\n"
      : "Duke fshirë të dhënat demo (përdoruesit dhe organizatat mbeten)...\n",
  );

  const result = await purgeDemoData(prisma, { keepAllUsers });

  console.log(`✓ ${result.deletedApplications} aplikime`);
  console.log(`✓ ${result.deletedElevators} ashensorë`);
  if (keepAllUsers) {
    console.log("✓ Përdoruesit dhe organizatat u ruajtën (asnjë llogari e fshirë)");
  } else {
    console.log(`✓ ${result.deletedUsers} përdorues jashtë kredencialeve demo`);
    console.log(`✓ ${result.deletedOrgs} organizata jashtë kredencialeve demo`);
    console.log("\nU ruajtën vetëm 17 llogaritë e tabelës «Kredenciale demo» (+ pool licencash pa llogari).");
  }
  console.log(`✓ ${result.deletedNotifications} njoftime`);
  console.log(`✓ ${result.deletedAuditLogs} hyrje auditimi`);
  console.log(`✓ ${result.deletedScheduledReminders} kujtesa/afate`);
  console.log(`✓ ${result.deletedJobRuns} job run`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
