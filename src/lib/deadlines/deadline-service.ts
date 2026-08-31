import { ApplicationStatus, BuildingType } from "@prisma/client";
import { computeLegalDeadline, type LegalDeadline } from "@/lib/utils/legal-deadline";
import {
  COMPLIANCE_WARNING_DAYS,
  MAINTENANCE_REPORT_MAX_DAYS,
  PROCEDURE_WORKING_DAYS,
} from "@/lib/deadlines/deadline-policy";
import { computeNextInspectionDue, getInspectionIntervalMonths } from "@/lib/deadlines/inspection-interval";
import type { ComplianceRulesConfig } from "@/lib/services/system-config-service";
import { SystemConfigService } from "@/lib/services/system-config-service";

export type DeadlineSeverity = "ok" | "gray" | "orange" | "red";

export type DeadlineCategory =
  | "procedure"
  | "inspection"
  | "inspection_contract_missing"
  | "inspection_contract_pending"
  | "inspection_contract"
  | "maintenance_contract"
  | "maintenance_report"
  | "maintenance_missing"
  | "certificate"
  | "qr_placement";

export type UnifiedDeadlineItem = {
  id: string;
  category: DeadlineCategory;
  title: string;
  subtitle: string;
  dueDate: Date;
  severity: DeadlineSeverity;
  daysRemaining: number;
  isOverdue: boolean;
  href?: string;
  actionLabel?: string;
};

export const ISHMT_PROCEDURE_REVIEW_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.PENDING_DIRECTOR,
  ApplicationStatus.PENDING_SECTOR_HEAD,
  ApplicationStatus.PENDING_FIELD_REVIEW,
  ApplicationStatus.PENDING_SECTOR_HEAD_REPORT,
  ApplicationStatus.PENDING_DIRECTOR_REPORT,
  ApplicationStatus.PENDING_CHIEF_INSPECTOR,
  ApplicationStatus.RETURNED_TO_INSPECTORS,
  ApplicationStatus.RETURNED_TO_SECTOR_HEAD,
  ApplicationStatus.RETURNED_TO_DIRECTOR,
];

const REVIEW_STATUSES = ISHMT_PROCEDURE_REVIEW_STATUSES;

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function severityFromDaysRemaining(daysRemaining: number, warningDays: number): DeadlineSeverity {
  if (daysRemaining < 0) return "red";
  if (daysRemaining <= 7) return "orange";
  if (daysRemaining <= warningDays) return "gray";
  return "ok";
}

function severityFromWorkingDays(legal: LegalDeadline): DeadlineSeverity {
  if (legal.severity === "red") return "red";
  if (legal.severity === "orange") return "orange";
  return "gray";
}

export class DeadlineService {
  static readonly procedureWorkingDays = PROCEDURE_WORKING_DAYS;

  static computeProcedureDeadline(protocolAt: Date): LegalDeadline {
    return computeLegalDeadline(protocolAt, PROCEDURE_WORKING_DAYS);
  }

  static isApplicationUnderProcedureReview(status: ApplicationStatus): boolean {
    return REVIEW_STATUSES.includes(status);
  }

  static buildProcedureDeadlineItem(input: {
    applicationId: string;
    applicationNumber: string;
    protocolAt: Date;
    href?: string;
  }): UnifiedDeadlineItem {
    const legal = this.computeProcedureDeadline(input.protocolAt);
    const now = new Date();
    const isOverdue = now > legal.deadlineDate;
    const daysRemaining = isOverdue
      ? -daysBetween(legal.deadlineDate, now)
      : legal.workingDaysRemaining;

    return {
      id: `procedure-${input.applicationId}`,
      category: "procedure",
      title: isOverdue ? "Afati i procedurës ka skaduar" : "Afati i shqyrtimit IQMT",
      subtitle: `${input.applicationNumber} · ${PROCEDURE_WORKING_DAYS} ditë pune nga protokolli`,
      dueDate: legal.deadlineDate,
      severity: severityFromWorkingDays(legal),
      daysRemaining,
      isOverdue,
      href: input.href ?? `/portal/applications/${input.applicationId}`,
      actionLabel: "Shiko aplikimin",
    };
  }

