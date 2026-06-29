import { OrgType, Prisma } from "@prisma/client";

export class ElevatorResponsibilityService {
  static async replaceCurrent(
    tx: Prisma.TransactionClient,
    input: {
      elevatorId: string;
      organizationId: string;
      role: OrgType;
      validFrom?: Date;
      applicationId?: string | null;
    },
  ) {
    const validFrom = input.validFrom ?? new Date();
    const current = await tx.elevatorResponsibleEntity.findFirst({
      where: {
        elevatorId: input.elevatorId,
        role: input.role,
        validTo: null,
      },
      orderBy: { validFrom: "desc" },
    });

    if (current?.organizationId === input.organizationId) {
      return current;
    }

    await tx.elevatorResponsibleEntity.updateMany({
      where: {
        elevatorId: input.elevatorId,
        role: input.role,
        validTo: null,
      },
      data: { validTo: validFrom },
    });

    return tx.elevatorResponsibleEntity.create({
      data: {
        elevatorId: input.elevatorId,
        organizationId: input.organizationId,
        role: input.role,
        validFrom,
        applicationId: input.applicationId ?? null,
      },
    });
  }
}
