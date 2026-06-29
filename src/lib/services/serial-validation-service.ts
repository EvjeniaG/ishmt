import { ApplicationStatus } from "@prisma/client";
import { db } from "@/lib/db";

/** Kontroll uniciteti serial - regjistrim dhe lifecycle */
export class SerialValidationService {
  static async assertUnique(
    serialNumber: string,
    options?: { excludeApplicationId?: string; excludeElevatorId?: string },
  ) {
    const normalized = serialNumber.trim();
    if (!normalized) return;

    const duplicateElevator = await db.elevator.findFirst({
      where: {
        deletedAt: null,
        status: { not: "DEREGISTERED" },
        id: options?.excludeElevatorId ? { not: options.excludeElevatorId } : undefined,
        technicalData: { serialNumber: normalized },
      },
    });
    if (duplicateElevator) {
      throw new Error("Numri serial ekziston tashmë në regjistër aktiv.");
    }

    const duplicateApp = await db.applicationData.findFirst({
      where: {
        serialNumber: normalized,
        application: {
          id: options?.excludeApplicationId ? { not: options.excludeApplicationId } : undefined,
          deletedAt: null,
          status: {
            notIn: [ApplicationStatus.REJECTED, ApplicationStatus.CANCELLED, ApplicationStatus.EXPIRED],
          },
        },
      },
    });
    if (duplicateApp) {
      throw new Error("Numri serial përdoret në një aplikim tjetër aktiv.");
    }
  }

  static async checkAvailable(
    serialNumber: string,
    options?: { excludeApplicationId?: string; excludeElevatorId?: string },
  ) {
    try {
      await this.assertUnique(serialNumber, options);
      return { available: true as const };
    } catch (error) {
      return {
        available: false as const,
        message: error instanceof Error ? error.message : "Serial i pavlefshëm",
      };
    }
  }
}
