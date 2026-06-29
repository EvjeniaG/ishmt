import { NextResponse } from "next/server";
import { getAdministrativeUnitsForMunicipality } from "@/lib/data/municipalities";

export async function GET(request: Request) {
  const municipalityId = new URL(request.url).searchParams.get("municipalityId");
  if (!municipalityId) {
    return NextResponse.json({ error: "municipalityId mungon" }, { status: 400 });
  }

  const units = await getAdministrativeUnitsForMunicipality(municipalityId);
  return NextResponse.json(units);
}
