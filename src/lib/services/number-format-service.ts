import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const REGISTRY_FORMAT_KEYS = {
  ELV_MODERN: "ELV_MODERN",
  ISHMT_LEGACY: "ISHMT_LEGACY",
} as const;

export const CERTIFICATE_FORMAT_KEYS = {
  /** Certifikata e re (CR) - regjistri aktiv pas hyrjes në fuqi të Udhëzimit. */
  CR_PREFIX: "CR_PREFIX",
  /** Certifikatë aktuale (CA) - regjistri ekzistues/legacy para Udhëzimit (4 shifra). */
  CA_PREFIX: "CA_PREFIX",
} as const;

export type RegistryFormatKey = (typeof REGISTRY_FORMAT_KEYS)[keyof typeof REGISTRY_FORMAT_KEYS];
export type CertificateFormatKey = (typeof CERTIFICATE_FORMAT_KEYS)[keyof typeof CERTIFICATE_FORMAT_KEYS];

export type NumberFormatConfig = {
  registry: {
    active: RegistryFormatKey;
    formats: Record<RegistryFormatKey, string>;
  };
  certificate: {
    active: CertificateFormatKey;
    formats: Record<CertificateFormatKey, string>;
  };
};

export const DEFAULT_NUMBER_FORMAT_CONFIG: NumberFormatConfig = {
  registry: {
    active: REGISTRY_FORMAT_KEYS.ISHMT_LEGACY,
    formats: {
      ELV_MODERN: "ELV-{year}-{munCode}-{seq:6}",
      ISHMT_LEGACY: "{seq:6} {munLegacyCode}",
    },
  },
  certificate: {
    active: CERTIFICATE_FORMAT_KEYS.CR_PREFIX,
    formats: {
      CR_PREFIX: "CR{seq:5}",
      CA_PREFIX: "CA{seq:4}",
    },
  },
};

type FormatContext = {
  year: number;
  munCode: string;
  munLegacyCode: string;
  sequence: number;
};

function applyTemplate(template: string, ctx: FormatContext): string {
  return template
    .replace("{year}", String(ctx.year))
    .replace("{munCode}", ctx.munCode)
    .replace("{munLegacyCode}", ctx.munLegacyCode)
    .replace(/\{seq:(\d+)\}/g, (_match, width: string) =>
      String(ctx.sequence).padStart(Number(width), "0"),
    );
}

export class NumberFormatService {
  static async getConfig(): Promise<NumberFormatConfig> {
    const [registryRow, certificateRow] = await Promise.all([
      db.systemConfig.findUnique({ where: { key: "registry_number_format" } }),
      db.systemConfig.findUnique({ where: { key: "certificate_number_format" } }),
    ]);

    const config = structuredClone(DEFAULT_NUMBER_FORMAT_CONFIG);

    if (registryRow?.value && typeof registryRow.value === "object") {
      const value = registryRow.value as Partial<NumberFormatConfig["registry"]>;
      if (value.active && value.active in config.registry.formats) {
        config.registry.active = value.active as RegistryFormatKey;
      }
      if (value.formats) {
        config.registry.formats = { ...config.registry.formats, ...value.formats };
      }
    }

    if (certificateRow?.value && typeof certificateRow.value === "object") {
      const value = certificateRow.value as Partial<NumberFormatConfig["certificate"]>;
      if (value.active && value.active in config.certificate.formats) {
        config.certificate.active = value.active as CertificateFormatKey;
      }
      if (value.formats) {
        config.certificate.formats = { ...config.certificate.formats, ...value.formats };
      }
    }

    return config;
  }

