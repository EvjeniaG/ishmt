import {
  OrgStatus,
  OrgType,
  PrismaClient,
  QkbValidationStatus,
  TemplateType,
} from "@prisma/client";
import { seedDemoLicensedClaimPools } from "./lib/seed-demo-om-claim-pool";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { join } from "path";
import { ALL_PERMISSION_CODES } from "../src/lib/permissions/codes";
import { ROLE_PERMISSION_MATRIX } from "../src/lib/permissions/matrix";
import { ROLE_CODES } from "../src/lib/constants/roles";
import { PdfService } from "../src/lib/services/pdf-service";

const prisma = new PrismaClient();

const SEED_PASSWORD =
  process.env.SEED_DEFAULT_PASSWORD ?? process.env.DEMO_PASSWORD ?? "Ishmt2026";

type GeoData = {
  regions: { code: string; nameSq: string; nameEn: string }[];
  municipalities: {
    regionCode: string;
    code: string;
    nameSq: string;
    nameEn: string;
  }[];
  administrativeUnits?: {
    municipalityCode: string;
    code: string;
    nameSq: string;
    nameEn?: string;
    unitType?: string;
  }[];
};

async function seedGeography() {
  const raw = readFileSync(join(__dirname, "seed/data/geo-albania.json"), "utf-8");
  const geo: GeoData = JSON.parse(raw);

  const regionMap = new Map<string, string>();

  for (const region of geo.regions) {
    const record = await prisma.geoRegion.upsert({
      where: { code: region.code },
      update: { nameSq: region.nameSq, nameEn: region.nameEn, isActive: true },
      create: {
        code: region.code,
        nameSq: region.nameSq,
        nameEn: region.nameEn,
      },
    });
    regionMap.set(region.code, record.id);
  }

  for (const mun of geo.municipalities) {
    const regionId = regionMap.get(mun.regionCode);
    if (!regionId) continue;

    await prisma.geoMunicipality.upsert({
      where: { code: mun.code },
      update: {
        nameSq: mun.nameSq,
        nameEn: mun.nameEn,
        regionId,
        isActive: true,
        legacyRegistryCode: mun.regionCode,
      },
      create: {
        code: mun.code,
        nameSq: mun.nameSq,
        nameEn: mun.nameEn,
        regionId,
        legacyRegistryCode: mun.regionCode,
      },
    });
  }

  const municipalityIdByCode = new Map(
    (
      await prisma.geoMunicipality.findMany({
        where: { code: { in: geo.municipalities.map((m) => m.code) } },
        select: { id: true, code: true },
      })
    ).map((m) => [m.code, m.id] as const),
  );

  let adminUnitCount = 0;
  for (const unit of geo.administrativeUnits ?? []) {
    const municipalityId = municipalityIdByCode.get(unit.municipalityCode);
    if (!municipalityId) continue;

    await prisma.geoAdministrativeUnit.upsert({
      where: {
        municipalityId_code: {
          municipalityId,
          code: unit.code,
        },
      },
      update: {
        nameSq: unit.nameSq,
        nameEn: unit.nameEn ?? null,
        unitType: unit.unitType ?? null,
        isActive: true,
      },
      create: {
        municipalityId,
        code: unit.code,
        nameSq: unit.nameSq,
        nameEn: unit.nameEn ?? null,
        unitType: unit.unitType ?? null,
      },
    });
    adminUnitCount++;
  }

  console.log(
    `✓ Geography: ${geo.regions.length} regions, ${geo.municipalities.length} municipalities, ${adminUnitCount} administrative units`,
  );
}

