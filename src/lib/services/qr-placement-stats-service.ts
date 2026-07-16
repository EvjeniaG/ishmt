import { ElevatorStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withDemoDataElevatorScope } from "@/lib/demo/demo-data-mode";

const ACTIVE_ELEVATOR = {
  deletedAt: null,
  status: ElevatorStatus.ACTIVE,
} as const;

function activeElevatorWhere(extra: Prisma.ElevatorWhereInput = {}) {
  return withDemoDataElevatorScope({ ...ACTIVE_ELEVATOR, ...extra });
}

const ACTIVE_QR = {
  isActive: true,
} as const;

export type QrPlacementSummary = {
  withActiveQr: number;
  placementConfirmed: number;
  placementMissing: number;
  byMunicipality: Array<{
    municipalityId: string;
    name: string;
    missing: number;
    total: number;
  }>;
};

export class QrPlacementStatsService {
  static async getNationalSummary(): Promise<QrPlacementSummary> {
    const [withActiveQr, placementConfirmed, placementMissing, grouped] = await Promise.all([
      db.elevator.count({
        where: activeElevatorWhere({
          qrCodes: { some: ACTIVE_QR },
        }),
      }),
      db.elevator.count({
        where: activeElevatorWhere({
          qrCodes: {
            some: {
              ...ACTIVE_QR,
              placementPhotoDocumentId: { not: null },
            },
          },
        }),
      }),
      db.elevator.count({
        where: activeElevatorWhere({
          qrCodes: {
            some: {
              ...ACTIVE_QR,
              placementPhotoDocumentId: null,
            },
          },
        }),
      }),
      db.elevator.groupBy({
        by: ["municipalityId"],
        _count: { municipalityId: true },
        where: activeElevatorWhere({
          qrCodes: {
            some: {
              ...ACTIVE_QR,
              placementPhotoDocumentId: null,
            },
          },
        }),
        orderBy: { _count: { municipalityId: "desc" } },
        take: 15,
      }),
    ]);

    const municipalityIds = grouped.map((g) => g.municipalityId);
    const municipalities = await db.geoMunicipality.findMany({
      where: { id: { in: municipalityIds } },
      select: { id: true, nameSq: true },
    });
    const munMap = new Map(municipalities.map((m) => [m.id, m.nameSq]));

    const totalsByMun = await db.elevator.groupBy({
      by: ["municipalityId"],
      _count: { municipalityId: true },
      where: activeElevatorWhere({
        municipalityId: { in: municipalityIds },
        qrCodes: { some: ACTIVE_QR },
      }),
    });
    const totalMap = new Map(totalsByMun.map((t) => [t.municipalityId, t._count.municipalityId]));

    return {
      withActiveQr,
      placementConfirmed,
      placementMissing,
      byMunicipality: grouped.map((g) => ({
        municipalityId: g.municipalityId,
        name: munMap.get(g.municipalityId) ?? g.municipalityId,
        missing: g._count.municipalityId,
        total: totalMap.get(g.municipalityId) ?? g._count.municipalityId,
      })),
    };
  }
}
