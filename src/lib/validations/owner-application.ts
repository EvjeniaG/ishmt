import { z } from "zod";

export {
  ownerContactProfileSchema as ownerUserProfileSchema,
  ownerOrgProfileSchema,
} from "@/lib/validations/account-profile";

export const basicApplicationDataSchema = z.object({
  buildingName: z.string().optional(),
  buildingAddress: z.string().min(5, "Adresa e plotë e godinës është e detyrueshme"),
  municipalityId: z.string().uuid("Zgjidhni bashkinë"),
  administrativeUnitId: z.string().uuid().optional().or(z.literal("")),
  entrance: z.string().optional(),
  floorLocation: z.string().optional(),
  buildingType: z.enum([
    "CO_OWNERSHIP_BUILDING",
    "WORKPLACE",
    "RESIDENTIAL",
    "PUBLIC_BUILDING",
    "SHOPPING_CENTER",
    "OTHER",
  ]),
  usagePurpose: z.enum([
    "ELECTRIC_PASSENGER",
    "HYDRAULIC_PASSENGER",
    "PASSENGER_AND_FREIGHT",
    "PASSENGER_AND_BED",
    "PASSENGER_AND_MOTOR_DEVICE",
    "OTHER",
  ]),
  responsibleEntityName: z.string().min(2, "Personi përgjegjës është i detyrueshëm"),
  responsibleEntityIdentifier: z.string().min(5, "NIPT / NID është i detyrueshëm"),
  responsibleEntityEmail: z.string().email("Email i pavlefshëm"),
  responsibleEntityPhone: z.string().min(8, "Telefoni është i detyrueshëm"),
  notes: z.string().optional(),
});

export const deregistrationApplicationSchema = z.object({
  elevatorId: z.string().uuid(),
  deregistrationReasonType: z.enum([
    "PERMANENTLY_DISMANTLED",
    "REPLACED_BY_NEW_UNIT",
    "STRUCTURAL_CHANGES",
    "OTHER",
  ]),
  deregistrationReason: z.string().min(10, "Shpjegimi është i detyrueshëm"),
  confirmed: z.literal("true", { errorMap: () => ({ message: "Duhet të konfirmoni kërkesën" }) }),
});

export const dataCorrectionSchema = z.object({
  elevatorId: z.string().uuid(),
  correctionFields: z.record(z.string()),
  reason: z.string().min(10, "Arsyeja është e detyrueshme"),
});

export const dataUpdateSchema = z.object({
  elevatorId: z.string().uuid(),
  updateType: z.enum([
    "RESPONSIBLE_ENTITY_CHANGE",
    "MAINTENANCE_COMPANY_CHANGE",
    "ADDRESS_CHANGE",
    "CONTACT_UPDATE",
    "OWNERSHIP_TRANSFER",
  ]),
  updateFields: z.record(z.string()),
  reason: z.string().min(10, "Arsyeja është e detyrueshme"),
});

export const modernizationApplicationSchema = z.object({
  elevatorId: z.string().uuid(),
  modernizationType: z.enum([
    "MOTOR_CHANGE",
    "CONTROL_PANEL_CHANGE",
    "CABIN_CHANGE",
    "SAFETY_SYSTEM_CHANGE",
    "ELECTRICAL_SYSTEM_CHANGE",
    "OTHER",
  ]),
  modernizationNotes: z.string().min(10, "Përshkrimi duhet të ketë të paktën 10 karaktere"),
  confirmed: z.literal("true", { errorMap: () => ({ message: "Duhet të konfirmoni kërkesën" }) }),
});
