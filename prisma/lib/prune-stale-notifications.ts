import "dotenv/config";
import { NotificationService } from "../../src/lib/services/notification-service";
import { db } from "../../src/lib/db";

async function main() {
  const before = await db.notification.count({ where: { readAt: null } });
  const result = await NotificationService.pruneStaleForAllUsers();
  const after = await db.notification.count({ where: { readAt: null } });
  console.log(`Scanned ${result.scanned} unread notifications, pruned ${result.pruned}.`);
  console.log(`Unread before: ${before}, after: ${after}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
