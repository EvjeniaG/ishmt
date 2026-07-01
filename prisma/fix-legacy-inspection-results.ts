import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Importi legacy vendoste vetëm `status`, jo `result` - UI dhe përputhshmëria lexojnë `result`.
 * Ky skript mbush `result` nga `status` për inspektimet ekzistuese.
 */
async function main() {
  const count = await prisma.$executeRaw`
    UPDATE insp_inspections
    SET result = status
    WHERE result IS NULL
      AND status IN ('PASS', 'FAIL', 'CONDITIONAL')
  `;

  console.log(`✓ U përditësuan ${count} inspektime (result ← status)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
