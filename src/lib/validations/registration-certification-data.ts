import { z } from "zod";

export const registrationCertificationDataSchema = z
  .object({
    omiNumber: z.string().min(2, "Numri OMI është i detyrueshëm"),
    certifierResponsiblePerson: z.string().optional(),
    examinationType: z.enum(["EKZAMINIM_I_PLOTE", "EKZAMINIM_PERIODIK"]),
    examinationDate: z.string().min(1, "Data e ekzaminimit është e detyrueshme"),
    conformityResultCode: z.enum(["KONFORM", "JO_KONFORM", "KONFORM_ME_KUSHTE"]),
    certificateReference: z.string().min(1, "Nr. reference është i detyrueshëm"),
    reportNumber: z.string().optional(),
    euDeclarationPresent: z.enum(["PO", "JO", "NUK_APLIKOHET"]),
    euDeclarationNumber: z.string().optional(),
    certifierTechnicalNotes: z.string().optional(),
    installationCertificateNumber: z.string().min(1, "Nr. certifikate është i detyrueshëm"),
    installationCertificateDate: z.string().min(1, "Data e certifikatës është e detyrueshme"),
  })
  .superRefine((data, ctx) => {
    if (data.euDeclarationPresent === "PO" && !data.euDeclarationNumber) {
      ctx.addIssue({ code: "custom", message: "Nr. deklaratës EU është i detyrueshëm", path: ["euDeclarationNumber"] });
    }
  });

export type RegistrationCertificationDataInput = z.infer<typeof registrationCertificationDataSchema>;
