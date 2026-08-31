import "dotenv/config";
import { backfillReturnNotifications } from "../../src/lib/notifications/backfill-return-notifications";
import { db } from "../../src/lib/db";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await backfillReturnNotifications({ dryRun });
  console.log(
    dryRun
      ? `Dry run: would create ${result.created} return notification(s) across ${result.applications} application(s).`
      : `Created ${result.created} return notification(s); marked ${result.legacyMarkedRead} legacy duplicate(s) as read.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
