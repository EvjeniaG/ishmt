import { BuildingType, UsagePurpose } from "@prisma/client";
import {
  REGISTRATION_BUILDING_TYPE_LABELS,
  REGISTRATION_USAGE_PURPOSE_LABELS,
} from "@/lib/registration/labels";

export const PRISMA_BUILDING_TO_ANNEX: Record<
  BuildingType,
  keyof typeof REGISTRATION_BUILDING_TYPE_LABELS
> = {
  WORKPLACE: "VEND_PUNE_QENDER_TREGTARE",
  CO_OWNERSHIP_BUILDING: "NDERTESA_NE_BASHKEPRONESI",
  RESIDENTIAL: "MJEDISE_SHTEPIAKE",
  PUBLIC_BUILDING: "NDERTESE_PUBLIKE",
  SHOPPING_CENTER: "VEND_PUNE_QENDER_TREGTARE",
  OTHER: "MJEDISE_SHTEPIAKE",
};

export const PRISMA_USAGE_TO_ANNEX: Record<
  UsagePurpose,
  keyof typeof REGISTRATION_USAGE_PURPOSE_LABELS
> = {
  ELECTRIC_PASSENGER: "TRANSPORT_NJEREZISH_ELEKTRIK",
  HYDRAULIC_PASSENGER: "TRANSPORT_NJEREZISH_HIDRAULIK",
  PASSENGER_AND_FREIGHT: "TRANSPORT_NJEREZISH_DHE_MALLRASH",
  PASSENGER_AND_BED: "TRANSPORT_NJEREZISH_DHE_SHTRATI",
  PASSENGER_AND_MOTOR_DEVICE: "TRANSPORT_NJEREZISH_DHE_PAJISJE_MOTORIKE",
  OTHER: "TJETER",
};

/** Legacy Prisma / demo values stored before Aneksi 1 codes were normalized. */
export const LEGACY_DRIVE_TYPE_LABELS: Record<string, string> = {
  ELECTRIC: "Elektrik",
  HYDRAULIC: "Hidraulik",
  TRACTION: "Me kavo tërheqëse",
  MRL: "Pa kabinë makinerie (MRL)",
};

export function isValidAnnexCode<T extends Record<string, string>>(
  map: T,
  code: unknown,
): code is keyof T & string {
  return typeof code === "string" && code in map;
}

export function annexBuildingTypeCode(
  extCode: unknown,
  prismaType: BuildingType | null | undefined,
): keyof typeof REGISTRATION_BUILDING_TYPE_LABELS | null {
  if (isValidAnnexCode(REGISTRATION_BUILDING_TYPE_LABELS, extCode)) {
    return extCode;
  }
  if (prismaType && PRISMA_BUILDING_TO_ANNEX[prismaType]) {
    return PRISMA_BUILDING_TO_ANNEX[prismaType];
  }
  return null;
}

export function annexUsagePurposeCode(
  extCode: unknown,
  prismaPurpose: UsagePurpose | null | undefined,
): keyof typeof REGISTRATION_USAGE_PURPOSE_LABELS | null {
  if (isValidAnnexCode(REGISTRATION_USAGE_PURPOSE_LABELS, extCode)) {
    return extCode;
  }
  if (prismaPurpose && PRISMA_USAGE_TO_ANNEX[prismaPurpose]) {
    return PRISMA_USAGE_TO_ANNEX[prismaPurpose];
  }
  return null;
}

export function buildNormalizedRegistrationExtended(
  ext: Record<string, unknown>,
  input: {
    buildingType?: BuildingType | null;
    usagePurpose?: UsagePurpose | null;
  },
): Record<string, unknown> {
  const buildingCode = annexBuildingTypeCode(ext.registrationBuildingType, input.buildingType);
  const usageCode = annexUsagePurposeCode(ext.usagePurposeCode, input.usagePurpose);

  return {
    ...ext,
    elevatorConditionType: ext.elevatorConditionType ?? "EXISTING",
    applicationSubtype: ext.applicationSubtype ?? "FIRST",
    responsibleEntityType: ext.responsibleEntityType ?? "PHYSICAL_PERSON",
    responsibleIdentifierType: ext.responsibleIdentifierType ?? "NIPT",
    ...(buildingCode ? { registrationBuildingType: buildingCode } : {}),
    ...(usageCode ? { usagePurposeCode: usageCode } : {}),
  };
}
