import { z } from "zod";

export const registrationBasicDataSchema = z
  .object({
    applicationDate: z.string().min(1, "Data e aplikimit është e detyrueshme"),
    elevatorConditionType: z.enum(["NEW", "EXISTING"]),
    applicationSubtype: z.enum(["FIRST", "ADDITIONAL"]),
    existingRegisteredElevatorsCount: z.coerce.number().optional(),
    responsibleEntityType: z.enum([
      "ADMINISTRATOR",
      "OWNERS_ASSEMBLY",
      "PHYSICAL_PERSON",
      "LEGAL_PERSON",
      "CONSTRUCTOR",
      "CONSTRUCTION_COMPANY",
    ]),
    responsibleEntityName: z.string().min(2, "Emri i subjektit përgjegjës është i detyrueshëm"),
    responsibleIdentifierType: z.enum(["NID", "NIPT"]),
    responsibleIdentifier: z.string().min(5, "NID / NIPT është i detyrueshëm"),
    responsibleAddress: z.string().min(5, "Adresa është e detyrueshme"),
    responsiblePhone: z.string().min(8, "Telefoni është i detyrueshëm"),
    responsibleEmail: z.string().email("Email i pavlefshëm"),
    representedBy: z.string().optional(),
    representativePosition: z.string().optional(),
    buildingName: z.string().optional(),
    buildingAddress: z.string().min(5, "Adresa e godinës është e detyrueshme"),
    municipalityId: z.string().uuid("Zgjidhni bashkinë"),
    administrativeUnitId: z.string().uuid().optional().or(z.literal("")),
    entrance: z.string().optional(),
    specificPosition: z.string().optional(),
    registrationBuildingType: z.enum([
      "VEND_PUNE_QENDER_TREGTARE",
      "NDERTESA_NE_BASHKEPRONESI",
      "MJEDISE_SHTEPIAKE",
      "NDERTESE_PUBLIKE",
    ]),
    buildingMainUse: z.string().min(2, "Natyra e përdorimit është e detyrueshme"),
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
    if (data.applicationSubtype === "ADDITIONAL" && !data.existingRegisteredElevatorsCount) {
      ctx.addIssue({
        code: "custom",
        message: "Numri i ashensorëve të regjistruar më parë është i detyrueshëm",
        path: ["existingRegisteredElevatorsCount"],
      });
    }
    if (data.registrationBuildingType === "VEND_PUNE_QENDER_TREGTARE") {
      if (!data.businessNameIfWorkplace) {
        ctx.addIssue({ code: "custom", message: "Emri tregtar është i detyrueshëm", path: ["businessNameIfWorkplace"] });
      }
      if (!data.businessNiptIfWorkplace) {
        ctx.addIssue({ code: "custom", message: "NIPT i subjektit është i detyrueshëm", path: ["businessNiptIfWorkplace"] });
      }
    }
    if (data.usagePurposeCode === "TJETER" && !data.usagePurposeOther) {
      ctx.addIssue({ code: "custom", message: "Specifikoni qëllimin", path: ["usagePurposeOther"] });
    }
  });

export type RegistrationBasicDataInput = z.infer<typeof registrationBasicDataSchema>;
