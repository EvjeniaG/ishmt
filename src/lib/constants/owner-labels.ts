import { BuildingType, OwnerBuildingRole, UsagePurpose } from "@prisma/client";

export const OWNER_LABEL = "Personi përgjegjës i ashensorit";
export const OWNER_TERM = "PERSONI PËRGJEGJËS I ASHENSORIT";
export const OWNER_LABEL_GENITIVE = "personit përgjegjës të ashensorit";
export const OWNER_LABEL_PLURAL = "personat përgjegjës të ashensorit";
export const OWNER_PORTAL_EYEBROW = `Portali · ${OWNER_LABEL}`;
export const OWNER_PANEL_TITLE = `Paneli i ${OWNER_LABEL_GENITIVE}`;
export const SYSTEM_NAME = "Sistemi Digjital i Regjistrit të Ashensorëve";

export const OWNER_BUILDING_ROLE_LABELS: Record<OwnerBuildingRole, string> = {
  ADMINISTRATOR: "Administrator Pallati",
  OWNERS_ASSEMBLY_REP: "Asamble e bashkëpronarëve",
  PHYSICAL_PERSON: "Person Fizik",
  LEGAL_PERSON: "Person Juridik",
  CONSTRUCTOR: "Ndërtues",
  CONSTRUCTION_COMPANY: "Kompani Ndërtimi",
  OTHER: "Tjetër",
};

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  CO_OWNERSHIP_BUILDING: "Ndërtesë në Bashkëpronësi",
  WORKPLACE: "Vend Pune",
  RESIDENTIAL: "Mjedis Shtëpiak",
  PUBLIC_BUILDING: "Ndërtesë Publike",
  SHOPPING_CENTER: "Qendër Tregtare",
  OTHER: "Tjetër",
};

export const USAGE_PURPOSE_LABELS: Record<UsagePurpose, string> = {
  ELECTRIC_PASSENGER: "Transport Njerëzish Elektrik",
  HYDRAULIC_PASSENGER: "Transport Njerëzish Hidraulik",
  PASSENGER_AND_FREIGHT: "Transport Njerëzish dhe Mallrash",
  PASSENGER_AND_BED: "Transport Njerëzish dhe Shtrati",
  PASSENGER_AND_MOTOR_DEVICE: "Transport Njerëzish dhe Pajisje Motorike",
  OTHER: "Tjetër",
};
