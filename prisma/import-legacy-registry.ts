import "dotenv/config";
import { join } from "path";
import {
  ApplicationStatus,
  ApplicationType,
  CertificateStatus,
  CertificateType,
  ElevatorStatus,
  ElevatorType,
  InspectionResult,
  InspectionType,
  OrgStatus,
  OrgType,
  PrismaClient,
} from "@prisma/client";
import {
  parseLegacyPeriodicFile10,
  parseLegacyRegistryFile09,
  parseLegacyRegistryOverlayFile10,
  type LegacyPeriodicEntry,
  type LegacyRegistryRow,
} from "../src/lib/migration/legacy-excel-parser";
import {
  parseRegistryNumber,
  resolveMunicipality,
  type MunicipalityRecord,
} from "../src/lib/migration/legacy-city-resolver";
import {
  formatInspectionFindings,
  parseLegacyPeriodicFindings,
} from "../src/lib/elevators/format-inspection-findings";
import { displayOmBody, normalizeOmBodyOrganizationName } from "../src/lib/elevators/format-om-body";
import { resolveLegacyDistrictCode as districtFromMun } from "../src/lib/registration/municipality-legacy-district";
import { QrService } from "../src/lib/services/qr-service";

const prisma = new PrismaClient();

const FILE_09 = join(process.cwd(), "09_ISHMT_REGJISTRI_ASHENSOREVE.xlsm");
const FILE_10 = join(process.cwd(), "10_ISHMT_REGJISTRI_ASHENSOREVE_PERIODIKET.xlsx");

const DRY_RUN = process.argv.includes("--dry-run");

type ImportStats = {
  registryRows: number;
  imported: number;
  skippedExisting: number;
  skippedDuplicate: number;
  periodicImported: number;
  periodicSkipped: number;
  errors: string[];
  municipalityMapping: Record<string, number>;
};

function syntheticNipt(prefix: string, key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const digits = String(hash % 100000000).padStart(8, "0");
  return `${prefix[0] ?? "L"}${digits}${(prefix.slice(-1) || "X")}`.slice(0, 20);
}

/** NIPT nga Excel mund të përmbajë dy vlera në një qelizë - merr të parën e vlefshme. */
function sanitizeNipt(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().toUpperCase();
  const tokens = raw.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (/^[A-Z]\d{8}[A-Z]$/.test(token)) return token;
  }
  const first = tokens[0] ?? raw;
  return first.length <= 20 ? first : first.slice(0, 20);
}

function truncateName(value: string, max = 255): string {
  return value.length <= max ? value : value.slice(0, max);
}

function parseYear(value: string | null): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function isAnnulled(nenshkrimi: string | null | undefined): boolean {
  return (nenshkrimi ?? "").trim().toUpperCase() === "ANULLIM";
}

async function ensurePlaceholderOrgs(actorId: string) {
  const unknownInstaller = await prisma.organization.upsert({
    where: { nipt: "LEGACY-INSTALLER-00" },
    update: { name: "Instalues i panjohur (regjistër i ngarkuar)" },
    create: {
      type: OrgType.INSTALLER,
      name: "Instalues i panjohur (regjistër i ngarkuar)",
      nipt: "LEGACY-INSTALLER-00",
      status: OrgStatus.ACTIVE,
      createdById: actorId,
    },
  });

  const unknownCertifier = await prisma.organization.upsert({
    where: { nipt: "LEGACY-CERTIFIER-00" },
    update: { name: "Certifikues i panjohur (regjistër i ngarkuar)" },
    create: {
      type: OrgType.CERTIFIER,
      name: "Certifikues i panjohur (regjistër i ngarkuar)",
      nipt: "LEGACY-CERTIFIER-00",
      status: OrgStatus.ACTIVE,
      createdById: actorId,
    },
  });

  return { unknownInstaller, unknownCertifier };
}

