import * as XLSX from "xlsx";
import { CertificateStatus, CertificateType } from "@prisma/client";
import { db } from "@/lib/db";
import { labelElevatorStatus } from "@/lib/constants/display-labels";
import { USAGE_PURPOSE_LABELS } from "@/lib/constants/owner-labels";
import {
  extractLegacyPeriodicComments,
  formatInspectionFindings,
  isLegacyImportFindings,
} from "@/lib/elevators/format-inspection-findings";
import { resolveElevatorComplianceView } from "@/lib/elevators/resolve-elevator-compliance";
import { EXAMINATION_TYPE_LABELS } from "@/lib/registration/labels";
import type { AuthContext } from "@/lib/permissions/guards";
import { ComplianceService } from "@/lib/services/compliance-service";
import {
  IshmtSearchService,
  type ComplianceGapFilter,
  type NationalSearchFilters,
} from "@/lib/services/ishmt-search-service";
import { QrService } from "@/lib/services/qr-service";
import { AuditService } from "@/lib/audit/audit-service";
import { AuditAction } from "@prisma/client";

function fmtDate(value?: Date | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("sq-AL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function examinationLabel(value?: string | null): string {
  if (!value) return "";
  return value in EXAMINATION_TYPE_LABELS
    ? EXAMINATION_TYPE_LABELS[value as keyof typeof EXAMINATION_TYPE_LABELS]
    : value;
}

function inspectionFindingsText(findings: string | null): string {
  if (!findings?.trim()) return "";
  if (isLegacyImportFindings(findings)) {
    return extractLegacyPeriodicComments(findings) ?? "";
  }
  return formatInspectionFindings(findings) ?? "";
}

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  INITIAL: "Fillestar",
  PERIODIC: "Periodik",
  EXTRAORDINARY: "Jashtëzakonshme",
  RE_INSPECTION: "Rinspektim",
};

const INSPECTION_RESULT_LABELS: Record<string, string> = {
  PASS: "Kalues",
  FAIL: "Jo kalues",
  CONDITIONAL: "Me kushte",
  PENDING: "Në pritje",
};

