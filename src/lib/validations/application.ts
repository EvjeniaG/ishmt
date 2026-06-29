import { z } from "zod";

export const locationDataSchema = z.object({
  buildingAddress: z.string().min(5, "Adresa e ndërtesës është e detyrueshme"),
  municipalityId: z.string().uuid("Zgjidhni bashkinë"),
  administrativeUnitId: z.string().uuid().optional(),
  buildingName: z.string().optional(),
  gpsLatitude: z.coerce.number().optional(),
  gpsLongitude: z.coerce.number().optional(),
});

export const technicalDataSchema = z.object({
  elevatorType: z.enum(["PASSENGER", "FREIGHT", "SERVICE", "HANDICAPPED", "ESCALATOR", "MOVING_WALK"]),
  manufacturer: z.string().min(2, "Prodhuesi është i detyrueshëm"),
  model: z.string().optional(),
  serialNumber: z.string().min(2, "Numri serial është i detyrueshëm"),
  manufacturingYear: z.coerce.number().int().min(1950).max(new Date().getFullYear()).optional(),
  capacityKg: z.coerce.number().int().positive().optional(),
  capacityPersons: z.coerce.number().int().positive().optional(),
  speedMs: z.coerce.number().positive().optional(),
  floorsServed: z.coerce.number().int().min(2, "Min. 2 kate"),
  stops: z.coerce.number().int().positive().optional(),
  driveType: z.string().optional(),
  certifierOrgId: z.string().uuid("Zgjidhni kompaninë certifikuese").nullish().transform((v) => v ?? undefined),
});

export const certificationDataSchema = z.object({
  installationCertificateNumber: z.string().min(3, "Numri i certifikatës është i detyrueshëm"),
  installationCertificateDate: z.coerce.date(),
  certifierNotes: z.string().optional(),
  omiNumber: z.string().optional(),
  examinationType: z.string().optional(),
  examinationDate: z.coerce.date().optional(),
  conformityResult: z.enum(["CONFORM", "NON_CONFORM", "CONDITIONAL"], {
    required_error: "Zgjidhni rezultatin e përputhshmërisë",
  }),
  certificateReference: z.string().optional(),
  certifierTechnicalNotes: z.string().optional(),
});

export const reviewDecisionSchema = z.object({
  reason: z.string().min(5, "Arsyeja është e detyrueshme"),
  returnToRoles: z
    .array(z.enum(["OWNER", "INSTALLER", "CERTIFIER"]))
    .min(1, "Zgjidhni të paktën një palë për kthim"),
  requiredCorrection: z.string().min(5, "Korrigjimi i kërkuar është i detyrueshëm").optional(),
});
