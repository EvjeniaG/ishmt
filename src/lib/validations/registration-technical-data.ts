import { z } from "zod";

export const registrationTechnicalDataSchema = z
  .object({
    brand: z.string().min(1, "Marka është e detyrueshme"),
    model: z.string().optional(),
    manufacturer: z.string().min(1, "Prodhuesi është i detyrueshëm"),
    serialNumber: z.string().min(1, "Numri serial është i detyrueshëm"),
    elevatorDriveType: z.enum([
      "ME_KAVO_TERHEQESE_KONVENCIONALE",
      "ME_KAVO_PA_KABINE",
      "HIDRAULIK",
      "HIDRAULIK_PA_KABINE",
      "PERSONA_ME_AFTESI_TE_KUFIZUAR",
      "TJETER",
    ]),
    elevatorDriveTypeOther: z.string().optional(),
    usageClassification: z.enum([
      "NJEREZISH",
      "NJEREZISH_DHE_MALLRA",
      "NJEREZISH_DHE_PAJISJE_MOTORIKE",
      "NJEREZISH_DHE_SHTRATI",
      "TJETER",
    ]),
    installationDate: z.string().min(1, "Data e instalimit është e detyrueshme"),
    commissioningDate: z.string().optional(),
    installationYear: z.coerce.number().min(1900).max(new Date().getFullYear()),
    capacityKg: z.coerce.number().positive("Kapaciteti duhet të jetë pozitiv"),
    capacityPersons: z.coerce.number().optional(),
    speedRange: z.enum(["NEN_0_15", "NGA_0_15_DERI_1", "NGA_1_DERI_6_5", "MBI_6_5"]),
    stops: z.coerce.number().int().positive(),
    openings: z.coerce.number().int().positive(),
    accessibleForDisabled: z.enum(["PO", "JO"]),
    cabinDimensions: z.string().optional(),
    doorDimensions: z.string().optional(),
    installerTechnicalNotes: z.string().optional(),
    floorsServed: z.coerce.number().int().positive("Numri i kateve është i detyrueshëm"),
  })
  .superRefine((data, ctx) => {
    if (data.elevatorDriveType === "TJETER" && !data.elevatorDriveTypeOther) {
      ctx.addIssue({ code: "custom", message: "Specifikoni tipin", path: ["elevatorDriveTypeOther"] });
    }
  });

export type RegistrationTechnicalDataInput = z.infer<typeof registrationTechnicalDataSchema>;
