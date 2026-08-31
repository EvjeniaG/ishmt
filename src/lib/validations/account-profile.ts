import { z } from "zod";
import { ownerRequiresNipt, ownerSubjectNameRequired } from "@/lib/registration/owner-entity-role";

/** Personi përgjegjës i subjektit (OWNER) - përputhet me regjistrimin. */
export const ownerContactProfileSchema = z.object({
  firstName: z.string().min(2, "Emri është i detyrueshëm"),
  lastName: z.string().min(2, "Mbiemri është i detyrueshëm"),
  fatherName: z.string().min(2, "Atësia është e detyrueshme"),
  personalNumber: z.string().min(8, "Numri Personal është i detyrueshëm"),
  birthDate: z.string().min(1, "Data e Lindjes është e detyrueshme"),
  phone: z.string().min(8, "Numri i telefonit është i detyrueshëm"),
});

/** Të dhënat e subjektit (OWNER) - përputhet me regjistrimin. */
export const ownerOrgProfileSchema = z
  .object({
    name: z.string().optional(),
    nipt: z.string().optional(),
    ownerBuildingRole: z
      .enum([
        "ADMINISTRATOR",
        "PHYSICAL_PERSON",
        "LEGAL_PERSON",
        "CONSTRUCTOR",
        "CONSTRUCTION_COMPANY",
        "OTHER",
      ])
      .optional(),
  })
  .superRefine((data, ctx) => {
    const role = data.ownerBuildingRole;
    if (ownerSubjectNameRequired(role) && (!data.name || data.name.trim().length < 2)) {
      ctx.addIssue({ code: "custom", message: "Emri i subjektit është i detyrueshëm", path: ["name"] });
    }
    if (ownerRequiresNipt(role) && (!data.nipt || data.nipt.trim().length < 5)) {
      ctx.addIssue({ code: "custom", message: "NIPT është i detyrueshëm", path: ["nipt"] });
    }
  });

/** Të dhënat e biznesit (INSTALLER / CERTIFIER / MAINTENANCE). */
export const companyOrgProfileSchema = z.object({
  name: z.string().min(2, "Emri i organizatës është i detyrueshëm"),
});

/** Personi i kontaktit (INSTALLER / CERTIFIER / MAINTENANCE). */
export const companyContactProfileSchema = z.object({
  firstName: z.string().min(2, "Emri është i detyrueshëm"),
  lastName: z.string().min(2, "Mbiemri është i detyrueshëm"),
  phone: z.string().min(8, "Numri i telefonit është i detyrueshëm"),
  personalNumber: z.string().optional(),
});

/** Stafi IQMT / drejtoria - vetëm të dhëna personale. */
export const staffContactProfileSchema = z.object({
  firstName: z.string().min(2, "Emri është i detyrueshëm"),
  lastName: z.string().min(2, "Mbiemri është i detyrueshëm"),
  fatherName: z.string().min(2, "Atësia është e detyrueshme").optional(),
  phone: z.string().min(8, "Numri i telefonit është i detyrueshëm").optional().or(z.literal("")),
  nid: z.string().min(8, "Numri Personal është i detyrueshëm").optional(),
});
