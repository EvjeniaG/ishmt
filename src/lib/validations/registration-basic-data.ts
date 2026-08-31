import { z } from "zod";
import {
  inferElevatorConditionFromInServiceDate,
} from "@/lib/registration/registration-workflow-prefill";

function parseGpsCoordinate(value: string | undefined, kind: "lat" | "lng"): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (kind === "lat" && (n < -90 || n > 90)) return undefined;
  if (kind === "lng" && (n < -180 || n > 180)) return undefined;
  return n;
}

export function parseRegistrationBuildingGps(input: {
  gpsLatitude?: string;
  gpsLongitude?: string;
}): { latitude: number; longitude: number } | null {
  const latitude = parseGpsCoordinate(input.gpsLatitude, "lat");
  const longitude = parseGpsCoordinate(input.gpsLongitude, "lng");
  if (latitude === undefined || longitude === undefined) return null;
  return { latitude, longitude };
}

export const registrationBasicDataSchema = z
  .object({
    applicationDate: z.string().min(1, "Data e aplikimit është e detyrueshme"),
    elevatorInServiceDate: z.string().min(1, "Data e instalimit të ashensorit dhe vënies në shërbim është e detyrueshme"),
    elevatorConditionType: z.enum(["NEW", "EXISTING"], {
      errorMap: () => ({ message: "Plotësoni datën e instalimit për të përcaktuar llojin e ashensorit" }),
    }),
    applicationSubtype: z.enum(["FIRST", "ADDITIONAL"]),
    existingRegisteredElevatorsCount: z.coerce.number().optional(),
    responsibleEntityType: z.enum(["ADMINISTRATOR", "CONSTRUCTION_COMPANY"]),
    responsibleEntityName: z.string().min(2, "Emri i subjektit përgjegjës është i detyrueshëm"),
    responsibleIdentifierType: z.enum(["NID", "NIPT"]),
    responsibleIdentifier: z.string().min(5, "NID / NIPT është i detyrueshëm"),
    responsiblePhone: z.string().min(8, "Telefoni është i detyrueshëm"),
    responsibleEmail: z.string().trim().email("Email i pavlefshëm"),
    representedBy: z.string().optional(),
    representativePosition: z.string().optional(),
    buildingName: z.string().optional(),
    buildingAddressMode: z.enum(["text", "gps"]).default("text"),
    buildingAddress: z.string().max(500).optional().or(z.literal("")),
    gpsLatitude: z.string().optional().or(z.literal("")),
    gpsLongitude: z.string().optional().or(z.literal("")),
    municipalityId: z.string().uuid("Zgjidhni bashkinë"),
    administrativeUnitId: z.string().uuid().optional().or(z.literal("")),
    entrance: z.string().optional(),
    specificPosition: z.string().optional(),
    registrationBuildingType: z.enum([
      "VEND_PUNE_QENDER_TREGTARE",
      "NDERTESA_NE_BASHKEPRONESI",
      "MJEDISE_SHTEPIAKE",
    ]),
    buildingMainUse: z.string().optional(),
    businessNameIfWorkplace: z.string().optional(),
    businessNiptIfWorkplace: z.string().optional(),
    usagePurposeCode: z.enum([
      "TRANSPORT_NJEREZISH_ELEKTRIK",
      "TRANSPORT_NJEREZISH_HIDRAULIK",
      "TRANSPORT_NJEREZISH_DHE_MALLRASH",
      "TRANSPORT_NJEREZISH_DHE_SHTRATI",
      "TRANSPORT_NJEREZISH_DHE_PAJISJE_MOTORIKE",
      "TJETER",
    ]),
    usagePurposeOther: z.string().optional(),
    ownerNotes: z.string().optional(),
    saveAsDraft: z.enum(["true", "false"]).optional(),
  })
  .superRefine((data, ctx) => {
    const inferred = inferElevatorConditionFromInServiceDate(data.elevatorInServiceDate);
    if (inferred && inferred !== data.elevatorConditionType) {
      ctx.addIssue({
        code: "custom",
        message:
          inferred === "NEW"
            ? "Me këtë datë ashensori klasifikohet si I RI (nga 1 janar 2020). Zgjidhni «I RI» ose korrigjoni datën."
            : "Me këtë datë ashensori klasifikohet si EKZISTUES (para 31 dhjetor 2019). Zgjidhni «EKZISTUES» ose korrigjoni datën.",
        path: ["elevatorConditionType"],
      });
    }
    if (data.applicationSubtype === "ADDITIONAL" && !data.existingRegisteredElevatorsCount) {
      ctx.addIssue({
        code: "custom",
        message: "Numri i ashensorëve të regjistruar më parë është i detyrueshëm",
        path: ["existingRegisteredElevatorsCount"],
      });
    }
    if (data.usagePurposeCode === "TJETER" && !data.usagePurposeOther) {
      ctx.addIssue({ code: "custom", message: "Specifikoni qëllimin", path: ["usagePurposeOther"] });
    }
    const gps = parseRegistrationBuildingGps(data);
    if (data.buildingAddressMode === "gps") {
      if (!gps) {
        ctx.addIssue({
          code: "custom",
          message: "Përdorni vendndodhjen time ose shkruani adresën.",
          path: ["gpsLatitude"],
        });
      }
      return;
    }
    if (!data.buildingAddress?.trim() || data.buildingAddress.trim().length < 5) {
      ctx.addIssue({
        code: "custom",
        message: "Adresa e godinës është e detyrueshme",
        path: ["buildingAddress"],
      });
    }
  });

export type RegistrationBasicDataInput = z.infer<typeof registrationBasicDataSchema>;
