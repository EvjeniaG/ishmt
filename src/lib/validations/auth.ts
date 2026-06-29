import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email i pavlefshëm"),
  password: z.string().min(1, "Fjalëkalimi është i detyrueshëm"),
});

const PASSWORD_RULES = z
  .string()
  .min(8, "Fjalëkalimi duhet të jetë të paktën 8 karaktere i gjatë")
  .regex(/\d/, "Fjalëkalimi duhet të përmbajë të paktën një numër")
  .regex(/[a-z]/, "Fjalëkalimi duhet të përmbajë të paktën një gërmë jo-kapitale")
  .regex(/[A-Z]/, "Fjalëkalimi duhet të përmbajë të paktën një gërmë kapitale");

export const ownerRegisterSchema = z
  .object({
    personalNumber: z.string().min(8, "Numri Personal është i detyrueshëm"),
    idCardNumber: z.string().min(4, "Numri i Kartës së Identitetit është i detyrueshëm"),
    firstName: z.string().min(2, "Emri është i detyrueshëm"),
    fatherName: z.string().min(2, "Atësia është e detyrueshme"),
    lastName: z.string().min(2, "Mbiemri është i detyrueshëm"),
    motherName: z.string().min(2, "Mëmësia është e detyrueshme"),
    birthDate: z.string().min(1, "Data e Lindjes është e detyrueshme"),
    municipalityId: z.string().uuid("Zgjidhni zyrën tatimore / bashkinë"),
    email: z.string().email("Email i pavlefshëm"),
    phone: z.string().optional(),
    organizationName: z.string().optional(),
    nipt: z.string().optional(),
    password: PASSWORD_RULES,
    confirmPassword: z.string(),
    acceptTerms: z.literal("true", {
      errorMap: () => ({ message: "Duhet të pranoni termat dhe kushtet" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Fjalëkalimet nuk përputhen",
    path: ["confirmPassword"],
  });

const COMPANY_LEVELS = ["INSTALLER", "CERTIFIER", "MAINTENANCE"];
const ORG_CREATING_LEVELS = ["OWNER", "INSTALLER", "CERTIFIER", "MAINTENANCE"];

export const accountRegisterSchema = z
  .object({
    // Public self-registration is restricted to non-privileged external roles only.
    // Institutional ISHMT roles (INSPECTOR, CHIEF_INSPECTOR, ADMIN, DIRECTORATE) must be
    // provisioned internally via admin invitation - never through the public form.
    level: z.enum(["OWNER", "INSTALLER", "CERTIFIER", "MAINTENANCE"]),
    personalNumber: z.string().optional(),
    idCardNumber: z.string().optional(),
    firstName: z.string().min(2, "Emri është i detyrueshëm"),
    fatherName: z.string().optional(),
    lastName: z.string().min(2, "Mbiemri është i detyrueshëm"),
    motherName: z.string().optional(),
    birthDate: z.string().optional(),
    email: z.string().email("Email i pavlefshëm"),
    phone: z.string().optional(),
    organizationName: z.string().optional(),
    nipt: z.string().optional(),
    municipalityId: z.string().optional(),
    password: PASSWORD_RULES,
    confirmPassword: z.string(),
    acceptTerms: z.literal("true", {
      errorMap: () => ({ message: "Duhet të pranoni termat dhe kushtet" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Fjalëkalimet nuk përputhen",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    const isCompany = COMPANY_LEVELS.includes(data.level);
    const orgCreating = ORG_CREATING_LEVELS.includes(data.level);

    if (orgCreating && !data.municipalityId) {
      ctx.addIssue({ code: "custom", message: "Zgjidhni bashkinë", path: ["municipalityId"] });
    }

    if (isCompany) {
      // Companies / businesses authenticate with their NIPT.
      if (!data.nipt || data.nipt.trim().length < 8) {
        ctx.addIssue({ code: "custom", message: "NIPT është i detyrueshëm", path: ["nipt"] });
      }
      if (!data.organizationName || data.organizationName.trim().length < 2) {
        ctx.addIssue({ code: "custom", message: "Emri i organizatës është i detyrueshëm", path: ["organizationName"] });
      }
    } else {
      // Individuals authenticate with their Numri Personal (NID).
      if (!data.personalNumber || data.personalNumber.trim().length < 8) {
        ctx.addIssue({ code: "custom", message: "Numri Personal është i detyrueshëm", path: ["personalNumber"] });
      }
      if (!data.idCardNumber || data.idCardNumber.trim().length < 4) {
        ctx.addIssue({ code: "custom", message: "Numri i Kartës së Identitetit është i detyrueshëm", path: ["idCardNumber"] });
      }
      if (!data.fatherName || data.fatherName.trim().length < 2) {
        ctx.addIssue({ code: "custom", message: "Atësia është e detyrueshme", path: ["fatherName"] });
      }
      if (!data.motherName || data.motherName.trim().length < 2) {
        ctx.addIssue({ code: "custom", message: "Mëmësia është e detyrueshme", path: ["motherName"] });
      }
      if (!data.birthDate) {
        ctx.addIssue({ code: "custom", message: "Data e Lindjes është e detyrueshme", path: ["birthDate"] });
      }
    }
  });

export const maintenanceRegisterSchema = z.object({
  email: z.string().email("Email i pavlefshëm"),
  password: z.string().min(12, "Fjalëkalimi duhet të ketë të paktën 12 karaktere"),
  confirmPassword: z.string(),
  firstName: z.string().min(2, "Emri është i detyrueshëm"),
  lastName: z.string().min(2, "Mbiemri është i detyrueshëm"),
  phone: z.string().optional(),
  organizationName: z.string().min(2, "Emri i kompanisë është i detyrueshëm"),
  nipt: z.string().min(1, "NIPT është i detyrueshëm për validimin QKB"),
  municipalityId: z.string().uuid("Zgjidhni bashkinë"),
  address: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Fjalëkalimet nuk përputhen",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email i pavlefshëm"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(12),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Fjalëkalimet nuk përputhen",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Fjalëkalimi aktual është i detyrueshëm"),
    newPassword: PASSWORD_RULES,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Fjalëkalimet nuk përputhen",
    path: ["confirmPassword"],
  });

export const changeEmailSchema = z.object({
  newEmail: z.string().email("Email i pavlefshëm"),
  currentPassword: z.string().min(1, "Fjalëkalimi aktual është i detyrueshëm"),
});

export const twoFactorPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Fjalëkalimi aktual është i detyrueshëm"),
});

export const twoFactorCodeSchema = z.object({
  currentPassword: z.string().min(1, "Fjalëkalimi aktual është i detyrueshëm"),
  code: z.string().regex(/^\d{6}$/, "Kodi duhet të jetë 6 shifra"),
});