  static async nextRegistryNumber(
    municipalityId: string,
    municipality: { code: string; legacyRegistryCode?: string | null },
    tx: Prisma.TransactionClient,
  ) {
    const config = await this.getConfig();
    const formatKey = config.registry.active;
    const template = config.registry.formats[formatKey];
    const year = new Date().getFullYear();
    const munLegacyCode = municipality.legacyRegistryCode;

    if (formatKey === REGISTRY_FORMAT_KEYS.ISHMT_LEGACY && !munLegacyCode) {
      throw new Error("Bashkisë i mungon kodi zyrtar i regjistrit. Plotësoni legacyRegistryCode para gjenerimit të numrit.");
    }

    const maxAttempts = 200;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let sequence: number;

      if (formatKey === REGISTRY_FORMAT_KEYS.ISHMT_LEGACY) {
        const seq = await tx.legacyRegistrySequence.upsert({
          where: { municipalityId },
          update: { lastSequence: { increment: 1 } },
          create: { municipalityId, lastSequence: 1 },
        });
        sequence = seq.lastSequence;
      } else {
        const seq = await tx.registrySequence.upsert({
          where: { municipalityId_year: { municipalityId, year } },
          update: { lastSequence: { increment: 1 } },
          create: { municipalityId, year, lastSequence: 1 },
        });
        sequence = seq.lastSequence;
      }

      const registryNumber = applyTemplate(template, {
        year,
        munCode: municipality.code,
        munLegacyCode: munLegacyCode ?? municipality.code,
        sequence,
      });

      const existing = await tx.elevator.findFirst({
        where: { registryNumber },
        select: { id: true },
      });

      if (!existing) {
        return registryNumber;
      }
    }

    throw new Error(
      "Nuk u gjenerua dot numër regjistri unik. Kontrolloni sekuencën e bashkisë dhe regjistrin ekzistues.",
    );
  }

  /**
   * Sequential, human-readable maintenance/inspection contract number.
   * Format: `KM-{year}-{seq:5}` (mirëmbajtje) ose `KI-{year}-{seq:5}` (inspektim periodik).
   * Reuses the per-(year, typeCode) counter table so numbers are gap-free and unique.
   */
  static async nextContractNumber(
    serviceType: "MAINTENANCE" | "PERIODIC_INSPECTION",
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx ?? db;
    const year = new Date().getFullYear();
    const typeCode = serviceType === "PERIODIC_INSPECTION" ? "KI" : "KM";

    const seq = await client.certificateSequence.upsert({
      where: { year_typeCode: { year, typeCode } },
      update: { lastSequence: { increment: 1 } },
      create: { year, typeCode, lastSequence: 1 },
    });

    return `${typeCode}-${year}-${String(seq.lastSequence).padStart(5, "0")}`;
  }

  /**
   * Klasifikon serinë e certifikatës sipas Udhëzimit:
   * `CA` = Certifikatë Aktuale (regjistri ekzistues, 4 shifra),
   * `CR` = Certifikatë e Re (regjistri aktiv, 5 shifra).
   */
  static classifyCertificateSeries(certificateNumber?: string | null): "CA" | "CR" | "OTHER" {
    if (!certificateNumber) return "OTHER";
    const value = certificateNumber.trim().toUpperCase();
    if (value.startsWith("CR")) return "CR";
    if (value.startsWith("CA")) return "CA";
    return "OTHER";
  }

  /** Formaton një numër certifikate legacy (CA) me 4 shifra, për import/migrim. */
  static formatCaNumber(sequence: number): string {
    return `CA${String(sequence).padStart(4, "0")}`;
  }

  static async nextCertificateNumber(
    typeCode = "REG",
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? db;
    const config = await this.getConfig();
    const formatKey = config.certificate.active;
    const template = config.certificate.formats[formatKey];
    const year = new Date().getFullYear();
    const maxAttempts = 200;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const seq = await client.certificateSequence.upsert({
        where: { year_typeCode: { year, typeCode } },
        update: { lastSequence: { increment: 1 } },
        create: { year, typeCode, lastSequence: 1 },
      });

      const certificateNumber = applyTemplate(template, {
        year,
        munCode: "",
        munLegacyCode: "",
        sequence: seq.lastSequence,
      });

      const existing = await client.certificate.findFirst({
        where: { certificateNumber },
        select: { id: true },
      });

      if (!existing) {
        return certificateNumber;
      }
    }

    throw new Error(
      "Nuk u gjenerua dot numër certifikate unik. Kontrolloni sekuencën e certifikatave dhe regjistrin ekzistues.",
    );
  }
}
