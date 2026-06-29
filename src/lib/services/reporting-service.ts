import { ApplicationStatus, ComplianceIndicator, ElevatorStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  aggregateComplianceByMunicipality,
  computeElevatorComplianceIndicator,
  ELEVATOR_COMPLIANCE_INCLUDE,
} from "@/lib/elevators/elevator-compliance-stats";

export type ReportExportRow = Record<string, string | number | null>;

export class ReportingService {
  static async getComplianceByMunicipality() {
    const elevators = await db.elevator.findMany({
      where: { deletedAt: null, status: ElevatorStatus.ACTIVE },
      include: {
        municipality: { select: { nameSq: true, code: true } },
        ...ELEVATOR_COMPLIANCE_INCLUDE,
      },
    });

    return aggregateComplianceByMunicipality(elevators);
  }

  static async getApplicationThroughput(days = 90) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const transitions = await db.applicationWorkflowHistory.findMany({
      where: {
        createdAt: { gte: since },
        action: { in: ["APPROVE", "REJECT", "RETURN"] },
      },
      select: { action: true, createdAt: true, application: { select: { type: true } } },
    });

    const byAction: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const t of transitions) {
      byAction[t.action] = (byAction[t.action] ?? 0) + 1;
      const type = t.application.type;
      byType[type] = (byType[type] ?? 0) + 1;
    }

    const pending = await db.application.groupBy({
      by: ["type", "status"],
      _count: { id: true },
      where: {
        deletedAt: null,
        status: {
          in: [
            ApplicationStatus.SUBMITTED,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.PENDING_CHIEF_INSPECTOR,
          ],
        },
      },
    });

    return { byAction, byType, pending, periodDays: days };
  }

  static async getMaintenanceNonCompliance() {
    const elevators = await db.elevator.findMany({
      where: {
        deletedAt: null,
        status: ElevatorStatus.ACTIVE,
      },
      include: {
        municipality: { select: { nameSq: true } },
        ownerOrg: { select: { name: true } },
        maintenanceOrg: { select: { name: true } },
        ...ELEVATOR_COMPLIANCE_INCLUDE,
      },
      orderBy: { registryNumber: "asc" },
      take: 500,
    });

    return elevators.filter((e) => computeElevatorComplianceIndicator(e) !== ComplianceIndicator.GREEN);
  }

  static async getRegistryStatusReport(): Promise<ReportExportRow[]> {
    const rows = await db.elevator.groupBy({
      by: ["status"],
      _count: { status: true },
      where: { deletedAt: null },
    });

    return rows.map((r) => ({
      status: r.status,
      count: r._count.status,
    }));
  }

  static async exportElevatorsCsv(filters?: { municipalityId?: string; status?: ElevatorStatus }) {
    const elevators = await db.elevator.findMany({
      where: {
        deletedAt: null,
        ...(filters?.municipalityId ? { municipalityId: filters.municipalityId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        municipality: { select: { nameSq: true } },
        ownerOrg: { select: { name: true, nipt: true } },
        technicalData: { select: { serialNumber: true } },
        ...ELEVATOR_COMPLIANCE_INCLUDE,
      },
      orderBy: { registryNumber: "asc" },
      take: 5000,
    });

    return elevators.map((e) => ({
      registryNumber: e.registryNumber,
      status: e.status,
      compliance: computeElevatorComplianceIndicator(e),
      municipality: e.municipality.nameSq,
      address: e.buildingAddress,
      owner: e.ownerOrg.name,
      ownerNipt: e.ownerOrg.nipt ?? "",
      serialNumber: e.technicalData?.serialNumber ?? "",
      registrationDate: e.registrationDate.toISOString().slice(0, 10),
    }));
  }
}
