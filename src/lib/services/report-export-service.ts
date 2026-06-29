import {
  ApplicationStatus,
  ApplicationType,
  CitizenReportStatus,
  ComplianceIndicator,
  ElevatorStatus,
  FieldInspectionAssignmentStatus,
  OrgType,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import {
  computeElevatorComplianceIndicator,
  ELEVATOR_COMPLIANCE_INCLUDE,
} from "@/lib/elevators/elevator-compliance-stats";
import { labelElevatorStatus } from "@/lib/constants/display-labels";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";
import { APPLICATION_TYPE_LABELS } from "@/lib/constants/application-labels";
import {
  CITIZEN_REPORT_STATUS_LABELS,
  CITIZEN_REPORT_TYPE_LABELS,
} from "@/lib/registration/report-labels";
import { FIELD_INSPECTION_STATUS_LABELS } from "@/lib/ishmt/field-inspection-labels";
import { ComplianceService } from "@/lib/services/compliance-service";
import { ElevatorService } from "@/lib/services/elevator-service";
import { ApplicationService } from "@/lib/services/application-service";
import { ReportingService } from "@/lib/services/reporting-service";
import { IshmtFieldInspectionService } from "@/lib/services/ishmt-field-inspection-service";
import type { AuthContext } from "@/lib/permissions/guards";
import { hasPermission } from "@/lib/permissions/guards";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { ROLE_CODES } from "@/lib/constants/roles";
import {
  getReportDefinition,
  isReportAllowed,
  type ReportId,
} from "@/lib/reports/report-catalog";
import type { ExportColumn, ExportRow } from "@/lib/reports/csv-builder";

export type ReportExportFilters = Record<string, string | undefined>;

export type ReportExportPayload = {
  title: string;
  filenameBase: string;
  columns: ExportColumn[];
  rows: ExportRow[];
};

const MAX_ROWS = 5000;

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function parseDateFilter(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export class ReportExportService {
  static async build(
    ctx: AuthContext,
    reportId: ReportId,
    filters: ReportExportFilters,
  ): Promise<ReportExportPayload> {
    if (!isReportAllowed(ctx, reportId)) {
      throw new Error("Nuk keni leje për këtë raport.");
    }

    switch (reportId) {
      case "elevators":
        return this.exportElevators(ctx, filters);
      case "applications":
        return this.exportApplications(ctx, filters);
      case "citizen_reports":
        return this.exportCitizenReports(filters);
      case "maintenance_records":
        return this.exportMaintenanceRecords(ctx, filters);
      case "inspections":
        return this.exportInspections(ctx, filters);
      case "field_inspections":
        return this.exportFieldInspections(ctx, filters);
      case "compliance_summary":
        return this.exportComplianceSummary();
      case "companies":
        return this.exportCompanies(filters);
      default:
        throw new Error("Lloji i raportit nuk njihet.");
    }
  }

  private static async exportElevators(
    ctx: AuthContext,
    filters: ReportExportFilters,
  ): Promise<ReportExportPayload> {
    const columns: ExportColumn[] = [
      { key: "registryNumber", label: "Nr. regjistrit" },
      { key: "status", label: "Statusi" },
      { key: "compliance", label: "Përputhshmëria" },
      { key: "municipality", label: "Bashkia" },
      { key: "address", label: "Adresa" },
      { key: "owner", label: "Personi përgjegjës i ashensorit" },
      { key: "serialNumber", label: "Seriali" },
      { key: "registrationDate", label: "Data regjistrimit" },
    ];

    let rows: ExportRow[] = [];

    if (hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL)) {
      const data = await ReportingService.exportElevatorsCsv({
        municipalityId: filters.municipalityId,
        status: filters.status as ElevatorStatus | undefined,
      });
      rows = data.map((e) => ({
        registryNumber: e.registryNumber,
        status: labelElevatorStatus(e.status),
        compliance: ComplianceService.getLabel(e.compliance as ComplianceIndicator),
        municipality: e.municipality,
        address: e.address ?? "",
        owner: e.owner,
        serialNumber: e.serialNumber,
        registrationDate: e.registrationDate,
      }));
      if (filters.compliance) {
        const label = ComplianceService.getLabel(filters.compliance as ComplianceIndicator);
        rows = rows.filter((r) => r.compliance === label);
      }
    } else if (ctx.roleCode === ROLE_CODES.OWNER && ctx.activeOrgId) {
      const elevators = await ElevatorService.listForOwner(ctx.activeOrgId, {
        status: filters.status,
        municipalityId: filters.municipalityId,
        complianceIndicator: filters.compliance,
      });
      rows = elevators.map((e) => ({
        registryNumber: e.registryNumber,
        status: labelElevatorStatus(e.status),
        compliance: ComplianceService.getLabel(computeElevatorComplianceIndicator(e)),
        municipality: e.municipality.nameSq,
        address: e.buildingAddress ?? "",
        owner: ctx.activeOrgName ?? "",
        serialNumber: e.technicalData?.serialNumber ?? "",
        registrationDate: fmtDate(e.registrationDate),
      }));
    } else {
      const orgField =
        ctx.roleCode === ROLE_CODES.MAINTENANCE
          ? "maintenanceOrgId"
          : ctx.roleCode === ROLE_CODES.INSTALLER
            ? "installerOrgId"
            : ctx.roleCode === ROLE_CODES.CERTIFIER
              ? "certifierOrgId"
              : null;

      if (!orgField || !ctx.activeOrgId) {
        throw new Error("Nuk u gjet organizata aktive për eksport.");
      }

      const elevators = await db.elevator.findMany({
        where: {
          deletedAt: null,
          [orgField]: ctx.activeOrgId,
          ...(filters.status ? { status: filters.status as ElevatorStatus } : {}),
          ...(filters.municipalityId ? { municipalityId: filters.municipalityId } : {}),
        },
        include: {
          municipality: { select: { nameSq: true } },
          ownerOrg: { select: { name: true } },
          technicalData: { select: { serialNumber: true } },
          ...ELEVATOR_COMPLIANCE_INCLUDE,
        },
        orderBy: { registryNumber: "asc" },
        take: MAX_ROWS,
      });

      rows = elevators
        .filter((e) =>
          filters.compliance
            ? computeElevatorComplianceIndicator(e) === filters.compliance
            : true,
        )
        .map((e) => ({
          registryNumber: e.registryNumber,
          status: labelElevatorStatus(e.status),
          compliance: ComplianceService.getLabel(computeElevatorComplianceIndicator(e)),
          municipality: e.municipality.nameSq,
          address: e.buildingAddress ?? "",
          owner: e.ownerOrg.name,
          serialNumber: e.technicalData?.serialNumber ?? "",
          registrationDate: fmtDate(e.registrationDate),
        }));
    }

    return {
      title: getReportDefinition("elevators").label,
      filenameBase: "ashensore",
      columns,
      rows,
    };
  }

  private static async exportApplications(
    ctx: AuthContext,
    filters: ReportExportFilters,
  ): Promise<ReportExportPayload> {
    const columns: ExportColumn[] = [
      { key: "applicationNumber", label: "Nr. aplikimit" },
      { key: "type", label: "Lloji" },
      { key: "status", label: "Statusi" },
      { key: "owner", label: "Personi përgjegjës i ashensorit" },
      { key: "address", label: "Adresa" },
      { key: "submittedAt", label: "Data parashtrimit" },
      { key: "createdAt", label: "Data krijimit" },
    ];

    const apps = await ApplicationService.listForContext(ctx, {
      status: filters.status as ApplicationStatus | undefined,
      dateFrom: parseDateFilter(filters.dateFrom),
      dateTo: parseDateFilter(filters.dateTo),
    });

    const rows: ExportRow[] = apps.slice(0, MAX_ROWS).map((a) => ({
      applicationNumber: a.applicationNumber,
      type: APPLICATION_TYPE_LABELS[a.type as ApplicationType] ?? a.type,
      status: APPLICATION_STATUS_LABELS[a.status as ApplicationStatus] ?? a.status,
      owner: a.ownerOrg?.name ?? "",
      address: a.data?.buildingAddress ?? "",
      submittedAt: fmtDate(a.submittedAt),
      createdAt: fmtDate(a.createdAt),
    }));

    return {
      title: getReportDefinition("applications").label,
      filenameBase: "aplikime",
      columns,
      rows,
    };
  }

  private static async exportCitizenReports(
    filters: ReportExportFilters,
  ): Promise<ReportExportPayload> {
    const columns: ExportColumn[] = [
      { key: "reportNumber", label: "Nr. raportit" },
      { key: "type", label: "Lloji" },
      { key: "status", label: "Statusi" },
      { key: "priority", label: "Prioriteti" },
      { key: "reporterName", label: "Raportuesi" },
      { key: "location", label: "Vendndodhja" },
      { key: "createdAt", label: "Data" },
    ];

    const reports = await db.citizenReport.findMany({
      where: {
        ...(filters.status ? { status: filters.status as CitizenReportStatus } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: MAX_ROWS,
    });

    const rows: ExportRow[] = reports.map((r) => ({
      reportNumber: r.reportNumber,
      type: CITIZEN_REPORT_TYPE_LABELS[r.type],
      status: CITIZEN_REPORT_STATUS_LABELS[r.status],
      priority: r.priority,
      reporterName: r.reporterName ?? "",
      location: r.locationAddress ?? "",
      createdAt: fmtDate(r.createdAt),
    }));

    return {
      title: getReportDefinition("citizen_reports").label,
      filenameBase: "raportime-qytetare",
      columns,
      rows,
    };
  }

  private static async exportMaintenanceRecords(
    ctx: AuthContext,
    filters: ReportExportFilters,
  ): Promise<ReportExportPayload> {
    const columns: ExportColumn[] = [
      { key: "registryNumber", label: "Nr. regjistrit" },
      { key: "type", label: "Lloji" },
      { key: "interventionType", label: "Ndërhyrja" },
      { key: "performedDate", label: "Data" },
      { key: "technician", label: "Tekniku" },
      { key: "company", label: "Kompania" },
    ];

    const where: Prisma.MaintenanceRecordWhereInput = {
      ...(parseDateFilter(filters.dateFrom) || parseDateFilter(filters.dateTo)
        ? {
            performedDate: {
              ...(parseDateFilter(filters.dateFrom)
                ? { gte: parseDateFilter(filters.dateFrom) }
                : {}),
              ...(parseDateFilter(filters.dateTo)
                ? { lte: parseDateFilter(filters.dateTo) }
                : {}),
            },
          }
        : {}),
    };

    if (
      ctx.roleCode === ROLE_CODES.MAINTENANCE &&
      ctx.activeOrgId &&
      !hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL)
    ) {
      where.maintenanceOrgId = ctx.activeOrgId;
    }

    const records = await db.maintenanceRecord.findMany({
      where,
      include: {
        elevator: { select: { registryNumber: true } },
        maintenanceOrg: { select: { name: true } },
      },
      orderBy: { performedDate: "desc" },
      take: MAX_ROWS,
    });

    const rows: ExportRow[] = records.map((r) => ({
      registryNumber: r.elevator.registryNumber,
      type: r.type,
      interventionType: r.interventionType ?? "",
      performedDate: fmtDate(r.performedDate),
      technician: r.technicianName ?? "",
      company: r.maintenanceOrg.name,
    }));

    return {
      title: getReportDefinition("maintenance_records").label,
      filenameBase: "mirembajtje",
      columns,
      rows,
    };
  }

  private static async exportInspections(
    ctx: AuthContext,
    filters: ReportExportFilters,
  ): Promise<ReportExportPayload> {
    const columns: ExportColumn[] = [
      { key: "registryNumber", label: "Nr. regjistrit" },
      { key: "type", label: "Lloji" },
      { key: "result", label: "Rezultati" },
      { key: "conductedDate", label: "Data" },
      { key: "nextInspectionDate", label: "Inspektimi i ardhshëm" },
      { key: "approvedBody", label: "OMI" },
    ];

    const where: Prisma.InspectionWhereInput = {
      ...(parseDateFilter(filters.dateFrom) || parseDateFilter(filters.dateTo)
        ? {
            conductedDate: {
              ...(parseDateFilter(filters.dateFrom)
                ? { gte: parseDateFilter(filters.dateFrom) }
                : {}),
              ...(parseDateFilter(filters.dateTo)
                ? { lte: parseDateFilter(filters.dateTo) }
                : {}),
            },
          }
        : {}),
    };

    if (
      ctx.roleCode === ROLE_CODES.CERTIFIER &&
      ctx.activeOrgId &&
      !hasPermission(ctx, PERMISSIONS.APPLICATIONS_VIEW_ALL)
    ) {
      where.elevator = { certifierOrgId: ctx.activeOrgId };
    }

    const inspections = await db.inspection.findMany({
      where,
      include: {
        elevator: { select: { registryNumber: true } },
      },
      orderBy: { conductedDate: "desc" },
      take: MAX_ROWS,
    });

    const rows: ExportRow[] = inspections.map((i) => ({
      registryNumber: i.elevator.registryNumber,
      type: i.type,
      result: i.result ?? i.status,
      conductedDate: fmtDate(i.conductedDate),
      nextInspectionDate: fmtDate(i.nextInspectionDate),
      approvedBody: i.approvedBodyNumber ?? "",
    }));

    return {
      title: getReportDefinition("inspections").label,
      filenameBase: "inspektime",
      columns,
      rows,
    };
  }

  private static async exportFieldInspections(
    ctx: AuthContext,
    filters: ReportExportFilters,
  ): Promise<ReportExportPayload> {
    const columns: ExportColumn[] = [
      { key: "registryNumber", label: "Nr. regjistrit" },
      { key: "address", label: "Adresa" },
      { key: "status", label: "Statusi" },
      { key: "scheduledDate", label: "Data e planifikuar" },
      { key: "assignee", label: "Inspektori" },
      { key: "completedAt", label: "Përfunduar më" },
    ];

    const status = filters.status as FieldInspectionAssignmentStatus | undefined;
    const assignments = hasPermission(ctx, PERMISSIONS.INSPECTIONS_FIELD_VIEW_ALL)
      ? await IshmtFieldInspectionService.listForAssigner(ctx, status)
      : await IshmtFieldInspectionService.listMine(ctx);

    const filtered = status
      ? assignments.filter((a) => a.status === status)
      : assignments;

    const rows: ExportRow[] = filtered.slice(0, MAX_ROWS).map((a) => ({
      registryNumber: a.elevator.registryNumber,
      address: a.elevator.buildingAddress ?? "",
      status: FIELD_INSPECTION_STATUS_LABELS[a.status],
      scheduledDate: fmtDate(a.scheduledDate),
      assignee: a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : "",
      completedAt: a.inspection?.conductedDate
        ? fmtDate(a.inspection.conductedDate)
        : a.status === "COMPLETED"
          ? fmtDate(a.updatedAt)
          : "",
    }));

    return {
      title: getReportDefinition("field_inspections").label,
      filenameBase: "inspektime-terreni",
      columns,
      rows,
    };
  }

  private static async exportComplianceSummary(): Promise<ReportExportPayload> {
    const columns: ExportColumn[] = [
      { key: "municipality", label: "Bashkia" },
      { key: "total", label: "Gjithsej" },
      { key: "green", label: "Konform" },
      { key: "yellow", label: "Afat në skadim" },
      { key: "red", label: "Jo konform" },
      { key: "greenPct", label: "% konform" },
    ];

    const data = await ReportingService.getComplianceByMunicipality();
    const rows: ExportRow[] = data.map((m) => ({
      municipality: m.name,
      total: m.total,
      green: m.green,
      yellow: m.yellow,
      red: m.red,
      greenPct: m.total > 0 ? Math.round((m.green / m.total) * 100) : 0,
    }));

    return {
      title: getReportDefinition("compliance_summary").label,
      filenameBase: "perputhshmeria-bashkia",
      columns,
      rows,
    };
  }

  private static async exportCompanies(filters: ReportExportFilters): Promise<ReportExportPayload> {
    const columns: ExportColumn[] = [
      { key: "name", label: "Emri" },
      { key: "nipt", label: "NIPT" },
      { key: "type", label: "Lloji" },
      { key: "status", label: "Statusi" },
      { key: "qkbValidated", label: "QKB" },
      { key: "createdAt", label: "Regjistruar më" },
    ];

    const orgs = await db.organization.findMany({
      where: {
        deletedAt: null,
        type: {
          in: filters.orgType
            ? [filters.orgType as OrgType]
            : [OrgType.INSTALLER, OrgType.CERTIFIER, OrgType.MAINTENANCE],
        },
      },
      orderBy: { name: "asc" },
      take: MAX_ROWS,
    });

    const rows: ExportRow[] = orgs.map((o) => ({
      name: o.name,
      nipt: o.nipt ?? "",
      type: o.type,
      status: o.status,
      qkbValidated: o.qkbValidated ? "Po" : "Jo",
      createdAt: fmtDate(o.createdAt),
    }));

    return {
      title: getReportDefinition("companies").label,
      filenameBase: "kompanite",
      columns,
      rows,
    };
  }
}
