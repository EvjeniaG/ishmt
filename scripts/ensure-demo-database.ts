/**
 * Vercel deploy: krijon skemën dhe mbush përdoruesit demo nëse mungojnë.
 * Kërkon DATABASE_URL në Vercel (Build & Runtime).
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const DEMO_OWNER_NID = "I90404004D";

function run(command: string) {
  console.log(`\n→ ${command}`);
  execSync(command, { stdio: "inherit", env: process.env });
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("⊘ DATABASE_URL mungon — kalojmë setup-in e databazës (login nuk do të funksionojë).");
    return;
  }

  run("npx prisma db push --skip-generate");

  const prisma = new PrismaClient();
  try {
    const roleCount = await prisma.authRole.count();
    if (roleCount === 0) {
      console.log("\n→ Rolet mungojnë — ekzekutoj db:seed …");
      run("npm run db:seed");
    }

    const demoOwner = await prisma.authUser.findFirst({
      where: { nid: DEMO_OWNER_NID, deletedAt: null },
    });

    if (!demoOwner) {
      console.log("\n→ Përdoruesit demo mungojnë — ekzekutoj db:seed:demo …");
      run("npm run db:seed:demo");
    } else {
      console.log(`\n✓ Përdoruesit demo ekzistojnë (${DEMO_OWNER_NID}).`);
    }
  } finally {
    await prisma.$disconnect();
  }

  if (!process.env.NEXTAUTH_SECRET) {
    console.warn(
      "\n⚠ NEXTAUTH_SECRET mungon — vendoseni në Vercel (Environment Variables) për login.",
    );
  }
  if (!process.env.NEXTAUTH_URL) {
    console.warn(
      "⚠ NEXTAUTH_URL mungon — vendoseni te URL-ja e Vercel (p.sh. https://projekti.vercel.app).",
    );
  }
}

main().catch((error) => {
  console.error("Setup databaze dështoi:", error);
  process.exit(1);
});
