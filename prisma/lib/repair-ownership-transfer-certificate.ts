/**
 * Riparon certifikatën pas transferimit të pronësisë kur u krijua gabimisht CR e re.
 * Rikthen CR origjinale si ACTIVE, heq CR e tepërt dhe rigjeneron PDF-n.
 */
import {
  ApplicationType,
  CertificateStatus,
  CertificateType,
  DataUpdateType,
  PrismaClient,
} from "@prisma/client";
import { PostApprovalAssetService } from "@/lib/services/post-approval-asset-service";

export async function repairOwnershipTransferCertificate(
  prisma: PrismaClient,
  input: { registryNumber: string; actorUserId?: string },
) {
  const elevator = await prisma.elevator.findFirst({
    where: { registryNumber: input.registryNumber, deletedAt: null },
    include: {
      certificates: { where: { type: CertificateType.REGISTRATION }, orderBy: { issuedDate: "asc" } },
      targetApplications: {
        where: {
          type: ApplicationType.DATA_UPDATE,
          data: { updateType: DataUpdateType.OWNERSHIP_TRANSFER },
          status: "APPROVED",
        },
        orderBy: { approvedAt: "desc" },
        take: 1,
      },
      originatingApplication: { select: { id: true } },
    },
  });

  if (!elevator) {
    throw new Error(`Ashensori ${input.registryNumber} nuk u gjet.`);
  }

  const transferApp = elevator.targetApplications[0];
  if (!transferApp) {
    throw new Error("Nuk u gjet aplikim i miratuar për transferim pronësie.");
  }

  const originAppId = elevator.originatingApplication?.id ?? elevator.applicationId;
  const originalCert = elevator.certificates.find((c) => c.applicationId === originAppId);
  const erroneousCert = elevator.certificates.find(
    (c) => c.id !== originalCert?.id && c.status === CertificateStatus.ACTIVE,
  );

  if (!originalCert) {
    throw new Error("Certifikata origjinale e regjistrimit nuk u gjet.");
  }
  if (!erroneousCert) {
    if (originalCert.status === CertificateStatus.ACTIVE) {
      return { repaired: false, message: "Certifikata është tashmë në rregull.", certificateNumber: originalCert.certificateNumber };
    }
    throw new Error("Nuk u gjet certifikatë e gabuar për riparim.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.certificate.update({
      where: { id: originalCert.id },
      data: {
        status: CertificateStatus.ACTIVE,
        supersededById: null,
        revokedAt: null,
        revokedReason: null,
      },
    });

    if (erroneousCert.documentId) {
      await tx.certificate.update({
        where: { id: erroneousCert.id },
        data: { documentId: null },
      });
    }

    await tx.certificate.delete({ where: { id: erroneousCert.id } });
  });

  const actorId =
    input.actorUserId ??
    (
      await prisma.authUser.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
          memberships: {
            some: {
              deactivatedAt: null,
              role: { code: "CHIEF_INSPECTOR" },
            },
          },
        },
        select: { id: true },
      })
    )?.id;

  if (!actorId) {
    throw new Error("Nuk u gjet përdorues për rigjenerimin e PDF.");
  }

  await PostApprovalAssetService.generateReplacementCertificatePdf({
    applicationId: transferApp.id,
    certificateId: originalCert.id,
    elevatorId: elevator.id,
    actorId,
  });

  return {
    repaired: true,
    certificateNumber: originalCert.certificateNumber,
    removedCertificateNumber: erroneousCert.certificateNumber,
    transferApplicationNumber: transferApp.applicationNumber,
  };
}