  static buildInspectionDeadlineItem(input: {
    elevatorId: string;
    registryNumber: string;
    buildingType: BuildingType | null | undefined;
    registrationDate: Date;
    lastPeriodicInspection?: {
      conductedDate: Date | null;
      nextInspectionDate: Date | null;
    } | null;
    rules?: ComplianceRulesConfig;
    href?: string;
  }): UnifiedDeadlineItem {
    const rules = input.rules;
    const warningDays = rules?.inspectionWarningDays ?? COMPLIANCE_WARNING_DAYS;
    const { dueDate, intervalMonths } = computeNextInspectionDue({
      buildingType: input.buildingType,
      registrationDate: input.registrationDate,
      lastPeriodicInspectionDate: input.lastPeriodicInspection?.conductedDate,
      lastNextInspectionDate: input.lastPeriodicInspection?.nextInspectionDate,
      rules,
    });

    const now = new Date();
    const daysRemaining = daysBetween(now, dueDate);
    const isOverdue = dueDate < now;

    return {
      id: `inspection-${input.elevatorId}`,
      category: "inspection",
      title: isOverdue ? "Kontrolli periodik i vonuar" : "Kontrolli periodik i radhës",
      subtitle: `${input.registryNumber} · çdo ${intervalMonths} muaj`,
      dueDate,
      severity: severityFromDaysRemaining(daysRemaining, warningDays),
      daysRemaining,
      isOverdue,
      href: input.href ?? `/portal/elevators/${input.elevatorId}?tab=inspections`,
      actionLabel: "Shiko kontrollet",
    };
  }

  static buildMaintenanceContractDeadlineItem(input: {
    elevatorId: string;
    registryNumber: string;
    contractEndDate: Date;
    warningDays?: number;
    href?: string;
  }): UnifiedDeadlineItem {
    const warningDays = input.warningDays ?? COMPLIANCE_WARNING_DAYS;
    const now = new Date();
    const daysRemaining = daysBetween(now, input.contractEndDate);
    const isOverdue = input.contractEndDate < now;

    return {
      id: `maint-contract-${input.elevatorId}`,
      category: "maintenance_contract",
      title: isOverdue ? "Kontrata e mirëmbajtjes ka skaduar" : "Kontrata e mirëmbajtjes skadon",
      subtitle: input.registryNumber,
      dueDate: input.contractEndDate,
      severity: severityFromDaysRemaining(daysRemaining, warningDays),
      daysRemaining,
      isOverdue,
      href: input.href ?? `/portal/elevators/${input.elevatorId}?tab=maintenance`,
      actionLabel: "Menaxho mirëmbajtjen",
    };
  }

  static buildMaintenanceReportDeadlineItem(input: {
    elevatorId: string;
    registryNumber: string;
    lastInterventionDate: Date | null;
    maxDays?: number;
    href?: string;
  }): UnifiedDeadlineItem {
    const maxDays = input.maxDays ?? MAINTENANCE_REPORT_MAX_DAYS;
    const now = new Date();
    const base = input.lastInterventionDate ?? now;
    const dueDate = new Date(base);
    dueDate.setDate(dueDate.getDate() + maxDays);

    const daysRemaining = daysBetween(now, dueDate);
    const isOverdue = !input.lastInterventionDate
      ? true
      : daysBetween(input.lastInterventionDate, now) > maxDays;

    return {
      id: `maint-report-${input.elevatorId}`,
      category: "maintenance_report",
      title: isOverdue ? "Mungon raporti mujor i mirëmbajtjes" : "Raport mujor mirëmbajtjeje",
      subtitle: input.registryNumber,
      dueDate,
      severity: isOverdue ? "red" : daysRemaining <= 7 ? "orange" : "gray",
      daysRemaining,
      isOverdue,
      href: input.href ?? `/portal/elevators/${input.elevatorId}?tab=maintenance`,
      actionLabel: "Shiko mirëmbajtjen",
    };
  }

  static buildMissingMaintenanceItem(input: {
    elevatorId: string;
    registryNumber: string;
    href?: string;
  }): UnifiedDeadlineItem {
    const now = new Date();
    return {
      id: `maint-missing-${input.elevatorId}`,
      category: "maintenance_missing",
      title: "Pa kontratë mirëmbajtjeje",
      subtitle: input.registryNumber,
      dueDate: now,
      severity: "red",
      daysRemaining: 0,
      isOverdue: true,
      href: input.href ?? `/portal/elevators/${input.elevatorId}?tab=maintenance`,
      actionLabel: "Cakto mirëmbajtës",
    };
  }

