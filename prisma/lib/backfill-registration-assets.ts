import "dotenv/config";
import { backfillRegistrationAssets } from "../../src/lib/elevators/backfill-registration-assets";
import { db } from "../../src/lib/db";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const registryNumber = process.argv.find((a) => a.startsWith("--registry="))?.split("=")[1];
  const elevatorId = process.argv.find((a) => a.startsWith("--elevator="))?.split("=")[1];
  const limit = (() => {
    const arg = process.argv.find((a) => a.startsWith("--limit="));
    if (!arg) return undefined;
    const n = parseInt(arg.split("=")[1] ?? "", 10);
    return Number.isFinite(n) ? n : undefined;
  })();

  console.log(
    dryRun
      ? "=== DRY RUN: ashensorë pa PDF certifikate ==="
      : "=== Gjenerim PDF certifikate për ashensorë demo ===",
  );

  const result = await backfillRegistrationAssets({
    dryRun,
    registryNumber,
    elevatorId,
    limit,
  });

  if (dryRun) {
    console.log(`\nGjetur ${result.scanned} ashensor(ë). Ekzekutoni pa --dry-run për gjenerim.`);
  } else {
    console.log(
      `\nPërfundoi: ${result.generated} u gjeneruan, ${result.failed} dështuan (nga ${result.scanned}).`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
