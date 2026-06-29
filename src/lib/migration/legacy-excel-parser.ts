import * as XLSX from "xlsx";
import { readFileSync } from "fs";

export type LegacyRegistryRow = {
  sourceFile: string;
  sourceRow: number;
  nrRendor: string | null;
  registryNumber: string;
  registrationDate: Date | null;
  muaji: string | null;
  viti: string | null;
  serialNumber: string | null;
  marka: string | null;
  qellimiPerdorimit: string | null;
  tipiGodines: string | null;
  vendodhja: string | null;
  qyteti: string | null;
  personiPergjegjes: string | null;
  ownerNipt: string | null;
  instaluesi: string | null;
  installerNipt: string | null;
  omiNumber: string | null;
  llojiEkzaminimit: string | null;
  examinationDate: Date | null;
  vitiInstalimit: string | null;
  protocolNumber: string | null;
  caCr: string | null;
  komente: string | null;
  chiefInspector: string | null;
  nenshkrimi: string | null;
  raw: Record<string, string | null>;
};

export type LegacyPeriodicEntry = {
  registryNumber: string;
  semesterLabel: string;
  trupa: string | null;
  raporti: string | null;
  data: Date | null;
  muaji: string | null;
};

function cellStr(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s || s === "-") return null;
  return s;
}

function parseDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    if (y < 1990 || y > 2100) return null;
    return value;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y >= 1990 && parsed.y <= 2100) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
    return null;
  }
  const s = String(value).trim();
  if (!s || s === "-") return null;
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) {
    const y = Number(dmy[3]);
    if (y < 1990 || y > 2100) return null;
    const d = new Date(y, Number(dmy[2]) - 1, Number(dmy[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(s);
  if (Number.isNaN(iso.getTime())) return null;
  const y = iso.getFullYear();
  if (y < 1990 || y > 2100) return null;
  return iso;
}

function parseRegistrationDate(
  dateValue: unknown,
  muaji: string | null | undefined,
  viti: string | null | undefined,
): Date | null {
  const parsed = parseDate(dateValue);
  if (parsed) return parsed;

  const dayNum = Number.parseInt(String(dateValue ?? "").trim(), 10);
  const yearNum = typeof viti === "number" ? viti : Number.parseInt(String(viti ?? "").trim(), 10);
  const monthKey = normalizeMonthKey(muaji);
  if (dayNum >= 1 && dayNum <= 31 && yearNum >= 1990 && yearNum <= 2100 && monthKey != null) {
    const d = new Date(yearNum, monthKey, dayNum);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const MONTH_KEYS: Record<string, number> = {
  JANAR: 0,
  SHKURT: 1,
  MARS: 2,
  PRILL: 3,
  MAJ: 4,
  QERSHOR: 5,
  KORRIK: 6,
  GUSHT: 7,
  SHTATOR: 8,
  TETOR: 9,
  NENTOR: 10,
  NËNTOR: 10,
  DHJETOR: 11,
};

function normalizeMonthKey(muaji: string | null | undefined): number | null {
  if (!muaji) return null;
  const key = muaji
    .trim()
    .toUpperCase()
    .replace(/Ë/g, "E")
    .replace(/Ç/g, "C");
  return MONTH_KEYS[key] ?? null;
}

function parseFile09Row(row: unknown[], rowIndex: number): LegacyRegistryRow | null {
  const registryNumber = cellStr(row[1]);
  if (!registryNumber) return null;

  const muaji = cellStr(row[3]);
  const vitiRaw = row[4];
  const viti = vitiRaw != null ? String(vitiRaw).trim() : null;

  return {
    sourceFile: "09_ISHMT_REGJISTRI_ASHENSOREVE.xlsm",
    sourceRow: rowIndex,
    nrRendor: cellStr(row[0]),
    registryNumber,
    registrationDate: parseRegistrationDate(row[2], muaji, viti),
    muaji,
    viti,
    serialNumber: cellStr(row[5]),
    marka: cellStr(row[6]),
    qellimiPerdorimit: cellStr(row[7]),
    tipiGodines: cellStr(row[8]),
    vendodhja: cellStr(row[9]),
    qyteti: cellStr(row[10]),
    personiPergjegjes: cellStr(row[11]),
    ownerNipt: cellStr(row[12]),
    instaluesi: cellStr(row[13]),
    installerNipt: cellStr(row[14]),
    omiNumber: cellStr(row[15]),
    llojiEkzaminimit: cellStr(row[16]),
    examinationDate: parseDate(row[17]),
    vitiInstalimit: cellStr(row[18]),
    protocolNumber: cellStr(row[19]),
    caCr: cellStr(row[20]),
    komente: cellStr(row[21]),
    chiefInspector: cellStr(row[22]),
    nenshkrimi: null,
    raw: {},
  };
}

function parseFile10Row(row: unknown[], rowIndex: number): Partial<LegacyRegistryRow> | null {
  const registryNumber = cellStr(row[1]);
  if (!registryNumber) return null;
  return {
    sourceFile: "10_ISHMT_REGJISTRI_ASHENSOREVE_PERIODIKET.xlsx",
    sourceRow: rowIndex,
    registryNumber,
    registrationDate: parseDate(row[2]),
    nenshkrimi: cellStr(row[20]),
  };
}

export function parseLegacyRegistryFile09(filePath: string): LegacyRegistryRow[] {
  const wb = XLSX.read(readFileSync(filePath), { type: "buffer", cellDates: true });
  const sheet = wb.Sheets.DATA;
  if (!sheet) throw new Error("Mungon faqja DATA në skedarin 09");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const out: LegacyRegistryRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const parsed = parseFile09Row(rows[i] as unknown[], i + 1);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function parseLegacyRegistryOverlayFile10(filePath: string): Map<string, Partial<LegacyRegistryRow>> {
  const wb = XLSX.read(readFileSync(filePath), { type: "buffer", cellDates: true });
  const sheet = wb.Sheets.REGJISTRI_ASHENSOREVE;
  if (!sheet) throw new Error("Mungon faqja REGJISTRI_ASHENSOREVE në skedarin 10");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const map = new Map<string, Partial<LegacyRegistryRow>>();
  for (let i = 2; i < rows.length; i++) {
    const parsed = parseFile10Row(rows[i] as unknown[], i + 1);
    if (parsed?.registryNumber) map.set(parsed.registryNumber.trim().toUpperCase(), parsed);
  }
  return map;
}

export function parseLegacyPeriodicFile10(filePath: string): LegacyPeriodicEntry[] {
  const wb = XLSX.read(readFileSync(filePath), { type: "buffer", cellDates: true });
  const sheet = wb.Sheets.PERIODIKET;
  if (!sheet) throw new Error("Mungon faqja PERIODIKET në skedarin 10");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const headerRow = (rows[0] ?? []) as unknown[];
  const blockStarts: { col: number; label: string }[] = [];
  for (let c = 0; c < headerRow.length; c++) {
    const label = cellStr(headerRow[c]);
    if (label && /20\d{2}/.test(label)) blockStarts.push({ col: c, label });
  }

  const entries: LegacyPeriodicEntry[] = [];
  for (let r = 2; r < rows.length; r++) {
    const row = rows[r] as unknown[];
    const registryNumber = cellStr(row[0]);
    if (!registryNumber) continue;

    for (const block of blockStarts) {
      const trupa = cellStr(row[block.col]);
      const raporti = cellStr(row[block.col + 1]);
      const data = parseDate(row[block.col + 2]);
      const muaji = cellStr(row[block.col + 3]);
      if (!trupa && !raporti && !data && !muaji) continue;
      entries.push({
        registryNumber,
        semesterLabel: block.label,
        trupa,
        raporti,
        data,
        muaji,
      });
    }
  }
  return entries;
}