  static buildMissingInspectionContractItem(input: {
    elevatorId: string;
    registryNumber: string;
    href?: string;
  }): UnifiedDeadlineItem {
    const now = new Date();
    return {
      id: `insp-contract-missing-${input.elevatorId}`,
      category: "inspection_contract_missing",
      title: "Pa kontratë kontrolli periodik (OM)",
      subtitle: input.registryNumber,
      dueDate: now,
      severity: "red",
      daysRemaining: 0,
      isOverdue: true,
      href: input.href ?? `/portal/elevators/${input.elevatorId}?tab=inspections`,
      actionLabel: "Cakto OM-n",
    };
  }

  static buildPendingInspectionContractItem(input: {
    elevatorId: string;
    registryNumber: string;
    href?: string;
  }): UnifiedDeadlineItem {
    const now = new Date();
    return {
      id: `insp-contract-pending-${input.elevatorId}`,
      category: "inspection_contract_pending",
      title: "Kontratë kontrolli periodik - në pritje pranimi",
      subtitle: input.registryNumber,
      dueDate: now,
      severity: "orange",
      daysRemaining: 0,
      isOverdue: false,
      href: input.href ?? `/portal/elevators/${input.elevatorId}?tab=inspections`,
      actionLabel: "Shiko kontrollet",
    };
  }

  static buildInspectionContractDeadlineItem(input: {
    elevatorId: string;
    registryNumber: string;
    contractEndDate: Date;
    warningDays?: number;
    href?: string;
  }): UnifiedDeadlineItem {
    const warningDays = input.warningDays ?? COMPLIANCE_WARNING_DAYS;
    const now = new Date();
    const daysRemaining = daysBetween(now, input.contractEndDate);
    const isOverdue = input.contractEndDate < now;

    return {
      id: `insp-contract-${input.elevatorId}`,
      category: "inspection_contract",
      title: isOverdue ? "Kontrata e kontrollit periodik ka skaduar" : "Kontrata e kontrollit periodik skadon",
      subtitle: input.registryNumber,
      dueDate: input.contractEndDate,
      severity: severityFromDaysRemaining(daysRemaining, warningDays),
      daysRemaining,
      isOverdue,
      href: input.href ?? `/portal/elevators/${input.elevatorId}?tab=inspections`,
      actionLabel: "Shiko kontrollet",
    };
  }

  static buildQrPlacementItem(input: {
    elevatorId: string;
    registryNumber: string;
    href?: string;
  }): UnifiedDeadlineItem {
    const now = new Date();
    return {
      id: `qr-placement-${input.elevatorId}`,
      category: "qr_placement",
      title: "Mungon fotografia e vendosjes së QR",
      subtitle: input.registryNumber,
      dueDate: now,
      severity: "red",
      daysRemaining: 0,
      isOverdue: true,
      href: input.href ?? `/portal/elevators/${input.elevatorId}?tab=qr`,
      actionLabel: "Ngarko foton",
    };
  }

