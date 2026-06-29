import { db } from "@/lib/db";

export async function getMunicipalities() {
  return db.geoMunicipality.findMany({
    where: { isActive: true },
    include: { region: true },
    orderBy: { nameSq: "asc" },
  });
}

export async function getAdministrativeUnitsForMunicipality(municipalityId: string) {
  return db.geoAdministrativeUnit.findMany({
    where: { municipalityId, isActive: true },
    orderBy: { nameSq: "asc" },
    select: { id: true, nameSq: true },
  });
}
