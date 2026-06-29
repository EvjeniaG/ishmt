import { BuildingType } from "@prisma/client";
import {
  INSPECTION_INTERVAL_MONTHS_DEFAULT,
  INSPECTION_INTERVAL_MONTHS_WORKPLACE,
} from "@/lib/deadlines/deadline-policy";
import type { ComplianceRulesConfig } from "@/lib/services/system-config-service";

export function getInspectionIntervalMonths(
  buildingType: BuildingType | null | undefined,
  rules?: Pick<ComplianceRulesConfig, "inspectionIntervalMonthsDefault" | "inspectionIntervalMonthsWorkplace">,
): number {
  const defaultMonths = rules?.inspectionIntervalMonthsDefault ?? INSPECTION_INTERVAL_MONTHS_DEFAULT;
  const workplaceMonths = rules?.inspectionIntervalMonthsWorkplace ?? INSPECTION_INTERVAL_MONTHS_WORKPLACE;

  if (buildingType === BuildingType.WORKPLACE || buildingType === BuildingType.PUBLIC_BUILDING) {
    return workplaceMonths;
  }
  return defaultMonths;
}

export function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function computeNextInspectionDue(input: {
  buildingType: BuildingType | null | undefined;
  registrationDate: Date;
  lastPeriodicInspectionDate?: Date | null;
  lastNextInspectionDate?: Date | null;
  rules?: Pick<ComplianceRulesConfig, "inspectionIntervalMonthsDefault" | "inspectionIntervalMonthsWorkplace">;
}): { dueDate: Date; intervalMonths: number } {
  const intervalMonths = getInspectionIntervalMonths(input.buildingType, input.rules);

  if (input.lastNextInspectionDate) {
    return { dueDate: new Date(input.lastNextInspectionDate), intervalMonths };
  }

  const base = input.lastPeriodicInspectionDate ?? input.registrationDate;
  return { dueDate: addMonths(base, intervalMonths), intervalMonths };
}