async function findOrCreateOrg(input: {
  type: OrgType;
  name: string | null | undefined;
  nipt: string | null | undefined;
  actorId: string;
  fallback: { id: string; name?: string };
  municipalityId?: string | null;
}): Promise<{ id: string; name: string }> {
  const niptRaw = sanitizeNipt(input.nipt);
  const resolvedName = input.name?.trim()
    ? truncateName(input.name.trim())
    : niptRaw
      ? truncateName(`Subjekt ${niptRaw}`)
      : truncateName("I panjohur (regjistër i ngarkuar)");

  if (niptRaw) {
    const byNipt = await prisma.organization.findUnique({ where: { nipt: niptRaw } });
    if (byNipt) return { id: byNipt.id, name: byNipt.name };
  }

  const byName = await prisma.organization.findFirst({
    where: { type: input.type, name: { equals: resolvedName, mode: "insensitive" }, deletedAt: null },
  });
  if (byName) return { id: byName.id, name: byName.name };

  if (!input.name?.trim() && !niptRaw && input.fallback.id) {
    return { id: input.fallback.id, name: input.fallback.name ?? resolvedName };
  }

  const nipt = niptRaw ?? syntheticNipt("LEGACY", `${input.type}:${resolvedName}`);
  const created = await prisma.organization.create({
    data: {
      type: input.type,
      name: resolvedName,
      nipt,
      status: OrgStatus.ACTIVE,
      municipalityId: input.municipalityId ?? undefined,
      createdById: input.actorId,
    },
  });
  return { id: created.id, name: created.name };
}

async function findOrCreateCertifierOrg(
  omiNumber: string | null | undefined,
  actorId: string,
  fallbackId: string,
): Promise<string> {
  const omi = omiNumber?.trim();
  if (!omi) return fallbackId;
  const name = displayOmBody(omi, omi);
  const nipt = syntheticNipt("O", omi);
  const existing = await prisma.organization.findFirst({
    where: {
      type: OrgType.CERTIFIER,
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { name: { equals: `OMI ${name}`, mode: "insensitive" } },
        { name: { equals: `OMI ${omi}`, mode: "insensitive" } },
        { name: { equals: omi, mode: "insensitive" } },
      ],
    },
  });
  if (existing) {
    if (existing.name !== name) {
      await prisma.organization.update({ where: { id: existing.id }, data: { name } });
    }
    return existing.id;
  }

  const created = await prisma.organization.create({
    data: {
      type: OrgType.CERTIFIER,
      name,
      nipt,
      status: OrgStatus.ACTIVE,
      createdById: actorId,
    },
  });
  return created.id;
}

async function normalizeCertifierOrgDisplayNames(): Promise<number> {
  const certifiers = await prisma.organization.findMany({
    where: { type: OrgType.CERTIFIER, deletedAt: null },
    select: { id: true, name: true },
  });
  let updated = 0;
  for (const org of certifiers) {
    const normalized = normalizeOmBodyOrganizationName(org.name);
    if (normalized) {
      await prisma.organization.update({ where: { id: org.id }, data: { name: normalized } });
      updated++;
    }
  }
  return updated;
}

function dedupeRegistryRows(rows: LegacyRegistryRow[]): {
  unique: LegacyRegistryRow[];
  skippedDuplicate: number;
} {
  const seen = new Set<string>();
  const unique: LegacyRegistryRow[] = [];
  let skippedDuplicate = 0;
  for (const row of rows) {
    const key = row.registryNumber.trim().toUpperCase();
    if (seen.has(key)) {
      skippedDuplicate++;
      continue;
    }
    seen.add(key);
    unique.push(row);
  }
  return { unique, skippedDuplicate };
}

