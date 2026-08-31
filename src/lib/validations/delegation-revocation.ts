import { z } from "zod";

export const delegationRevocationReasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Arsyeja duhet të ketë të paktën 10 karaktere.")
    .max(2000, "Arsyeja është shumë e gjatë."),
});
