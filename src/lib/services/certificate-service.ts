import {
  AuditAction,
  CertificateStatus,
  CertificateType,
  Prisma,
} from "@prisma/client";
import { AuditService } from "@/lib/audit/audit-service";
import { NumberFormatService } from "@/lib/services/number-format-service";

export class CertificateService {
  /** Creates registration certificate metadata on approval; PDF generated post-commit. */
  static async createRegistrationCertificateMetadata(
    input: {
      elevatorId: string;
      applicationId: string;
      issuedByOrgId: string;
      issuedByUserId: string;
      issuedDate?: Date;
    },
    tx: Prisma.TransactionClient,
  ) {
    const certificateNumber = await NumberFormatService.nextCertificateNumber("REG", tx);
    const issuedDate = input.issuedDate ?? new Date();

    const certificate = await tx.certificate.create({
      data: {
        certificateNumber,
        elevatorId: input.elevatorId,
        type: CertificateType.REGISTRATION,
        status: CertificateStatus.ACTIVE,
        issuedDate,
        issuedByOrgId: input.issuedByOrgId,
        issuedByUserId: input.issuedByUserId,
        applicationId: input.applicationId,
      },
    });

    await AuditService.log(
      {
        actorId: input.issuedByUserId,
        action: AuditAction.CREATE,
        entityType: "certificate",
        entityId: certificate.id,
        afterState: {
          certificateNumber,
          type: CertificateType.REGISTRATION,
          elevatorId: input.elevatorId,
        },
        metadata: { pdfGeneratedAsync: true },
      },
      tx,
    );

    return certificate;
  }

  static async getByNumber(certificateNumber: string) {
    const { db } = await import("@/lib/db");
    return db.certificate.findFirst({
      where: { certificateNumber },
      include: { elevator: { include: { municipality: true } } },
    });
  }
}