async function importRegistryRow(
  row: LegacyRegistryRow,
  ctx: {
    actorId: string;
    inspectorId: string;
    municipalities: MunicipalityRecord[];
    unknownInstallerId: string;
    unknownCertifierId: string;
    stats: ImportStats;
  },
) {
  const registryKey = row.registryNumber.trim().toUpperCase();

  const existing = await prisma.elevator.findUnique({ where: { registryNumber: registryKey } });
  if (existing) {
    ctx.stats.skippedExisting++;
    return existing.id;
  }

  const munResult = resolveMunicipality(ctx.municipalities, {
    qyteti: row.qyteti,
    registryNumber: row.registryNumber,
  });
  if (!munResult.municipality) {
    throw new Error(`Bashkia '${munResult.municipalityCode}' nuk u gjet në DB për ${registryKey}`);
  }

  ctx.stats.municipalityMapping[munResult.method] =
    (ctx.stats.municipalityMapping[munResult.method] ?? 0) + 1;

  const municipality = munResult.municipality;
  const legacyDistrict =
    parseRegistryNumber(row.registryNumber).districtCode ??
    districtFromMun(municipality);

  const ownerOrg = await findOrCreateOrg({
    type: OrgType.OWNER,
    name: row.personiPergjegjes,
    nipt: row.ownerNipt,
    actorId: ctx.actorId,
    fallback: { id: "", name: "" },
    municipalityId: municipality.id,
  });

  const installerOrg = await findOrCreateOrg({
    type: OrgType.INSTALLER,
    name: row.instaluesi,
    nipt: row.installerNipt,
    actorId: ctx.actorId,
    fallback: { id: ctx.unknownInstallerId, name: "Instalues i panjohur" },
    municipalityId: municipality.id,
  });

  const certifierOrgId = await findOrCreateCertifierOrg(
    row.omiNumber,
    ctx.actorId,
    ctx.unknownCertifierId,
  );

  const appNumber = `MIG-${registryKey.replace(/\s+/g, "-")}`.slice(0, 30);
  const registrationDate = row.registrationDate ?? new Date();
  const buildingAddress = row.vendodhja?.trim() || "-";
  const manufacturer = row.marka?.trim() || "-";
  const serialNumber = row.serialNumber?.trim() || `LEGACY-${registryKey.replace(/\s+/g, "-")}`;
  const status = isAnnulled(row.nenshkrimi) ? ElevatorStatus.DEREGISTERED : ElevatorStatus.ACTIVE;

  const legacyPayload = {
    sourceFile: row.sourceFile,
    sourceRow: row.sourceRow,
    originalQyteti: munResult.originalQyteti,
    mappedMunicipalityCode: municipality.code,
    mappedMunicipalityName: municipality.nameSq,
    municipalityMappingMethod: munResult.method,
    muaji: row.muaji,
    viti: row.viti,
    qellimiPerdorimitRaw: row.qellimiPerdorimit,
    tipiGodinesRaw: row.tipiGodines,
    protocolNumber: row.protocolNumber,
    chiefInspector: row.chiefInspector,
    nenshkrimi: row.nenshkrimi,
    legacyInstallerName: row.instaluesi,
    legacyOwnerName: row.personiPergjegjes,
    ownerNiptRaw: row.ownerNipt,
    installerNiptRaw: row.installerNipt,
  };

  const elevatorId = await prisma.$transaction(async (tx) => {
    const application = await tx.application.create({
      data: {
        applicationNumber: appNumber,
        type: ApplicationType.NEW_REGISTRATION,
        status: ApplicationStatus.CLOSED,
        ownerOrgId: ownerOrg.id,
        installerOrgId: installerOrg.id,
        certifierOrgId: certifierOrgId,
        submittedAt: registrationDate,
        approvedAt: registrationDate,
        reviewedAt: registrationDate,
        createdById: ctx.actorId,
        data: {
          create: {
            buildingAddress,
            municipalityId: municipality.id,
            legacyDistrictCode: legacyDistrict,
            responsibleEntityName: row.personiPergjegjes,
            responsibleEntityIdentifier: sanitizeNipt(row.ownerNipt) ?? row.ownerNipt?.slice(0, 30) ?? null,
            notes: row.komente,
            manufacturer,
            serialNumber,
            manufacturingYear: parseYear(row.vitiInstalimit),
            omiNumber: row.omiNumber,
            examinationType: row.llojiEkzaminimit,
            examinationDate: row.examinationDate,
            applicationDate: registrationDate,
            registrationExtendedData: legacyPayload,
          },
        },
      },
    });

    const elevator = await tx.elevator.create({
      data: {
        registryNumber: registryKey,
        applicationId: application.id,
        status,
        ownerOrgId: ownerOrg.id,
        installerOrgId: installerOrg.id,
        certifierOrgId: certifierOrgId,
        buildingAddress,
        municipalityId: municipality.id,
        registrationDate,
        activationDate: status === ElevatorStatus.ACTIVE ? registrationDate : null,
        deregistrationDate: status === ElevatorStatus.DEREGISTERED ? registrationDate : null,
        deregistrationReason: isAnnulled(row.nenshkrimi) ? "ANULLIM (regjistër i ngarkuar)" : null,
      },
    });

    const techVersion = await tx.elevatorTechnicalDataVersion.create({
      data: {
        elevatorId: elevator.id,
        applicationId: application.id,
        versionNumber: 1,
        isCurrent: true,
        elevatorType: ElevatorType.PASSENGER,
        manufacturer,
        serialNumber,
        manufacturingYear: parseYear(row.vitiInstalimit),
        floorsServed: 0,
        additionalData: {
          legacyImport: true,
          floorsServedUnknown: true,
          marka: row.marka,
        },
        createdById: ctx.actorId,
      },
    });

    await tx.elevatorTechnicalData.create({
      data: {
        elevatorId: elevator.id,
        elevatorType: ElevatorType.PASSENGER,
        manufacturer,
        serialNumber,
        manufacturingYear: parseYear(row.vitiInstalimit),
        floorsServed: 0,
        additionalData: { legacyImport: true, floorsServedUnknown: true },
        currentVersionId: techVersion.id,
      },
    });

    if (row.caCr) {
      const certNumber = row.caCr.trim();
      const certExists = await tx.certificate.findUnique({ where: { certificateNumber: certNumber } });
      if (!certExists) {
        await tx.certificate.create({
          data: {
            certificateNumber: certNumber,
            elevatorId: elevator.id,
            type: CertificateType.REGISTRATION,
            status: CertificateStatus.ACTIVE,
            issuedDate: row.examinationDate ?? registrationDate,
            issuedByOrgId: certifierOrgId,
            issuedByUserId: ctx.actorId,
            applicationId: application.id,
          },
        });
      }
    }

    if (row.examinationDate || row.llojiEkzaminimit) {
      await tx.inspection.create({
        data: {
          elevatorId: elevator.id,
          inspectorId: ctx.inspectorId,
          type: InspectionType.INITIAL,
          status: InspectionResult.PASS,
          result: InspectionResult.PASS,
          scheduledDate: row.examinationDate ?? registrationDate,
          conductedDate: row.examinationDate,
          examinationType: row.llojiEkzaminimit,
          approvedBodyNumber: row.omiNumber,
          findings: null,
        },
      });
    }

    return elevator.id;
  });

  ctx.stats.imported++;
  try {
    await QrService.ensureQrForElevator(elevatorId, ctx.actorId);
  } catch (err) {
    ctx.stats.errors.push(
      `QR ${row.registryNumber}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  return elevatorId;
}

async function importPeriodicEntry(
  entry: LegacyPeriodicEntry,
  ctx: { inspectorId: string; stats: ImportStats },
) {
  const registryKey = entry.registryNumber.trim().toUpperCase();
  const elevator = await prisma.elevator.findUnique({ where: { registryNumber: registryKey } });
  if (!elevator) {
    ctx.stats.periodicSkipped++;
    return;
  }

  const dedupeKey = `${registryKey}|${entry.semesterLabel}|${entry.raporti ?? ""}|${entry.data?.toISOString() ?? ""}`;
  const existing = await prisma.inspection.findFirst({
    where: {
      elevatorId: elevator.id,
      type: InspectionType.PERIODIC,
      findings: { contains: entry.raporti ?? entry.semesterLabel },
    },
  });
  if (existing && entry.raporti && existing.findings?.includes(entry.raporti)) {
    ctx.stats.periodicSkipped++;
    return;
  }

  const conducted = entry.data ?? null;
  if (!conducted && !entry.raporti && !entry.trupa) {
    ctx.stats.periodicSkipped++;
    return;
  }

  await prisma.inspection.create({
    data: {
      elevatorId: elevator.id,
      inspectorId: ctx.inspectorId,
      type: InspectionType.PERIODIC,
      status: InspectionResult.PASS,
      result: InspectionResult.PASS,
      scheduledDate: conducted ?? new Date(),
      conductedDate: conducted,
      approvedBodyNumber: entry.trupa,
      findings: JSON.stringify({
        legacyImport: true,
        semesterLabel: entry.semesterLabel,
        trupa: entry.trupa,
        raporti: entry.raporti,
        muaji: entry.muaji,
        dedupeKey,
      }),
    },
  });
  ctx.stats.periodicImported++;
}

async function syncLegacyRegistrySequences(rows: LegacyRegistryRow[], municipalities: MunicipalityRecord[]) {
  const byMun = new Map<string, number>();
  const munByLegacy = new Map(
    municipalities.map((m) => [districtFromMun(m).toUpperCase(), m.id] as const),
  );

  for (const row of rows) {
    const { sequence, districtCode } = parseRegistryNumber(row.registryNumber);
    if (!sequence || !districtCode) continue;
    const munId = munByLegacy.get(districtCode);
    if (!munId) continue;
    byMun.set(munId, Math.max(byMun.get(munId) ?? 0, sequence));
  }

  for (const [municipalityId, lastSequence] of byMun) {
    await prisma.legacyRegistrySequence.upsert({
      where: { municipalityId },
      update: { lastSequence: { set: lastSequence } },
      create: { municipalityId, lastSequence },
    });
  }
}

async function main() {
  console.log(DRY_RUN ? "=== DRY RUN (pa shkrim në DB) ===\n" : "=== IMPORT LEGACY REGISTRY ===\n");

  const admin = await prisma.authUser.findFirst({
    where: { email: "admin@ishmt.gov.al" },
  });
  const inspector =
    (await prisma.authUser.findFirst({ where: { email: "kryeinspektor@ishmt.gov.al" } })) ?? admin;
  if (!admin || !inspector) {
    throw new Error("Mungon përdoruesi admin@ishmt.gov.al ose kryeinspektor@ishmt.gov.al. Ekzekutoni db:seed.");
  }

  const municipalities = await prisma.geoMunicipality.findMany({
    where: { isActive: true },
    select: { id: true, code: true, nameSq: true, legacyRegistryCode: true },
  });

  const rows09 = parseLegacyRegistryFile09(FILE_09);
  const overlay10 = parseLegacyRegistryOverlayFile10(FILE_10);
  const periodic = parseLegacyPeriodicFile10(FILE_10);

  const merged: LegacyRegistryRow[] = rows09.map((row) => {
    const overlay = overlay10.get(row.registryNumber.trim().toUpperCase());
    if (!overlay) return row;
    return {
      ...row,
      nenshkrimi: overlay.nenshkrimi ?? row.nenshkrimi,
      registrationDate: overlay.registrationDate ?? row.registrationDate,
    };
  });

  const { unique, skippedDuplicate } = dedupeRegistryRows(merged);

  const stats: ImportStats = {
    registryRows: unique.length,
    imported: 0,
    skippedExisting: 0,
    skippedDuplicate,
    periodicImported: 0,
    periodicSkipped: 0,
    errors: [],
    municipalityMapping: {},
  };

  if (DRY_RUN) {
    for (const row of unique.slice(0, 20)) {
      const m = resolveMunicipality(municipalities, {
        qyteti: row.qyteti,
        registryNumber: row.registryNumber,
      });
      console.log(
        `${row.registryNumber} | QYTETI: ${row.qyteti ?? "-"} → ${m.municipality?.nameSq ?? "?"} (${m.method})`,
      );
    }
    console.log(`\n... dhe ${Math.max(0, unique.length - 20)} rreshta të tjerë`);
    console.log(`Regjistër: ${unique.length}, duplikatë Excel: ${skippedDuplicate}, periodike: ${periodic.length}`);
    return;
  }

  const { unknownInstaller, unknownCertifier } = await ensurePlaceholderOrgs(admin.id);

  const normalizedOrgs = await normalizeCertifierOrgDisplayNames();
  if (normalizedOrgs > 0) {
    console.log(`U normalizuan ${normalizedOrgs} emra organizatash certifikuese (OMI → OM).`);
  }

  const ctx = {
    actorId: admin.id,
    inspectorId: inspector.id,
    municipalities,
    unknownInstallerId: unknownInstaller.id,
    unknownCertifierId: unknownCertifier.id,
    stats,
  };

  console.log(`Duke importuar ${unique.length} ashensorë...`);
  for (let i = 0; i < unique.length; i++) {
    const row = unique[i];
    try {
      await importRegistryRow(row, ctx);
      if ((i + 1) % 200 === 0) console.log(`  ${i + 1}/${unique.length}...`);
    } catch (err) {
      const msg = `${row.registryNumber}: ${err instanceof Error ? err.message : String(err)}`;
      stats.errors.push(msg);
    }
  }

  console.log(`Duke importuar ${periodic.length} regjistrime periodike...`);
  for (const entry of periodic) {
    try {
      await importPeriodicEntry(entry, { inspectorId: inspector.id, stats });
    } catch (err) {
      stats.errors.push(
        `PERIODIK ${entry.registryNumber}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  await syncLegacyRegistrySequences(unique, municipalities);

  console.log("\n=== PËRFUNDIM ===");
  console.log(`Importuar: ${stats.imported}`);
  console.log(`Ekzistonin: ${stats.skippedExisting}`);
  console.log(`Duplikatë Excel: ${stats.skippedDuplicate}`);
  console.log(`Periodike importuar: ${stats.periodicImported}`);
  console.log(`Periodike anashkaluar: ${stats.periodicSkipped}`);
  console.log(`Gabime: ${stats.errors.length}`);
  console.log("Mapping bashkish:", stats.municipalityMapping);
  if (stats.errors.length) {
    console.log("\nShembuj gabimesh:");
    stats.errors.slice(0, 15).forEach((e) => console.log(" -", e));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
