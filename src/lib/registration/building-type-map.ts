import { BuildingType, UsagePurpose } from "@prisma/client";

export function mapRegistrationBuildingType(code: string): BuildingType {
  switch (code) {
    case "VEND_PUNE_QENDER_TREGTARE":
      return BuildingType.WORKPLACE;
    case "NDERTESA_NE_BASHKEPRONESI":
      return BuildingType.CO_OWNERSHIP_BUILDING;
    case "MJEDISE_SHTEPIAKE":
      return BuildingType.RESIDENTIAL;
    case "NDERTESE_PUBLIKE":
      return BuildingType.PUBLIC_BUILDING;
    default:
      return BuildingType.OTHER;
  }
}

export function mapRegistrationUsagePurpose(code: string): UsagePurpose {
  switch (code) {
    case "TRANSPORT_NJEREZISH_ELEKTRIK":
      return UsagePurpose.ELECTRIC_PASSENGER;
    case "TRANSPORT_NJEREZISH_HIDRAULIK":
      return UsagePurpose.HYDRAULIC_PASSENGER;
    case "TRANSPORT_NJEREZISH_DHE_MALLRASH":
      return UsagePurpose.PASSENGER_AND_FREIGHT;
    case "TRANSPORT_NJEREZISH_DHE_SHTRATI":
      return UsagePurpose.PASSENGER_AND_BED;
    case "TRANSPORT_NJEREZISH_DHE_PAJISJE_MOTORIKE":
      return UsagePurpose.PASSENGER_AND_MOTOR_DEVICE;
    default:
      return UsagePurpose.OTHER;
  }
}

export function mapConformityResult(code: string): "CONFORM" | "NON_CONFORM" | "CONDITIONAL" {
  switch (code) {
    case "KONFORM":
      return "CONFORM";
    case "JO_KONFORM":
      return "NON_CONFORM";
    case "KONFORM_ME_KUSHTE":
      return "CONDITIONAL";
    default:
      return "CONFORM";
  }
}

export function mapSpeedRangeToMs(range: string): number {
  switch (range) {
    case "NEN_0_15":
      return 0.1;
    case "NGA_0_15_DERI_1":
      return 0.5;
    case "NGA_1_DERI_6_5":
      return 2;
    case "MBI_6_5":
      return 7;
    default:
      return 1;
  }
}
