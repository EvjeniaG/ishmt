import { z } from "zod";

export const citizenReportSchema = z
  .object({
    type: z.enum(["SAFETY_ISSUE", "NO_QR", "COMPLAINT"]),
    description: z.string().min(10, "Përshkrimi duhet të ketë të paktën 10 karaktere").max(4000),
    qrCode: z.string().max(50).optional().or(z.literal("")),
    locationAddress: z.string().max(500).optional().or(z.literal("")),
    reporterName: z.string().max(100).optional().or(z.literal("")),
    reporterEmail: z.string().email("Email i pavlefshëm").optional().or(z.literal("")),
    reporterPhone: z.string().max(20).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if ((data.type === "NO_QR" || data.type === "COMPLAINT") && !data.locationAddress) {
      ctx.addIssue({
        code: "custom",
        message: "Vendndodhja është e detyrueshme për këtë lloj raporti",
        path: ["locationAddress"],
      });
    }
  });

export type CitizenReportInput = z.infer<typeof citizenReportSchema>;