async function seedRolesAndPermissions() {
  const roleDefs = [
    { code: ROLE_CODES.PUBLIC, name: "Qytetar Publik", description: "Përdorues i paautentifikuar" },
    { code: ROLE_CODES.OWNER, name: "Personi përgjegjës i ashensorit", description: "Personi përgjegjës i ashensorit ose administrator ndërtese" },
    { code: ROLE_CODES.INSTALLER, name: "Kompani Instalimi", description: "Kompani e licencuar e instalimit" },
    { code: ROLE_CODES.CERTIFIER, name: "Kompani Certifikimi / OM", description: "Organizëm certifikimi" },
    { code: ROLE_CODES.MAINTENANCE, name: "Kompani Mirëmbajtjeje", description: "Kompani mirëmbajtjeje" },
    { code: ROLE_CODES.INSPECTOR, name: "Inspektor IQMT (legacy)", description: "Rol i vjetër - specialist + terren" },
    { code: ROLE_CODES.FIELD_INSPECTOR, name: "Inspektor", description: "Shqyrtim dosjeje aplikimi dhe inspektim fizik në objekt" },
    { code: ROLE_CODES.SECTOR_HEAD, name: "Përgjegjës sektori", description: "Caktim inspektorësh dhe raport drejt drejtorit" },
    { code: ROLE_CODES.ISHMT_DIRECTOR, name: "Drejtor i Drejtorisë", description: "Delegim dhe raport drejt kryeinspektorit" },
    { code: ROLE_CODES.CHIEF_INSPECTOR, name: "Kryeinspektor", description: "Miratimi final i regjistrimit" },
    { code: ROLE_CODES.ADMIN, name: "Administrator IQMT", description: "Administrator sistemi" },
    { code: ROLE_CODES.DIRECTORATE, name: "Drejtoria e Politikave", description: "Drejtoria e Politikave të Tregut të Brendshëm" },
  ];

  const roleIdMap = new Map<string, string>();

  for (const role of roleDefs) {
    const record = await prisma.authRole.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description },
      create: role,
    });
    roleIdMap.set(role.code, record.id);
  }

  const permissionIdMap = new Map<string, string>();

  for (const code of ALL_PERMISSION_CODES) {
    const [module, ...rest] = code.split(".");
    const action = rest.join(".");

    const record = await prisma.authPermission.upsert({
      where: { code },
      update: {},
      create: {
        code,
        module,
        action,
        description: code,
      },
    });
    permissionIdMap.set(code, record.id);
  }

  for (const [roleCode, permissions] of Object.entries(ROLE_PERMISSION_MATRIX)) {
    const roleId = roleIdMap.get(roleCode);
    if (!roleId) continue;

    for (const permCode of permissions) {
      const permissionId = permissionIdMap.get(permCode);
      if (!permissionId) continue;

      await prisma.authRolePermission.upsert({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  console.log(`✓ Roles: ${roleDefs.length}, Permissions: ${ALL_PERMISSION_CODES.length}`);
  return { roleIdMap };
}

async function seedSystemConfig() {
  const configs = [
    {
      key: "registry_number_format",
      value: {
        active: "ISHMT_LEGACY",
        formats: {
          ELV_MODERN: "ELV-{year}-{munCode}-{seq:6}",
          ISHMT_LEGACY: "{seq:6} {munLegacyCode}",
        },
      },
      description: "Formati aktiv i regjistrit IQMT (000001 TR); ELV_MODERN opsional",
    },
    {
      key: "certificate_number_format",
      value: {
        active: "CR_PREFIX",
        formats: {
          CR_PREFIX: "CR{seq:5}",
        },
      },
      description: "Formati i numrit të certifikatës (p.sh. CR00001)",
    },
    {
      key: "password_min_length",
      value: 12,
      description: "Gjatësia minimale e fjalëkalimit",
    },
    {
      key: "session_max_hours",
      value: 8,
      description: "Kohëzgjatja maksimale e sesionit në orë",
    },
    {
      key: "lockout_max_attempts",
      value: 5,
      description: "Përpjekje maksimale të dështuara para bllokimit",
    },
    {
      key: "lockout_duration_minutes",
      value: 30,
      description: "Kohëzgjatja e bllokimit në minuta",
    },
    {
      key: "compliance_rules",
      value: {
        inspectionWarningDays: 30,
        certificateWarningDays: 30,
        maintenanceReportMaxDays: 30,
        inspectionIntervalMonthsDefault: 12,
        inspectionIntervalMonthsWorkplace: 6,
      },
      description: "Rregullat e llogaritjes së përputhshmërisë",
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: {
        key: config.key,
        value: config.value,
        description: config.description,
      },
    });
  }

  console.log("✓ System config seeded");
}

async function seedOrganizations(roleIdMap: Map<string, string>) {
  const tirana = await prisma.geoMunicipality.findUnique({ where: { code: "TIA" } });
  const municipalityId = tirana?.id;

  const ishmtt = await prisma.organization.upsert({
    where: { nipt: "ISHMT-GOV-0001" },
    update: {},
    create: {
      type: OrgType.ISHMT,
      name: "IQMT - Inspektorati Qendror i Mbikeqyrjes së Tregut",
      nipt: "ISHMT-GOV-0001",
      status: OrgStatus.ACTIVE,
      municipalityId,
      email: "info@ishmt.gov.al",
    },
  });

  const directorate = await prisma.organization.upsert({
    where: { nipt: "DIR-MPB-0001" },
    update: {},
    create: {
      type: OrgType.DIRECTORATE,
      name: "Drejtoria e Politikave të Tregut të Brendshëm",
      nipt: "DIR-MPB-0001",
      status: OrgStatus.ACTIVE,
      municipalityId,
      email: "drejtoria@ishmt.gov.al",
    },
  });

  const installer1 = await prisma.organization.upsert({
    where: { nipt: "L12345678A" },
    update: {},
    create: {
      type: OrgType.INSTALLER,
      name: "Elevator Install Sh.p.k.",
      nipt: "L12345678A",
      status: OrgStatus.ACTIVE_AUTHORIZED,
      municipalityId,
      address: "Rruga e Durrësit, Tiranë",
      phone: "+35542100001",
      email: "info@elevatorinstall.al",
    },
  });

  const installer2 = await prisma.organization.upsert({
    where: { nipt: "L87654321B" },
    update: {},
    create: {
      type: OrgType.INSTALLER,
      name: "Ashensorë Albania Sh.a.",
      nipt: "L87654321B",
      status: OrgStatus.ACTIVE_AUTHORIZED,
      municipalityId,
      address: "Bulevardi Zogu I, Tiranë",
      email: "kontakt@ashensore.al",
    },
  });

  const certifier1 = await prisma.organization.upsert({
    where: { nipt: "M11111111C" },
    update: {},
    create: {
      type: OrgType.CERTIFIER,
      name: "OM Certifikime Sh.p.k.",
      nipt: "M11111111C",
      status: OrgStatus.ACTIVE_AUTHORIZED,
      municipalityId,
      email: "cert@omi.al",
    },
  });

  const certifier2 = await prisma.organization.upsert({
    where: { nipt: "M22222222D" },
    update: {},
    create: {
      type: OrgType.CERTIFIER,
      name: "Kontroll Teknik Ashensorëve",
      nipt: "M22222222D",
      status: OrgStatus.ACTIVE_AUTHORIZED,
      municipalityId,
      email: "info@kontrollteknik.al",
    },
  });

  const licenseExpiry = new Date();
  licenseExpiry.setFullYear(licenseExpiry.getFullYear() + 2);

  /** Pa llogari OM - pool 20 licence për regjistrim demo (OM-DEMO-REG-001 … 020). */
  await seedDemoLicensedClaimPools(prisma, municipalityId, licenseExpiry);

  const { DEMO_OWNER_ADMINISTRATOR, DEMO_OWNER_EMAIL, DEMO_OWNER_ORG_NAME } = await import("./lib/demo-owner");

  const ownerOrg =
    (await prisma.organization.findFirst({
      where: {
        type: OrgType.OWNER,
        OR: [{ name: DEMO_OWNER_ORG_NAME }, { email: DEMO_OWNER_EMAIL }],
        deletedAt: null,
      },
    })) ??
    (await prisma.organization.create({
      data: {
        type: OrgType.OWNER,
        name: DEMO_OWNER_ADMINISTRATOR.orgName,
        nipt: DEMO_OWNER_ADMINISTRATOR.nipt,
        ownerBuildingRole: DEMO_OWNER_ADMINISTRATOR.ownerBuildingRole,
        representativeName: DEMO_OWNER_ADMINISTRATOR.representativeName,
        status: OrgStatus.ACTIVE,
        municipalityId,
        email: DEMO_OWNER_ADMINISTRATOR.email,
        phone: DEMO_OWNER_ADMINISTRATOR.phone,
      },
    }));

  const maintenanceValidated = await prisma.organization.upsert({
    where: { nipt: "M44444444F" },
    update: {},
    create: {
      type: OrgType.MAINTENANCE,
      name: "Mirëmbajtje Ashensorësh Pro",
      nipt: "M44444444F",
      status: OrgStatus.ACTIVE,
      qkbValidated: true,
      qkbValidatedAt: new Date(),
      municipalityId,
      email: "info@mbapro.al",
    },
  });

  const maintenancePending = await prisma.organization.upsert({
    where: { nipt: "M55555555G" },
    update: {},
    create: {
      type: OrgType.MAINTENANCE,
      name: "Servis Ashensorësh i Ri",
      nipt: "M55555555G",
      status: OrgStatus.PENDING_VALIDATION,
      qkbValidated: false,
      municipalityId,
      email: "info@servisiri.al",
    },
  });

  for (const [org, licenseNumber, licenseType] of [
    [installer1, "INST-2024-001", "INSTALLATION"] as const,
    [installer2, "INST-2024-002", "INSTALLATION"] as const,
    [certifier1, "OM-2024-001", "CERTIFICATION"] as const,
    [certifier2, "OM-2024-002", "CERTIFICATION"] as const,
  ]) {
    const existing = await prisma.organizationLicense.findFirst({
      where: { organizationId: org.id, licenseNumber },
    });

    if (!existing) {
      await prisma.organizationLicense.create({
        data: {
          organizationId: org.id,
          licenseNumber,
          licenseType,
          issuedDate: new Date("2024-01-01"),
          expiryDate: licenseExpiry,
          status: OrgStatus.ACTIVE,
          issuedBy: "Drejtoria e Politikave të Tregut të Brendshëm",
        },
      });
    }
  }

  console.log("✓ System organizations and sample companies seeded");

  return {
    ishmtt,
    directorate,
    installer1,
    installer2,
    certifier1,
    certifier2,
    ownerOrg,
    maintenanceValidated,
    maintenancePending,
    roleIdMap,
  };
}

async function seedDevUsers(ctx: Awaited<ReturnType<typeof seedOrganizations>>) {
  if (process.env.NODE_ENV === "production" && !process.env.SEED_DEV_USERS) {
    console.log("⊘ Dev users skipped (production)");
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const {
    roleIdMap,
    ishmtt,
    directorate,
    installer1,
    installer2,
    certifier1,
    certifier2,
    ownerOrg,
    maintenanceValidated,
    maintenancePending,
  } = ctx;

  const users: {
    email: string;
    firstName: string;
    lastName: string;
    fatherName?: string;
    phone?: string;
    birthDate?: string;
    role: string;
    org: { id: string };
    nid?: string;
  }[] = [
    { email: "admin@ishmt.gov.al", firstName: "Admin", lastName: "IQMT", role: ROLE_CODES.ADMIN, org: ishmtt, nid: "I90101001A" },
    { email: "kryeinspektor@ishmt.gov.al", firstName: "Edison", lastName: "Konomi", role: ROLE_CODES.CHIEF_INSPECTOR, org: ishmtt, nid: "I90505005E" },
    { email: "drejtori@ishmt.gov.al", firstName: "Erion", lastName: "Prifti", role: ROLE_CODES.ISHMT_DIRECTOR, org: ishmtt, nid: "I90606006F" },
    { email: "shef@ishmt.gov.al", firstName: "Albert", lastName: "Shqalshi", role: ROLE_CODES.SECTOR_HEAD, org: ishmtt, nid: "I90707007G" },
    { email: "terren@ishmt.gov.al", firstName: "Dritan", lastName: "Gjoka", role: ROLE_CODES.FIELD_INSPECTOR, org: ishmtt, nid: "I90909009I" },
    { email: "terren2@ishmt.gov.al", firstName: "Elona", lastName: "Marku", role: ROLE_CODES.FIELD_INSPECTOR, org: ishmtt, nid: "I90909010J" },
    { email: "drejtoria@ishmt.gov.al", firstName: "Drejtori", lastName: "MPB", role: ROLE_CODES.DIRECTORATE, org: directorate, nid: "I90303003C" },
    { email: "installer@example.al", firstName: "Instalues", lastName: "Shembull", role: ROLE_CODES.INSTALLER, org: installer1 },
    { email: "installer2@example.al", firstName: "Instalues", lastName: "Albania", role: ROLE_CODES.INSTALLER, org: installer2 },
    { email: "certifier@example.al", firstName: "Certifikues", lastName: "Shembull", role: ROLE_CODES.CERTIFIER, org: certifier1 },
    { email: "certifier2@example.al", firstName: "Certifikues", lastName: "Kontroll", role: ROLE_CODES.CERTIFIER, org: certifier2 },
    { email: "maintenance@example.al", firstName: "Mirëmbajtës", lastName: "Validuar", role: ROLE_CODES.MAINTENANCE, org: maintenanceValidated },
    { email: "maintenance-pending@example.al", firstName: "Mirëmbajtës", lastName: "Në Pritje", role: ROLE_CODES.MAINTENANCE, org: maintenancePending },
  ];

  for (const u of users) {
    const roleId = roleIdMap.get(u.role);
    if (!roleId) continue;

    await releaseNidForSeed(u.email, u.nid);

    const user = await prisma.authUser.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        fatherName: u.fatherName ?? null,
        phone: u.phone ?? null,
        birthDate: u.birthDate ? new Date(u.birthDate) : null,
        nid: u.nid ?? null,
        isActive: true,
        emailVerified: true,
      },
      create: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        fatherName: u.fatherName ?? null,
        phone: u.phone ?? null,
        birthDate: u.birthDate ? new Date(u.birthDate) : null,
        nid: u.nid ?? null,
        isActive: true,
        emailVerified: true,
      },
    });

    await prisma.orgMembership.upsert({
      where: {
        userId_organizationId_roleId: {
          userId: user.id,
          organizationId: u.org.id,
          roleId,
        },
      },
      update: { isPrimary: true, deactivatedAt: null },
      create: {
        userId: user.id,
        organizationId: u.org.id,
        roleId,
        isPrimary: true,
      },
    });
  }

  const ownerRoleId = roleIdMap.get(ROLE_CODES.OWNER);
  const tirana = await prisma.geoMunicipality.findUnique({ where: { code: "TIA" } });
  if (ownerRoleId && tirana) {
    const { seedDemoOwnerProfiles } = await import("./lib/demo-owner");
    await seedDemoOwnerProfiles(prisma, passwordHash, tirana.id, ownerRoleId);
  }

  const pendingUser = await prisma.authUser.findUnique({
    where: { email: "maintenance-pending@example.al" },
  });

  if (pendingUser) {
    const existingQkb = await prisma.qkbValidation.findFirst({
      where: { organizationId: maintenancePending.id, status: QkbValidationStatus.PENDING },
    });

    if (!existingQkb) {
      await prisma.qkbValidation.create({
        data: {
          organizationId: maintenancePending.id,
          nipt: "M55555555G",
          status: QkbValidationStatus.PENDING,
          initiatedById: pendingUser.id,
          requestData: { nipt: "M55555555G", submittedAt: new Date().toISOString() },
        },
      });
    }
  }

  console.log(`✓ Dev users seeded (password: ${SEED_PASSWORD})`);
}

