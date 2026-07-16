import * as XLSX from "xlsx";
import { ApplicationType, ApplicationStatus, CertificateStatus, CertificateType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  withDemoDataApplicationScope,
  withDemoDataElevatorScope,
} from "@/lib/demo/demo-data-mode";
import { NumberFormatService } from "@/lib/services/number-format-service";
import { USAGE_PURPOSE_LABELS } from "@/lib/constants/owner-labels";
import { EXAMINATION_TYPE_LABELS } from "@/lib/registration/labels";

function fmtDate(value?: Date | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("sq-AL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function examinationLabel(value?: string | null): string {
  if (!value) return "";
  return value in EXAMINATION_TYPE_LABELS
    ? EXAMINATION_TYPE_LABELS[value as keyof typeof EXAMINATION_TYPE_LABELS]
    : value;
}

/**
 * Eksporton "Regjistrin e Ashensorëve" sipas Aneksit 1 të Udhëzimit, në një workbook Excel
 * me tre sheet-et: REGJISTRI_ASHENSOREVE, PERIODIKET, NDRYSHIM_PERDITESIM.
 */
export class RegisterExportService {
  static async buildWorkbook(): Promise<Buffer> {
    const [elevators, inspections, changeApps] = await Promise.all([
      db.elevator.findMany({
        where: withDemoDataElevatorScope({ deletedAt: null }),
        include: {
          technicalData: true,
          municipality: true,
          ownerOrg: true,
          certificates: {
            where: { type: CertificateType.REGISTRATION },
            orderBy: { issuedDate: "desc" },
          },
          originatingApplication: { include: { data: true } },
        },
        orderBy: { registrationDate: "asc" },
      }),
      db.inspection.findMany({
        where: {
          conductedDate: { not: null },
          elevator: withDemoDataElevatorScope({ deletedAt: null }),
        },
        include: { elevator: { include: { technicalData: true } } },
        orderBy: { conductedDate: "asc" },
      }),
      db.application.findMany({
        where: withDemoDataApplicationScope({
          deletedAt: null,
          type: { in: [ApplicationType.DATA_CORRECTION, ApplicationType.DATA_UPDATE, ApplicationType.MODERNIZATION] },
          status: { in: [ApplicationStatus.APPROVED, ApplicationStatus.ELEVATOR_CREATED, ApplicationStatus.ASSETS_GENERATED, ApplicationStatus.CLOSED] },
        }),
        include: { targetElevator: true, data: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // ── Sheet 1: REGJISTRI_ASHENSOREVE ──
    const registryRows = elevators.map((elv, idx) => {
      // Only the ACTIVE registration certificate is authoritative; never fall back to a
      // revoked/superseded one (it would misrepresent the current register entry).
      const activeCert = elv.certificates.find((c) => c.status === CertificateStatus.ACTIVE);
      const data = elv.originatingApplication?.data;
      return {
        Nr: idx + 1,
        "Nr. i Regjistrimit": elv.registryNumber,
        "Nr. i Certifikatës": activeCert?.certificateNumber ?? "",
        Seria: NumberFormatService.classifyCertificateSeries(activeCert?.certificateNumber),
        "Data e regjistrimit": fmtDate(elv.registrationDate),
        Marka: elv.technicalData?.manufacturer ?? data?.manufacturer ?? "",
        "Nr. Serial": elv.technicalData?.serialNumber ?? data?.serialNumber ?? "",
        "Qëllimi i përdorimit": data?.usagePurpose ? USAGE_PURPOSE_LABELS[data.usagePurpose] : "",
        Vendndodhja: elv.buildingAddress,
        Bashkia: elv.municipality?.nameSq ?? "",
        "Personi Përgjegjës": data?.responsibleEntityName ?? elv.ownerOrg?.name ?? "",
        "NIPT/NID": data?.responsibleEntityIdentifier ?? elv.ownerOrg?.nipt ?? "",
        OMI: data?.omiNumber ?? "",
        "Lloji i ekzaminimit": examinationLabel(data?.examinationType),
        Statusi: elv.status,
      };
    });

    // ── Sheet 2: PERIODIKET ──
    const periodicRows = inspections.map((insp, idx) => ({
      Nr: idx + 1,
      "Nr. i Regjistrimit": insp.elevator?.registryNumber ?? "",
      Marka: insp.elevator?.technicalData?.manufacturer ?? "",
      "Nr. Serial": insp.elevator?.technicalData?.serialNumber ?? "",
      "Lloji i inspektimit": insp.type,
      "Lloji i ekzaminimit": examinationLabel(insp.examinationType),
      "Data e kryer": fmtDate(insp.conductedDate),
      Rezultati: insp.result ?? "",
      "Organi i Miratuar (OMI)": insp.approvedBodyNumber ?? "",
      "Inspektimi i ardhshëm": fmtDate(insp.nextInspectionDate),
    }));

    // ── Sheet 3: NDRYSHIM_PERDITESIM ──
    const changeTypeLabel: Partial<Record<ApplicationType, string>> = {
      [ApplicationType.DATA_CORRECTION]: "NDRYSHIM",
      [ApplicationType.DATA_UPDATE]: "PERDITESIM",
      [ApplicationType.MODERNIZATION]: "MODERNIZIM",
    };
    const describeChanges = (raw: unknown): string => {
      if (!Array.isArray(raw)) return "";
      return raw
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          const c = item as { label?: string; field?: string; oldValue?: string; newValue?: string };
          const name = c.label ?? c.field ?? "";
          return name ? `${name}: ${c.oldValue ?? ""} → ${c.newValue ?? ""}` : "";
        })
        .filter(Boolean)
        .join("; ");
    };
    const changeRows = changeApps.map((app, idx) => {
      let description = "";
      if (app.type === ApplicationType.DATA_CORRECTION) {
        description = describeChanges(app.data?.correctionFields) || (app.data?.notes ?? "");
      } else if (app.type === ApplicationType.MODERNIZATION) {
        description = app.data?.modernizationNotes ?? app.data?.notes ?? "";
      } else {
        description = describeChanges(app.data?.updateFields) || (app.data?.notes ?? "");
      }
      return {
        Nr: idx + 1,
        "Nr. i Aplikimit": app.applicationNumber,
        Lloji: changeTypeLabel[app.type] ?? app.type,
        "Nr. i Regjistrimit": app.targetElevator?.registryNumber ?? "",
        Data: fmtDate(app.createdAt),
        Përshkrim: description,
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(registryRows.length ? registryRows : [{ Nr: "" }]),
      "REGJISTRI_ASHENSOREVE",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(periodicRows.length ? periodicRows : [{ Nr: "" }]),
      "PERIODIKET",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(changeRows.length ? changeRows : [{ Nr: "" }]),
      "NDRYSHIM_PERDITESIM",
    );

    const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
  }
}
