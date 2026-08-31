import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PostApprovalAssetService } from "../src/lib/services/post-approval-asset-service";

const prisma = new PrismaClient();

async function main() {
  const registryNumber = process.argv[2];
  if (!registryNumber) {
    console.error("Përdorimi: npx tsx scripts/regenerate-certificate-pdf.ts \"000903 TR\"");
    process.exit(1);
  }

  const elevator = await prisma.elevator.findFirst({
    where: { registryNumber, deletedAt: null },
    include: {
      certificates: {
        where: { type: "REGISTRATION", status: "ACTIVE" },
        take: 1,
      },
      targetApplications: {
        where: { type: "DATA_UPDATE", status: "APPROVED" },
        orderBy: { approvedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!elevator?.certificates[0]) {
    throw new Error(`Certifikata aktive për ${registryNumber} nuk u gjet.`);
  }

  const transferApp = elevator.targetApplications[0];
  const applicationId = transferApp?.id ?? elevator.applicationId;
  const actorId =
    transferApp?.createdById ??
    (
      await prisma.authUser.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
          memberships: { some: { deactivatedAt: null, role: { code: "CHIEF_INSPECTOR" } } },
        },
        select: { id: true },
      })
    )?.id;

  if (!actorId) throw new Error("Nuk u gjet përdorues për rigjenerimin e PDF.");

  const result = await PostApprovalAssetService.generateReplacementCertificatePdf({
    applicationId,
    certificateId: elevator.certificates[0].id,
    elevatorId: elevator.id,
    actorId,
  });

  console.log(`PDF u rigjenerua për ${registryNumber} (${elevator.certificates[0].certificateNumber}).`);
  console.log(result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
