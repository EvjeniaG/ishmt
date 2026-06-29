/** Mapim bashki → kod distrikti legacy (36 distrikte, Aneksi 1). */
export const MUNICIPALITY_LEGACY_DISTRICT_BY_CODE: Record<string, string> = {
  TIA: "TR",
  KAM: "TR",
  VOR: "TR",
  KAV: "KJ",
  DUR: "DR",
  SHI: "DR",
  SUK: "DR",
  ELB: "EL",
  BEL: "EL",
  FIE: "FR",
  PAT: "MK",
  VLO: "VL",
  SAR: "SR",
  SHK: "SH",
  KOR: "KO",
  POG: "PG",
  GJI: "GJ",
  BER: "BR",
  KUK: "KU",
  LEZ: "LE",
  DIB: "DI",
};

export function resolveLegacyDistrictCode(municipality: {
  code?: string | null;
  legacyRegistryCode?: string | null;
}): string {
  const munCode = municipality.code?.trim().toUpperCase();
  if (munCode && MUNICIPALITY_LEGACY_DISTRICT_BY_CODE[munCode]) {
    return MUNICIPALITY_LEGACY_DISTRICT_BY_CODE[munCode];
  }
  return municipality.legacyRegistryCode?.trim().toUpperCase() ?? "";
}