export class NationalRegistryExportService {
  static async buildFilteredWorkbook(
    ctx: AuthContext,
    filters: Omit<NationalSearchFilters, "page" | "pageSize">,
  ): Promise<{ buffer: Buffer; rowCount: number }> {
    const matches = await IshmtSearchService.listAllMatchingElevators(ctx, filters);
    const ids = matches.map((m) => m.id);

    if (ids.length === 0) {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet([{ Mesazh: "Asnjë regjistrim për filtrat" }]),
        "ASHENSORE",
      );
      const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return { buffer: Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer), rowCount: 0 };
    }

    const elevators = await db.elevator.findMany({
      where: { id: { in: ids } },
      include: {
        municipality: true,
        administrativeUnit: true,
        ownerOrg: true,
        installerOrg: true,
        certifierOrg: true,
        maintenanceOrg: true,
        technicalData: true,
        originatingApplication: { include: { data: true } },
        certificates: { orderBy: { issuedDate: "desc" } },
        qrCodes: { where: { isActive: true }, take: 1 },
        inspections: { orderBy: [{ conductedDate: "desc" }, { scheduledDate: "desc" }] },
        maintenanceContracts: {
          where: { isActive: true },
          include: { maintenanceOrg: { select: { name: true, nipt: true } } },
        },
        maintenanceCompliance: true,
        maintenanceRecords: { orderBy: { performedDate: "desc" }, take: 1 },
        complianceIndicator: true,
      },
      orderBy: { registryNumber: "asc" },
    });

    const elevatorRows = elevators.map((elv, idx) => {
      const data = elv.originatingApplication?.data;
      const regCert =
        elv.certificates.find((c) => c.type === CertificateType.REGISTRATION && c.status === CertificateStatus.ACTIVE) ??
        elv.certificates.find((c) => c.type === CertificateType.REGISTRATION);
      const qr = elv.qrCodes[0];
      const lastInspection = elv.inspections.find((i) => i.conductedDate) ?? elv.inspections[0];
      const maintContract = elv.maintenanceContracts.find((c) => c.serviceType === "MAINTENANCE");
      const inspectionContract = elv.maintenanceContracts.find((c) => c.serviceType === "PERIODIC_INSPECTION");
      const lastMaint = elv.maintenanceRecords[0];

      const complianceView = resolveElevatorComplianceView({
        status: elv.status,
        maintenanceOrgId: elv.maintenanceOrgId,
        inspections: elv.inspections,
        maintenanceRecords: elv.maintenanceRecords,
        maintenanceCompliance: elv.maintenanceCompliance,
        complianceIndicator: elv.complianceIndicator,
        certificates: regCert ? [regCert] : [],
      });

      return {
        Nr: idx + 1,
        "Nr. regjistrimi": elv.registryNumber,
        Statusi: labelElevatorStatus(elv.status),
        Adresa: elv.buildingAddress,
        Bashkia: elv.municipality.nameSq,
        "Njësia admin.": elv.administrativeUnit?.nameSq ?? "",
        "Lloji ashensori": elv.technicalData?.elevatorType ?? "",
        Marka: elv.technicalData?.manufacturer ?? data?.manufacturer ?? "",
        "Nr. serial": elv.technicalData?.serialNumber ?? data?.serialNumber ?? "",
        "Viti prodhimit": elv.technicalData?.manufacturingYear ?? data?.manufacturingYear ?? "",
        "Katet e shërbyer": elv.technicalData?.floorsServed ?? "",
        "Qëllimi përdorimit": data?.usagePurpose ? USAGE_PURPOSE_LABELS[data.usagePurpose] : "",
        "Data regjistrimit": fmtDate(elv.registrationDate),
        "Data aktivizimit": fmtDate(elv.activationDate),
        "Personi përgjegjës": data?.responsibleEntityName ?? elv.ownerOrg.name,
        "NIPT/NID pronari": data?.responsibleEntityIdentifier ?? elv.ownerOrg.nipt ?? "",
        Instaluesi: elv.installerOrg.name,
        "NIPT instaluesi": elv.installerOrg.nipt ?? "",
        Certifikuesi: elv.certifierOrg.name,
        "Trupi OM (regjistrim)": data?.omiNumber ?? "",
        "Lloji ekzaminimit": examinationLabel(data?.examinationType),
        "Kompania mirëmbajtjes": elv.maintenanceOrg?.name ?? maintContract?.maintenanceOrg.name ?? "",
        "Kontrata mirëmbajtjes": maintContract?.contractNumber ?? "",
        "Kompania inspektimit (OM)": inspectionContract?.maintenanceOrg.name ?? "",
        "Kontrata inspektimit": inspectionContract?.contractNumber ?? "",
        "Nr. certifikate CR": regCert?.certificateNumber ?? "",
        "Data certifikate": fmtDate(regCert?.issuedDate),
        "Skadimi certifikate": fmtDate(regCert?.expiryDate),
        "Kodi QR": qr?.code ?? "",
        "URL publike QR": qr?.code ? QrService.buildPublicUrl(qr.code) : "",
        "Foto vendosjeje QR": qr?.placementPhotoDocumentId ? "Po" : "Jo",
        "Data konfirmimit QR": fmtDate(qr?.placementConfirmedAt),
        Përputhshmëria: ComplianceService.getLabel(complianceView.indicator),
        "Mungesat përputhshmërie": complianceView.gaps.map((g) => g.title).join("; "),
        "Inspektimi i fundit (lloji)": lastInspection
          ? (INSPECTION_TYPE_LABELS[lastInspection.type] ?? lastInspection.type)
          : "",
        "Inspektimi i fundit (data)": fmtDate(lastInspection?.conductedDate),
        "Inspektimi i fundit (rezultati)":
          lastInspection?.result ?? lastInspection?.status
            ? (INSPECTION_RESULT_LABELS[(lastInspection.result ?? lastInspection.status) as string] ??
              (lastInspection.result ?? lastInspection.status))
            : "",
        "Inspektimi i radhës": fmtDate(lastInspection?.nextInspectionDate),
        "Mirëmbajtja e fundit": fmtDate(lastMaint?.performedDate ?? elv.maintenanceCompliance?.lastMaintenanceDate),
        "Afati mirëmbajtjes": fmtDate(elv.maintenanceCompliance?.nextDueDate),
        "Kërkon vëmendje": elv.requiresAttention ? "Po" : "Jo",
        "Nr. aplikimit origjinal": elv.originatingApplication?.applicationNumber ?? "",
      };
    });

    const inspectionRows: Record<string, string | number>[] = [];
    for (const elv of elevators) {
      for (const insp of elv.inspections) {
        inspectionRows.push({
          "Nr. regjistrimi": elv.registryNumber,
          Lloji: INSPECTION_TYPE_LABELS[insp.type] ?? insp.type,
          Rezultati:
            INSPECTION_RESULT_LABELS[(insp.result ?? insp.status) as string] ?? insp.result ?? insp.status,
          "Data e kryerjes": fmtDate(insp.conductedDate),
          "Inspektimi i radhës": fmtDate(insp.nextInspectionDate),
          "Trupi OM": insp.approvedBodyNumber ?? "",
          "Lloji ekzaminimit": examinationLabel(insp.examinationType),
          Shënime: inspectionFindingsText(insp.findings),
        });
      }
    }

    const certificateRows: Record<string, string>[] = [];
    for (const elv of elevators) {
      for (const cert of elv.certificates) {
        certificateRows.push({
          "Nr. regjistrimi": elv.registryNumber,
          "Nr. certifikate": cert.certificateNumber,
          Lloji: cert.type,
          Statusi: cert.status,
          "Data lëshimit": fmtDate(cert.issuedDate),
          Skadimi: fmtDate(cert.expiryDate),
        });
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(elevatorRows.length ? elevatorRows : [{ Nr: "" }]),
      "ASHENSORE",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(inspectionRows.length ? inspectionRows : [{ "Nr. regjistrimi": "" }]),
      "INSPEKTIMET",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(certificateRows.length ? certificateRows : [{ "Nr. regjistrimi": "" }]),
      "CERTIFIKATAT",
    );

    await AuditService.log({
      actorId: ctx.userId,
      action: AuditAction.VIEW_SENSITIVE_RECORD,
      entityType: "national_registry_export",
      entityId: ctx.userId,
      metadata: { filters, rowCount: elevators.length },
    });

    const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return {
      buffer: Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer),
      rowCount: elevators.length,
    };
  }
}