async function seedDocumentTemplates(adminUserId: string) {
  const templates = [
    {
      name: "Certifikatë Regjistrimi IQMT",
      type: TemplateType.CERTIFICATE,
      content: PdfService.defaultRegistrationCertificateTemplate(),
    },
    {
      name: "Letër Zyrtare Përcjellëse",
      type: TemplateType.OFFICIAL_LETTER,
      content: PdfService.defaultForwardingLetterTemplate(),
    },
  ];

  for (const tpl of templates) {
    await prisma.documentTemplate.upsert({
      where: { name_version: { name: tpl.name, version: 1 } },
      update: { content: tpl.content, isActive: true },
      create: {
        name: tpl.name,
        type: tpl.type,
        version: 1,
        content: tpl.content,
        isActive: true,
        createdById: adminUserId,
        description: tpl.name,
      },
    });
  }

  console.log(`✓ Document templates: ${templates.length}`);
}

/** Lë NID-in të lirë kur seed-i ri-përdor numra personalë nga demo e mëparshme. */
async function releaseNidForSeed(email: string, nid?: string | null) {
  if (!nid) return;
  const cleared = await prisma.authUser.updateMany({
    where: { nid, email: { not: email } },
    data: { nid: null },
  });
  if (cleared.count > 0) {
    console.log(`✓ NID ${nid} u lirua nga ${cleared.count} përdorues(e) të vjetër`);
  }
}

