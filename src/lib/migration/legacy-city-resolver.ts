/** Normalizon tekstin shqip për krahasim (TIRANË → TIRANE). */
export function normalizeCityKey(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .trim()
    .toUpperCase()
    .replace(/Ë/g, "E")
    .replace(/Ç/g, "C")
    .replace(/\s+/g, " ")
    .replace(/[^A-Z0-9 ]/g, "");
}

/** Emra/qode legacy → kod bashkie në sistem (geo-albania.json). */
export const CITY_TEXT_TO_MUNICIPALITY_CODE: Record<string, string> = {
  TIRANE: "TIA",
  TIRANA: "TIA",
  TR: "TIA",
  KAMEZ: "KAM",
  VORE: "VOR",
  KAVAJE: "KAV",
  KJ: "KAV",
  DURRES: "DUR",
  DR: "DUR",
  SHIJAK: "SHI",
  SUKTH: "SUK",
  ELBASAN: "ELB",
  EL: "ELB",
  BELSH: "BEL",
  FIER: "FIE",
  FR: "FIE",
  PATOS: "PAT",
  VLORE: "VLO",
  VL: "VLO",
  SARANDE: "SAR",
  SR: "SAR",
  SHKODER: "SHK",
  SH: "SHK",
  KORCE: "KOR",
  KORCA: "KOR",
  KO: "KOR",
  POGRADEC: "POG",
  PG: "POG",
  GJIROKASTER: "GJI",
  GJ: "GJI",
  BERAT: "BER",
  BR: "BER",
  KUKES: "KUK",
  KU: "KUK",
  LEZHE: "LEZ",
  LE: "LEZ",
  DIBER: "DIB",
  PESHKOPI: "DIB",
  DI: "DIB",
};

/** 36 distrikte legacy (TARGA) → bashkia më e afërt në sistem. */
export const LEGACY_DISTRICT_TO_MUNICIPALITY_CODE: Record<string, string> = {
  TR: "TIA",
  KJ: "KAV",
  DR: "DUR",
  VL: "VLO",
  SR: "SAR",
  SH: "SHK",
  LE: "LEZ",
  KO: "KOR",
  PG: "POG",
  EL: "ELB",
  FR: "FIE",
  BR: "BER",
  GJ: "GJI",
  KU: "KUK",
  DI: "DIB",
  KR: "DUR",
  LA: "DUR",
  LU: "FIE",
  GR: "ELB",
  MR: "LEZ",
  BC: "KUK",
  BZ: "DIB",
  DL: "SAR",
  DV: "KOR",
  ER: "KOR",
  HS: "KUK",
  KV: "BER",
  LB: "ELB",
  MA: "SHK",
  MK: "FIE",
  MT: "DIB",
  PE: "ELB",
  PR: "GJI",
  PU: "DIB",
  SK: "BER",
  TP: "GJI",
};

export type MunicipalityRecord = {
  id: string;
  code: string;
  nameSq: string;
  legacyRegistryCode: string | null;
};

export function parseRegistryNumber(registryNumber: string): {
  sequence: number | null;
  districtCode: string | null;
} {
  const trimmed = registryNumber.trim().toUpperCase();
  const match = trimmed.match(/^(\d+)\s+([A-Z]{2,3})$/);
  if (!match) return { sequence: null, districtCode: null };
  return { sequence: Number.parseInt(match[1], 10), districtCode: match[2] };
}

export function resolveMunicipalityCode(input: {
  qyteti: string | null | undefined;
  registryNumber: string;
}): { municipalityCode: string; method: "city-text" | "registry-district" | "fallback" } {
  const cityKey = normalizeCityKey(input.qyteti);
  if (cityKey && CITY_TEXT_TO_MUNICIPALITY_CODE[cityKey]) {
    return { municipalityCode: CITY_TEXT_TO_MUNICIPALITY_CODE[cityKey], method: "city-text" };
  }

  const { districtCode } = parseRegistryNumber(input.registryNumber);
  if (districtCode && LEGACY_DISTRICT_TO_MUNICIPALITY_CODE[districtCode]) {
    return {
      municipalityCode: LEGACY_DISTRICT_TO_MUNICIPALITY_CODE[districtCode],
      method: "registry-district",
    };
  }

  return { municipalityCode: "TIA", method: "fallback" };
}

export function buildMunicipalityLookups(municipalities: MunicipalityRecord[]) {
  const byCode = new Map(municipalities.map((m) => [m.code.toUpperCase(), m]));
  const byName = new Map(municipalities.map((m) => [normalizeCityKey(m.nameSq), m]));
  return { byCode, byName };
}

export function resolveMunicipality(
  municipalities: MunicipalityRecord[],
  input: { qyteti: string | null | undefined; registryNumber: string },
): {
  municipality: MunicipalityRecord | null;
  municipalityCode: string;
  method: string;
  originalQyteti: string | null;
} {
  const { byCode, byName } = buildMunicipalityLookups(municipalities);
  const originalQyteti = input.qyteti?.trim() || null;
  const cityKey = normalizeCityKey(input.qyteti);

  if (cityKey && byName.has(cityKey)) {
    const m = byName.get(cityKey)!;
    return { municipality: m, municipalityCode: m.code, method: "system-name", originalQyteti };
  }

  const { municipalityCode, method } = resolveMunicipalityCode(input);
  const municipality = byCode.get(municipalityCode.toUpperCase()) ?? null;
  return { municipality, municipalityCode, method, originalQyteti };
}
