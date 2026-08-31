import type { BuildingType, UsagePurpose } from "@prisma/client";
import { BUILDING_TYPE_LABELS, USAGE_PURPOSE_LABELS } from "@/lib/constants/owner-labels";
import { getInspectionIntervalMonths, computeNextInspectionDue } from "@/lib/deadlines/inspection-interval";
import { formatDateSq } from "@/lib/format-date";

export type PeriodicControlSchedule = {
  intervalMonths: number;
  buildingType: BuildingType | null;
  buildingTypeLabel: string;
  usagePurpose: UsagePurpose | null;
  usagePurposeLabel: string | null;
  nextInspectionDue: Date;
  nextInspectionDueLabel: string;
  /** Baza ligjore e intervalit (pa përsëritje të muajve). */
  intervalBasisLabel: string;
  intervalRuleLabel: string;
};

export function buildPeriodicControlSchedule(input: {
  buildingType: BuildingType | null | undefined;
  usagePurpose?: UsagePurpose | null | undefined;
  registrationDate: Date;
  lastPeriodicInspectionDate?: Date | null;
  lastNextInspectionDate?: Date | null;
}): PeriodicControlSchedule {
  const buildingType = input.buildingType ?? null;
  const usagePurpose = input.usagePurpose ?? null;
  const intervalMonths = getInspectionIntervalMonths(buildingType);
  const { dueDate } = computeNextInspectionDue({
    buildingType,
    registrationDate: input.registrationDate,
    lastPeriodicInspectionDate: input.lastPeriodicInspectionDate,
    lastNextInspectionDate: input.lastNextInspectionDate,
  });

  const intervalBasisLabel =
    buildingType === "WORKPLACE" || buildingType === "PUBLIC_BUILDING"
      ? "Ndërtesë publike ose vend pune"
      : "Ndërtesa banimi dhe lloje të tjera";

  const intervalRuleLabel =
    buildingType === "WORKPLACE" || buildingType === "PUBLIC_BUILDING"
      ? "6 muaj - ndërtesë publike ose vend pune (Udhëzim IQMT)"
      : "12 muaj - ndërtesa banimi dhe lloje të tjera (Udhëzim IQMT)";

  return {
    intervalMonths,
    buildingType,
    buildingTypeLabel: buildingType ? BUILDING_TYPE_LABELS[buildingType] : "E papërcaktuar",
    usagePurpose,
    usagePurposeLabel: usagePurpose ? USAGE_PURPOSE_LABELS[usagePurpose] : null,
    nextInspectionDue: dueDate,
    nextInspectionDueLabel: formatDateSq(dueDate),
    intervalBasisLabel,
    intervalRuleLabel,
  };
}

export function defaultInspectionContractEndDate(startDate: Date, intervalMonths: number): string {
  const end = new Date(startDate);
  end.setMonth(end.getMonth() + Math.max(intervalMonths, 12));
  return end.toISOString().slice(0, 10);
}