  static async buildElevatorDeadlines(input: {
    elevatorId: string;
    registryNumber: string;
    buildingType: BuildingType | null | undefined;
    registrationDate: Date;
    maintenanceOrgId: string | null;
    lastPeriodicInspection?: {
      conductedDate: Date | null;
      nextInspectionDate: Date | null;
    } | null;
    activeMaintenanceContract?: { endDate: Date | null } | null;
    maintenanceContracts?: Array<{
      serviceType: string;
      status: string;
      endDate: Date | null;
    }>;
    qrCode?: { code: string; placementPhotoDocumentId: string | null } | null;
    lastInterventionDate?: Date | null;
    activeRegistrationCertExpiry?: Date | null;
    rules?: ComplianceRulesConfig;
  }): Promise<UnifiedDeadlineItem[]> {
    const rules = input.rules ?? (await SystemConfigService.getComplianceRules());
    const items: UnifiedDeadlineItem[] = [];

    const inspectionActive = input.maintenanceContracts?.find(
      (contract) => contract.serviceType === "PERIODIC_INSPECTION" && contract.status === "ACTIVE",
    );
    const inspectionPending = input.maintenanceContracts?.find(
      (contract) => contract.serviceType === "PERIODIC_INSPECTION" && contract.status === "PENDING",
    );

    items.push(
      this.buildInspectionDeadlineItem({
        elevatorId: input.elevatorId,
        registryNumber: input.registryNumber,
        buildingType: input.buildingType,
        registrationDate: input.registrationDate,
        lastPeriodicInspection: input.lastPeriodicInspection,
        rules,
      }),
    );

    if (!inspectionActive && !inspectionPending) {
      items.push(
        this.buildMissingInspectionContractItem({
          elevatorId: input.elevatorId,
          registryNumber: input.registryNumber,
        }),
      );
    } else if (inspectionPending && !inspectionActive) {
      items.push(
        this.buildPendingInspectionContractItem({
          elevatorId: input.elevatorId,
          registryNumber: input.registryNumber,
        }),
      );
    } else if (inspectionActive?.endDate) {
      items.push(
        this.buildInspectionContractDeadlineItem({
          elevatorId: input.elevatorId,
          registryNumber: input.registryNumber,
          contractEndDate: inspectionActive.endDate,
          warningDays: rules.certificateWarningDays,
        }),
      );
    }

    if (!input.maintenanceOrgId) {
      items.push(this.buildMissingMaintenanceItem({ elevatorId: input.elevatorId, registryNumber: input.registryNumber }));
    } else if (input.activeMaintenanceContract?.endDate) {
      items.push(
        this.buildMaintenanceContractDeadlineItem({
          elevatorId: input.elevatorId,
          registryNumber: input.registryNumber,
          contractEndDate: input.activeMaintenanceContract.endDate,
          warningDays: rules.certificateWarningDays,
        }),
      );
    }

    if (input.maintenanceOrgId && input.lastInterventionDate) {
      items.push(
        this.buildMaintenanceReportDeadlineItem({
          elevatorId: input.elevatorId,
          registryNumber: input.registryNumber,
          lastInterventionDate: input.lastInterventionDate ?? null,
          maxDays: rules.maintenanceReportMaxDays,
        }),
      );
    }

    if (input.activeRegistrationCertExpiry) {
      const expiry = input.activeRegistrationCertExpiry;
      const daysRemaining = daysBetween(new Date(), expiry);
      items.push({
        id: `cert-${input.elevatorId}`,
        category: "certificate",
        title: expiry < new Date() ? "Certifikata ka skaduar" : "Certifikata skadon",
        subtitle: input.registryNumber,
        dueDate: expiry,
        severity: severityFromDaysRemaining(daysRemaining, rules.certificateWarningDays),
        daysRemaining,
        isOverdue: expiry < new Date(),
        href: `/portal/elevators/${input.elevatorId}?tab=certificate`,
        actionLabel: "Shiko certifikatën",
      });
    }

    if (input.qrCode?.code && !input.qrCode.placementPhotoDocumentId) {
      items.push(
        this.buildQrPlacementItem({
          elevatorId: input.elevatorId,
          registryNumber: input.registryNumber,
        }),
      );
    }

    return items.sort((a, b) => {
      const severityRank = (item: UnifiedDeadlineItem) =>
        item.severity === "red" ? 0 : item.severity === "orange" ? 1 : item.severity === "gray" ? 2 : 3;
      const rankDiff = severityRank(a) - severityRank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }

  /** Afate procedure për radhën IQMT (inspektor / kryeinspektor). */
  static summarizeProcedureQueue(
    applications: { id: string; applicationNumber: string; submittedAt: Date | null }[],
  ) {
    let overdue = 0;
    let urgent = 0;
    let inReview = 0;

    for (const app of applications) {
      if (!app.submittedAt) continue;
      inReview += 1;
      const legal = this.computeProcedureDeadline(app.submittedAt);
      const now = new Date();
      if (now > legal.deadlineDate) overdue += 1;
      else if (legal.workingDaysRemaining <= 3) urgent += 1;
    }

    return { overdue, urgent, inReview };
  }

  static getInspectionIntervalLabel(buildingType: BuildingType | null | undefined): string {
    const months = getInspectionIntervalMonths(buildingType);
    return `${months} muaj`;
  }
}