async function removeLegacyDemoUser(options: {
  email?: string;
  nid?: string;
  label: string;
}) {
  const or: { email?: string; nid?: string }[] = [];
  if (options.email) or.push({ email: options.email });
  if (options.nid) or.push({ nid: options.nid });
  if (or.length === 0) return;

  const user = await prisma.authUser.findFirst({ where: { OR: or } });
  if (!user) return;

  await prisma.orgMembership.deleteMany({ where: { userId: user.id } });
  try {
    await prisma.authUser.delete({ where: { id: user.id } });
  } catch {
    await prisma.authUser.update({
      where: { id: user.id },
      data: { isActive: false, deletedAt: new Date(), nid: null },
    });
  }
  console.log(`✓ Legacy ${options.label} demo user removed`);
}

async function removeLegacyInspectorUser() {
  await removeLegacyDemoUser({
    email: "inspector@ishmt.gov.al",
    nid: "I90202002B",
    label: "INSPECTOR",
  });
}

async function removeLegacySpecialistUser() {
  await removeLegacyDemoUser({
    email: "specialist@ishmt.gov.al",
    nid: "I90808008H",
    label: "SECTOR_SPECIALIST",
  });
}

async function removeLegacyOwnerUser() {
  await removeLegacyDemoUser({
    email: "owner@example.al",
    label: "owner@example.al (duplicate demo owner)",
  });
}

async function main() {
  console.log("Seeding IQMT Elevator Registry...\n");
  await removeLegacyInspectorUser();
  await removeLegacySpecialistUser();
  await removeLegacyOwnerUser();
  await seedGeography();
  const { roleIdMap } = await seedRolesAndPermissions();
  await seedSystemConfig();
  const orgCtx = await seedOrganizations(roleIdMap);
  await seedDevUsers(orgCtx);

  const { consolidateDemoOwner, DEMO_OWNER_EMAIL, DEMO_OWNER_NID } = await import("./lib/demo-owner");
  const ownerFix = await consolidateDemoOwner(prisma);
  if (ownerFix.changed) {
    console.log(`✓ Demo owner u harmonizua (NID ${DEMO_OWNER_NID} → ${DEMO_OWNER_EMAIL})`);
  }

  const admin = await prisma.authUser.findUnique({ where: { email: "admin@ishmtt.gov.al" } });
  if (admin) {
    await seedDocumentTemplates(admin.id);
  }

  console.log("\nSeed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
