import { ComplianceIndicator, ElevatorStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { withDemoDataElevatorScope } from "@/lib/demo/demo-data-mode";
import {
  computeElevatorComplianceIndicator,
  ELEVATOR_COMPLIANCE_INCLUDE,
} from "@/lib/elevators/elevator-compliance-stats";
import { MUNICIPALITY_COORDINATES } from "@/lib/data/municipality-coordinates";

export type GeoFilters = {
  regionId?: string;
  municipalityId?: string;
  status?: ElevatorStatus;
  compliance?: ComplianceIndicator;
};

export type MunicipalityRow = {
  municipalityId: string;
  code: string;
  name: string;
  regionName: string;
  total: number;
  green: number;
  yellow: number;
  red: number;
  active: number;
  attention: number;
  lat: number | null;
  lng: number | null;
};

export class ChiefGeoService {
  static async getFilterOptions() {
    const [regions, municipalities] = await Promise.all([
      db.geoRegion.findMany({
        where: { isActive: true },
        select: { id: true, nameSq: true },
        orderBy: { nameSq: "asc" },
      }),
      db.geoMunicipality.findMany({
        where: { isActive: true },
        select: { id: true, nameSq: true, regionId: true },
        orderBy: { nameSq: "asc" },
      }),
    ]);
    return { regions, municipalities };
  }

  static async getByMunicipality(filters: GeoFilters = {}) {
    const where: Prisma.ElevatorWhereInput = { deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.municipalityId) where.municipalityId = filters.municipalityId;
    if (filters.regionId) where.municipality = { regionId: filters.regionId };

    const elevators = await db.elevator.findMany({
      where: withDemoDataElevatorScope(where),
      include: {
        municipality: {
          select: { code: true, nameSq: true, region: { select: { nameSq: true } } },
        },
        ...ELEVATOR_COMPLIANCE_INCLUDE,
      },
    });

    const map = new Map<string, MunicipalityRow & { gpsLat: number[]; gpsLng: number[] }>();

    for (const e of elevators) {
      const indicator = computeElevatorComplianceIndicator(e);
      if (filters.compliance && indicator !== filters.compliance) continue;

      const key = e.municipalityId;
      let row = map.get(key);
      if (!row) {
        row = {
          municipalityId: key,
          code: e.municipality.code,
          name: e.municipality.nameSq,
          regionName: e.municipality.region.nameSq,
          total: 0,
          green: 0,
          yellow: 0,
          red: 0,
          active: 0,
          attention: 0,
          lat: null,
          lng: null,
          gpsLat: [],
          gpsLng: [],
        };
        map.set(key, row);
      }

      row.total++;
      if (indicator === ComplianceIndicator.GREEN) row.green++;
      else if (indicator === ComplianceIndicator.YELLOW) row.yellow++;
      else row.red++;

      if (e.status === ElevatorStatus.ACTIVE) row.active++;
      if (indicator === ComplianceIndicator.RED) row.attention++;

      if (e.gpsLatitude && e.gpsLongitude) {
        row.gpsLat.push(Number(e.gpsLatitude));
        row.gpsLng.push(Number(e.gpsLongitude));
      }
    }

    const rows: MunicipalityRow[] = [...map.values()].map((row) => {
      const { gpsLat, gpsLng, ...rest } = row;
      let lat: number | null = null;
      let lng: number | null = null;

      if (gpsLat.length > 0) {
        lat = gpsLat.reduce((a, b) => a + b, 0) / gpsLat.length;
        lng = gpsLng.reduce((a, b) => a + b, 0) / gpsLng.length;
      } else {
        const centroid = MUNICIPALITY_COORDINATES[rest.code];
        if (centroid) {
          lat = centroid.lat;
          lng = centroid.lng;
        }
      }

      return { ...rest, lat, lng };
    });

    rows.sort((a, b) => b.total - a.total);

    const totals = rows.reduce(
      (acc, r) => {
        acc.total += r.total;
        acc.green += r.green;
        acc.yellow += r.yellow;
        acc.red += r.red;
        acc.active += r.active;
        acc.attention += r.attention;
        return acc;
      },
      { total: 0, green: 0, yellow: 0, red: 0, active: 0, attention: 0 },
    );

    return { rows, totals };
  }
}
