import * as XLSX from "xlsx";
import type { IshmtContractIssueRow } from "@/lib/services/ishmt-contract-monitor-service";

const SEVERITY_LABELS = {
  critical: "Kritike",
  warning: "Monitorim",
  info: "Info",
} as const;

function fmtDate(value: Date | null): string {
  if (!value) return "";
  return value.toLocaleDateString("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export class IshmtContractExportService {
  static buildWorkbook(rows: IshmtContractIssueRow[]): Buffer {
    const sheetRows = rows.map((row, index) => ({
      Nr: index + 1,
      Prioriteti: SEVERITY_LABELS[row.severity],
      Regjistri: row.registryNumber,
      Adresa: row.buildingAddress,
      Bashkia: row.municipality,
      Problemi: row.issueLabel,
      "Personi përgjegjës": row.ownerName,
      NIPT: row.ownerNipt ?? "",
      Mirëmbajtja: row.maintenanceCompany ?? "",
      OMI: row.inspectionCompany ?? "",
      Skadimi: fmtDate(row.dueDate),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetRows);
    XLSX.utils.book_append_sheet(wb, ws, "Alarmet");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }
}
