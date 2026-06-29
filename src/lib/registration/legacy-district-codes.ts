export type LegacyDistrict = {
  code: string;
  name: string;
};

/** Kodet zyrtare të distrikteve (Aneksi 1 / regjistri legacy). */
export const LEGACY_DISTRICT_CODES: LegacyDistrict[] = [
  { code: "BC", name: "TROPOJË" },
  { code: "BR", name: "BERAT" },
  { code: "BZ", name: "BULQIZË" },
  { code: "DI", name: "DIBËR" },
  { code: "DL", name: "DELVINË" },
  { code: "DR", name: "DURRËS" },
  { code: "DV", name: "DEVOLL" },
  { code: "EL", name: "ELBASAN" },
  { code: "ER", name: "KOLONJË" },
  { code: "FR", name: "FIER" },
  { code: "GJ", name: "GJIROKASTËR" },
  { code: "GR", name: "GRAMSH" },
  { code: "HS", name: "HAS" },
  { code: "KJ", name: "KAVAJË" },
  { code: "KO", name: "KORÇË" },
  { code: "KR", name: "KRUJË" },
  { code: "KU", name: "KUKËS" },
  { code: "KV", name: "KUÇOVË" },
  { code: "LA", name: "KURBIN" },
  { code: "LB", name: "LIBRAZHD" },
  { code: "LE", name: "LEZHË" },
  { code: "LU", name: "LUSHNJË" },
  { code: "MA", name: "MALËSI E MADHE" },
  { code: "MK", name: "MALLAKASTËR" },
  { code: "MR", name: "MIRDITË" },
  { code: "MT", name: "MAT" },
  { code: "PE", name: "PEQIN" },
  { code: "PG", name: "POGRADEC" },
  { code: "PR", name: "PËRMET" },
  { code: "PU", name: "PUKË" },
  { code: "SH", name: "SHKODËR" },
  { code: "SK", name: "SKRAPAR" },
  { code: "SR", name: "SARANDË" },
  { code: "TP", name: "TEPELENË" },
  { code: "TR", name: "TIRANA" },
  { code: "VL", name: "VLORË" },
];

export function findLegacyDistrict(code: string | null | undefined): LegacyDistrict | undefined {
  if (!code) return undefined;
  const normalized = code.trim().toUpperCase();
  return LEGACY_DISTRICT_CODES.find((d) => d.code === normalized);
}

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function filterLegacyDistricts(query: string): LegacyDistrict[] {
  const q = query.trim().toUpperCase();
  if (!q) return LEGACY_DISTRICT_CODES;
  return LEGACY_DISTRICT_CODES.filter(
    (d) =>
      d.code.includes(q) ||
      d.name.toUpperCase().includes(q) ||
      stripDiacritics(d.name).toUpperCase().includes(q),
  );
}
