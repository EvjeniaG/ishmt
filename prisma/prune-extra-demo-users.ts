import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { pruneNonCanonicalDemoUsers } from "./lib/canonical-demo-users";

const prisma = new PrismaClient();

async function main() {
  const pruned = await pruneNonCanonicalDemoUsers(prisma);
  console.log(`✓ U çaktivizuan ${pruned} llogari jashtë listës së 17 përdoruesve demo.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
