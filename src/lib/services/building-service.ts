import { BuildingType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ELEVATOR_COMPLIANCE_INCLUDE } from "@/lib/elevators/elevator-compliance-stats";
import { AuditService } from "@/lib/audit/audit-service";
import { AuditAction } from "@prisma/client";

function normalizeAddress(address: string) {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

export class BuildingService {
  /** Find or create a building record from elevator location data. */
  static async linkElevatorToBuilding(
    input: {
      elevatorId: string;
      address: string;
      municipalityId: string;
      administrativeUnitId?: string | null;
      buildingName?: string | null;
      buildingType?: BuildingType | null;
      ownerOrgId: string;
      gpsLatitude?: Prisma.Decimal | null;
      gpsLongitude?: Prisma.Decimal | null;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? db;
    const normalized = normalizeAddress(input.address);

    let building = await client.building.findFirst({
      where: {
        municipalityId: input.municipalityId,
        deletedAt: null,
        address: { equals: input.address, mode: "insensitive" },
      },
    });

    if (!building) {
      building = await client.building.create({
        data: {
          name: input.buildingName ?? null,
          address: input.address,
          municipalityId: input.municipalityId,
          administrativeUnitId: input.administrativeUnitId ?? null,
          buildingType: input.buildingType ?? null,
          primaryOwnerOrgId: input.ownerOrgId,
          gpsLatitude: input.gpsLatitude ?? null,
          gpsLongitude: input.gpsLongitude ?? null,
        },
      });
    }

    await client.elevator.update({
      where: { id: input.elevatorId },
      data: { buildingId: building.id },
    });

    return building;
  }

  static async getById(id: string) {
    return db.building.findFirst({
      where: { id, deletedAt: null },
      include: {
        municipality: true,
        administrativeUnit: true,
        primaryOwnerOrg: true,
        elevators: {
          where: { deletedAt: null },
          include: {
            technicalData: { select: { serialNumber: true, elevatorType: true } },
            ...ELEVATOR_COMPLIANCE_INCLUDE,
          },
          orderBy: { registryNumber: "asc" },
        },
      },
    });
  }

  static async search(filters: {
    query?: string;
    municipalityId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 25;
    const q = filters.query?.trim();

    const where: Prisma.BuildingWhereInput = {
      deletedAt: null,
      ...(filters.municipalityId ? { municipalityId: filters.municipalityId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { buildingCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.building.findMany({
        where,
        include: {
          municipality: true,
          _count: { select: { elevators: { where: { deletedAt: null } } } },
        },
        orderBy: { address: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.building.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  static async backfillFromElevators(actorId: string) {
    const unlinked = await db.elevator.findMany({
      where: { buildingId: null, deletedAt: null },
      include: { originatingApplication: { include: { data: true } } },
    });

    let linked = 0;
    for (const elevator of unlinked) {
      const data = elevator.originatingApplication?.data;
      await this.linkElevatorToBuilding({
        elevatorId: elevator.id,
        address: elevator.buildingAddress,
        municipalityId: elevator.municipalityId,
        administrativeUnitId: elevator.administrativeUnitId,
        buildingName: elevator.buildingName,
        buildingType: data?.buildingType ?? null,
        ownerOrgId: elevator.ownerOrgId,
        gpsLatitude: elevator.gpsLatitude,
        gpsLongitude: elevator.gpsLongitude,
      });
      linked++;
    }

    await AuditService.log({
      actorId,
      action: AuditAction.UPDATE,
      entityType: "building",
      entityId: "backfill",
      afterState: { linkedCount: linked },
    });

    return { linked };
  }
}
