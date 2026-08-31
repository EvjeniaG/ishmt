import { z } from "zod";

function parseGpsCoordinate(value: string | undefined, kind: "lat" | "lng"): number | undefined {
  if (!value?.trim()) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (kind === "lat" && (n < -90 || n > 90)) return undefined;
  if (kind === "lng" && (n < -180 || n > 180)) return undefined;
  return n;
}

export function parseCitizenReportGps(input: {
  gpsLatitude?: string;
  gpsLongitude?: string;
}): { latitude: number; longitude: number } | null {
  const latitude = parseGpsCoordinate(input.gpsLatitude, "lat");
  const longitude = parseGpsCoordinate(input.gpsLongitude, "lng");
  if (latitude === undefined || longitude === undefined) return null;
  return { latitude, longitude };
}

export const citizenReportSchema = z
  .object({
    type: z.enum(["SAFETY_ISSUE", "NO_QR", "COMPLAINT"]),
    description: z.string().min(10, "Përshkrimi duhet të ketë të paktën 10 karaktere").max(4000),
    qrCode: z.string().max(50).optional().or(z.literal("")),
    locationMode: z.enum(["text", "gps"]).default("text"),
    locationAddress: z.string().max(500).optional().or(z.literal("")),
    gpsLatitude: z.string().optional().or(z.literal("")),
    gpsLongitude: z.string().optional().or(z.literal("")),
    reporterFirstName: z
      .string()
      .trim()
      .min(1, "Emri është i detyrueshëm")
      .max(48, "Emri është shumë i gjatë"),
    reporterLastName: z
      .string()
      .trim()
      .min(1, "Mbiemri është i detyrueshëm")
      .max(48, "Mbiemri është shumë i gjatë"),
    reporterEmail: z.string().email("Email i pavlefshëm").optional().or(z.literal("")),
    reporterPhone: z
      .string()
      .trim()
      .min(8, "Telefoni është i detyrueshëm")
      .max(20, "Numri i telefonit është shumë i gjatë"),
  })
  .superRefine((data, ctx) => {
    const requiresLocation = data.type === "NO_QR" || data.type === "COMPLAINT";
    const hasText = Boolean(data.locationAddress?.trim());
    const gps = parseCitizenReportGps(data);

    if (data.locationMode === "gps") {
      if (requiresLocation && !gps) {
        ctx.addIssue({
          code: "custom",
          message: "Përdorni vendndodhjen time ose shkruani adresën para dërgimit të raportit",
          path: ["gpsLatitude"],
        });
      }
      return;
    }

    if (requiresLocation && !hasText) {
      ctx.addIssue({
        code: "custom",
        message: "Vendndodhja me shkrim është e detyrueshme për këtë lloj raporti",
        path: ["locationAddress"],
      });
    }
  });

export type CitizenReportInput = z.infer<typeof citizenReportSchema>;

export function formatCitizenReporterName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}
