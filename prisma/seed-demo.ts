import "dotenv/config";
import {
  ApplicationStatus,
  ApplicationType,
  BuildingType,
  CertificateStatus,
  CertificateType,
  ComplianceIndicator,
  ElevatorStatus,
  ElevatorType,
  MaintenanceContractStatus,
  OrgStatus,
  OrgType,
  PrismaClient,
  TemplateType,
  UsagePurpose,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_CODES } from "../src/lib/constants/roles";
import { PdfService } from "../src/lib/services/pdf-service";
import { buildNormalizedRegistrationExtended } from "../src/lib/registration/anneks-codes";
import { seedPipelineDemos } from "./lib/seed-pipeline-demos";
import { seedChiefApprovalDemo } from "./lib/seed-chief-approval-demo";

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Ishmt2026";

type CompanySpec = {
  name: string;
  nipt: string;
  email: string;
  phone?: string;
  address?: string;
  contactFirst: string;
  contactLast: string;
  loginEmail: string;
};

/** Demo installer companies - owner can pick any during registration. */
const INSTALLER_SPECS: CompanySpec[] = [
  {
    name: "Ashensorë Pro Sh.p.k.",
    nipt: "K11111111A",
    email: "info@ashensorepro.al",
    phone: "+355 4 2100100",
    address: "Rruga e Durrësit, Tiranë",
    contactFirst: "Genti",
    contactLast: "Hoxha",
    loginEmail: "installer@ashensorepro.al",
  },
  {
    name: "Lift Master Albania Sh.p.k.",
    nipt: "L10000001A",
    email: "zyra@liftmaster.al",
    phone: "+355 4 2200200",
    address: "Rruga Kavajës, Tiranë",
    contactFirst: "Ardit",
    contactLast: "Leka",
    loginEmail: "installer@liftmaster.al",
  },
  {
    name: "Euro Ashensorë Sh.p.k.",
    nipt: "L10000002B",
    email: "info@euroashensore.al",
    phone: "+355 4 2300300",
    address: "Rruga e Elbasanit, Tiranë",
    contactFirst: "Sara",
    contactLast: "Doçi",
    loginEmail: "installer@euroashensore.al",
  },
];

/** Demo certifier / OMI companies. */
const CERTIFIER_SPECS: CompanySpec[] = [
  {
    name: "OMI Certifikim Sh.p.k.",
    nipt: "K22222222B",
    email: "info@omicert.al",
    contactFirst: "Eda",
    contactLast: "Krasniqi",
    loginEmail: "cert@omicert.al",
  },
  {
    name: "Inspekt OMI Sh.p.k.",
    nipt: "M20000001A",
    email: "kontakt@inspektomi.al",
    contactFirst: "Blerim",
    contactLast: "Vata",
    loginEmail: "cert@inspektomi.al",
  },
  {
    name: "Quality Lift Cert Sh.p.k.",
    nipt: "M20000002B",
    email: "info@qualitylift.al",
    contactFirst: "Nora",
    contactLast: "Shehu",
    loginEmail: "cert@qualitylift.al",
  },
];

/** Demo maintenance companies (QKB-validated, ACTIVE). */
const MAINTENANCE_SPECS: CompanySpec[] = [
  {
    name: "Mirëmbajtje Ashensorësh Sh.p.k.",
    nipt: "K33333333C",
    email: "info@servisashensore.al",
    contactFirst: "Florian",
    contactLast: "Beqiri",
    loginEmail: "mirembajtje@servisashensore.al",
  },
  {
    name: "Servis Lift 24 Sh.p.k.",
    nipt: "N30000001A",
    email: "info@servislift24.al",
    contactFirst: "Klodian",
    contactLast: "Rama",
    loginEmail: "mirembajtje@servislift24.al",
  },
];

/**
 * Tables that hold fictitious / transactional data. Reference data
 * (geography, roles, permissions, role-permissions, system config,
 * notification templates, reminder rules) is intentionally preserved.
 */
const TABLES_TO_CLEAR = [
  "audit_logs",
  "doc_access_log",
  "doc_document_links",
  "doc_documents",
  "doc_templates",
  "cit_report_actions",
  "cit_reports",
  "qr_scan_logs",
  "qr_codes",
  "cert_certificates",
  "insp_inspections",
  "insp_field_assignments",
  "maint_compliance_status",
  "maint_records",
  "maint_contracts",
  "sys_scheduled_reminders",
  "sys_job_runs",
  "elv_compliance_status",
  "elv_delegation_history",
  "elv_ownership_history",
  "elv_status_history",
  "elv_responsible_entities",
  "elv_technical_data_versions",
  "elv_technical_data",
  "elv_elevators",
  "app_internal_notes",
  "app_participations",
  "app_field_review_assignments",
  "app_workflow_history",
  "app_delegations",
  "app_application_data",
  "app_applications",
  "incidents",
  "org_qkb_validations",
  "org_invitations",
  "org_memberships",
  "org_licenses",
  "org_organizations",
  "auth_accounts",
  "auth_sessions",
  "auth_verification_tokens",
  "auth_password_reset_tokens",
  "auth_users",
  "sys_notifications",
  "sys_notification_preferences",
  "sys_registry_sequences",
  "sys_application_sequences",
  "sys_certificate_sequences",
  "sys_legacy_registry_sequences",
];

async function clearFictitiousData() {
  const existing = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
  `;
  const existingSet = new Set(existing.map((row) => row.tablename));
  const tables = TABLES_TO_CLEAR.filter((table) => existingSet.has(table));
  const skipped = TABLES_TO_CLEAR.filter((table) => !existingSet.has(table));

  if (tables.length === 0) {
    throw new Error("Nuk u gjet asnjë tabelë për pastrim demo.");
  }

  const list = tables.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);

  console.log(`✓ Cleared ${tables.length} data tables (reference tables preserved)`);
  if (skipped.length > 0) {
    console.log(`⊘ Skipped ${skipped.length} missing tables: ${skipped.join(", ")}`);
  }
}

async function getRoleIdMap() {
  const roles = await prisma.authRole.findMany();
  if (roles.length === 0) {
    throw new Error(
      "Rolet nuk ekzistojnë. Ekzekutoni fillimisht `npm run db:seed` për të mbjellë rolet/lejet.",
    );
  }
  return new Map(roles.map((r) => [r.code, r.id]));
}

type DemoUser = {
  email: string;
  nid: string | null;
  firstName: string;
  lastName: string;
  role: string;
  loginNote: string;
};

async function main() {
  console.log("Demo reset & seed për ISHMT Elevator Registry...\n");

  await clearFictitiousData();
  const roleIdMap = await getRoleIdMap();

  const tirana = await prisma.geoMunicipality.findUnique({ where: { code: "TIA" } });
  if (!tirana) {
    throw new Error("Bashkia Tiranë (kodi TIA) nuk u gjet. Ekzekutoni `npm run db:seed`.");
  }
  const municipalityId = tirana.id;
  const munLegacyCode = tirana.legacyRegistryCode ?? tirana.code.slice(0, 2).toUpperCase();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ---------------------------------------------------------------------------
  // Organizations
  // ---------------------------------------------------------------------------
  const ishmt = await prisma.organization.create({
    data: {
      type: OrgType.ISHMT,
      name: "ISHMT - Inspektorati Shtetëror i Tregut të Brendshëm",
      nipt: "ISHMT-GOV-0001",
      status: OrgStatus.ACTIVE,
      municipalityId,
      email: "info@ishmt.gov.al",
    },
  });

  const directorate = await prisma.organization.create({
    data: {
      type: OrgType.DIRECTORATE,
      name: "Drejtoria e Politikave të Tregut të Brendshëm",
      nipt: "DIR-MPB-0001",
      status: OrgStatus.ACTIVE,
      municipalityId,
      email: "drejtoria@ishmt.gov.al",
    },
  });

  const ownerOrg = await prisma.organization.create({
    data: {
      type: OrgType.OWNER,
      name: "Personi Përgjegjës Shembull (Person Fizik)",
      status: OrgStatus.ACTIVE,
      municipalityId,
      address: "Rruga Myslym Shyri, Tiranë",
    },
  });

  // Licenses valid for 2 years so companies are selectable during registration.
  const licenseExpiry = new Date();
  licenseExpiry.setFullYear(licenseExpiry.getFullYear() + 2);

  async function createLicensedCompany(
    spec: CompanySpec,
    type: typeof OrgType.INSTALLER | typeof OrgType.CERTIFIER,
    licenseType: string,
    licensePrefix: string,
    index: number,
  ) {
    const org = await prisma.organization.create({
      data: {
        type,
        name: spec.name,
        nipt: spec.nipt,
        status: OrgStatus.ACTIVE,
        municipalityId,
        address: spec.address,
        email: spec.email,
        phone: spec.phone,
      },
    });
    await prisma.organizationLicense.create({
      data: {
        organizationId: org.id,
        licenseNumber: `${licensePrefix}-2026-${String(index + 1).padStart(3, "0")}`,
        licenseType,
        issuedDate: new Date("2026-01-01"),
        expiryDate: licenseExpiry,
        status: OrgStatus.ACTIVE,
        issuedBy: "Drejtoria e Politikave të Tregut të Brendshëm",
      },
    });
    return org;
  }

  const installerOrgs = [];
  for (let i = 0; i < INSTALLER_SPECS.length; i += 1) {
    installerOrgs.push(
      await createLicensedCompany(INSTALLER_SPECS[i], OrgType.INSTALLER, "INSTALLATION", "INST", i),
    );
  }

  const certifierOrgs = [];
  for (let i = 0; i < CERTIFIER_SPECS.length; i += 1) {
    certifierOrgs.push(
      await createLicensedCompany(CERTIFIER_SPECS[i], OrgType.CERTIFIER, "CERTIFICATION", "OMI", i),
    );
  }

  const maintenanceOrgs = [];
  for (const spec of MAINTENANCE_SPECS) {
    maintenanceOrgs.push(
      await prisma.organization.create({
        data: {
          type: OrgType.MAINTENANCE,
          name: spec.name,
          nipt: spec.nipt,
          status: OrgStatus.ACTIVE,
          qkbValidated: true,
          qkbValidatedAt: new Date(),
          municipalityId,
          address: spec.address,
          email: spec.email,
          phone: spec.phone,
        },
      }),
    );
  }

  // First company of each type is used as default for seeded registered elevators.
  const installerOrg = installerOrgs[0];
  const certifierOrg = certifierOrgs[0];
  const maintenanceOrg = maintenanceOrgs[0];

  console.log(
    `✓ Organizatat u krijuan (${installerOrgs.length} instalues, ${certifierOrgs.length} certifikues, ${maintenanceOrgs.length} mirëmbajtje)`,
  );

  // ---------------------------------------------------------------------------
  // Users (one per role)
  // ---------------------------------------------------------------------------
  const userPlan: {
    email: string;
    nid: string | null;
    idCardNumber: string | null;
    firstName: string;
    fatherName: string | null;
    lastName: string;
    motherName: string | null;
    role: string;
    org: { id: string };
    loginNote: string;
  }[] = [
    {
      email: "admin@ishmt.gov.al",
      nid: "I90101001A",
      idCardNumber: "AB1010101",
      firstName: "Admin",
      fatherName: "Petrit",
      lastName: "ISHMT",
      motherName: "Drita",
      role: ROLE_CODES.ADMIN,
      org: ishmt,
      loginNote: "Numri Personal: I90101001A",
    },
    {
      email: "kryeinspektor@ishmt.gov.al",
      nid: "I90505005E",
      idCardNumber: "AB5050505",
      firstName: "Edison",
      fatherName: "Elton",
      lastName: "Konomi",
      motherName: "Arta",
      role: ROLE_CODES.CHIEF_INSPECTOR,
      org: ishmt,
      loginNote: "Numri Personal: I90505005E",
    },
    {
      email: "drejtori@ishmt.gov.al",
      nid: "I90606006F",
      idCardNumber: "AB6060606",
      firstName: "Erion",
      fatherName: "Gent",
      lastName: "Prifti",
      motherName: "Elona",
      role: ROLE_CODES.ISHMT_DIRECTOR,
      org: ishmt,
      loginNote: "Numri Personal: I90606006F",
    },
    {
      email: "shef@ishmt.gov.al",
      nid: "I90707007G",
      idCardNumber: "AB7070707",
      firstName: "Albert",
      fatherName: "Ilir",
      lastName: "Shqalshi",
      motherName: "Besa",
      role: ROLE_CODES.SECTOR_HEAD,
      org: ishmt,
      loginNote: "Numri Personal: I90707007G",
    },

    {
      email: "terren@ishmt.gov.al",
      nid: "I90909009I",
      idCardNumber: "AB9090909",
      firstName: "Inspektor",
      fatherName: "Flamur",
      lastName: "Terreni",
      motherName: "Ornela",
      role: ROLE_CODES.FIELD_INSPECTOR,
      org: ishmt,
      loginNote: "Numri Personal: I90909009I",
    },
    {
      email: "terren2@ishmt.gov.al",
      nid: "I90909010J",
      idCardNumber: "AB9090910",
      firstName: "Inspektor",
      fatherName: "Arben",
      lastName: "Demo 2",
      motherName: "Elira",
      role: ROLE_CODES.FIELD_INSPECTOR,
      org: ishmt,
      loginNote: "Numri Personal: I90909010J",
    },
    {
      email: "drejtoria@ishmt.gov.al",
      nid: "I90303003C",
      idCardNumber: "AB3030303",
      firstName: "Drejtori",
      fatherName: "Bujar",
      lastName: "MPB",
      motherName: "Vera",
      role: ROLE_CODES.DIRECTORATE,
      org: directorate,
      loginNote: "Numri Personal: I90303003C",
    },
    {
      email: "personi përgjegjës i ashensorit@example.al",
      nid: "I90404004D",
      idCardNumber: "AB4040404",
      firstName: "Personi",
      fatherName: "Sokol",
      lastName: "Shembull",
      motherName: "Lindita",
      role: ROLE_CODES.OWNER,
      org: ownerOrg,
      loginNote: "Numri Personal: I90404004D",
    },
  ];

  let ownerUserId = "";
  let adminUserId = "";
  const summary: DemoUser[] = [];

  for (const u of userPlan) {
    const roleId = roleIdMap.get(u.role);
    if (!roleId) {
      console.warn(`⚠ Roli ${u.role} nuk u gjet, përdoruesi ${u.email} u anashkalua`);
      continue;
    }

    const user = await prisma.authUser.create({
      data: {
        email: u.email,
        passwordHash,
        firstName: u.firstName,
        lastName: u.lastName,
        nid: u.nid,
        idCardNumber: u.idCardNumber,
        fatherName: u.fatherName,
        motherName: u.motherName,
        isActive: true,
        emailVerified: true,
      },
    });

    await prisma.orgMembership.create({
      data: {
        userId: user.id,
        organizationId: u.org.id,
        roleId,
        isPrimary: true,
      },
    });

    if (u.role === ROLE_CODES.OWNER) ownerUserId = user.id;
    if (u.role === ROLE_CODES.ADMIN) adminUserId = user.id;

    summary.push({
      email: u.email,
      nid: u.nid,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      loginNote: u.loginNote,
    });
  }

  // One login per demo company (login via NIPT, password = DEMO_PASSWORD).
  async function createCompanyUsers(
    orgs: { id: string }[],
    specs: CompanySpec[],
    roleCode: string,
  ) {
    const roleId = roleIdMap.get(roleCode);
    if (!roleId) {
      console.warn(`⚠ Roli ${roleCode} nuk u gjet, përdoruesit e kompanive u anashkaluan`);
      return;
    }
    for (let i = 0; i < orgs.length; i += 1) {
      const spec = specs[i];
      const user = await prisma.authUser.create({
        data: {
          email: spec.loginEmail,
          passwordHash,
          firstName: spec.contactFirst,
          lastName: spec.contactLast,
          isActive: true,
          emailVerified: true,
        },
      });
      await prisma.orgMembership.create({
        data: {
          userId: user.id,
          organizationId: orgs[i].id,
          roleId,
          isPrimary: true,
        },
      });
      summary.push({
        email: spec.loginEmail,
        nid: null,
        firstName: spec.contactFirst,
        lastName: spec.contactLast,
        role: roleCode,
        loginNote: `NIPT: ${spec.nipt}`,
      });
    }
  }

  await createCompanyUsers(installerOrgs, INSTALLER_SPECS, ROLE_CODES.INSTALLER);
  await createCompanyUsers(certifierOrgs, CERTIFIER_SPECS, ROLE_CODES.CERTIFIER);
  await createCompanyUsers(maintenanceOrgs, MAINTENANCE_SPECS, ROLE_CODES.MAINTENANCE);

  console.log(`✓ ${summary.length} përdorues u krijuan`);

  // ---------------------------------------------------------------------------
  // Document templates (cleared above; restore so asset generation keeps working)
  // ---------------------------------------------------------------------------
  if (adminUserId) {
    for (const tpl of [
      {
        name: "Certifikatë Regjistrimi ISHMT",
        type: TemplateType.CERTIFICATE,
        content: PdfService.defaultRegistrationCertificateTemplate(),
      },
      {
        name: "Letër Zyrtare Përcjellëse",
        type: TemplateType.OFFICIAL_LETTER,
        content: PdfService.defaultForwardingLetterTemplate(),
      },
    ]) {
      await prisma.documentTemplate.create({
        data: {
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
    console.log("✓ Shabllonet e dokumenteve u rikrijuan");
  }

  // ---------------------------------------------------------------------------
  // 5 owner applications with basic data filled
  // ---------------------------------------------------------------------------
  const applicationsPlan = [
    {
      buildingName: "Pallati Dritan",
      address: "Rr. Myslym Shyri, Pallati 5, Tiranë 1001",
      entrance: "Hyrja 2",
      buildingType: BuildingType.CO_OWNERSHIP_BUILDING,
      usagePurpose: UsagePurpose.ELECTRIC_PASSENGER,
      responsible: "Shoqata e Bashkëpronarëve Dritan",
      email: "bashkepersoni përgjegjës i ashensoritet.dritan@example.al",
      phone: "+355 69 200 0001",
    },
    {
      buildingName: "Qendra Tregtare City Park",
      address: "Autostrada Tiranë-Durrës, Km 4",
      entrance: "Blloku A",
      buildingType: BuildingType.SHOPPING_CENTER,
      usagePurpose: UsagePurpose.PASSENGER_AND_FREIGHT,
      responsible: "City Park Management Sh.p.k.",
      email: "facility@citypark.al",
      phone: "+355 69 200 0002",
    },
    {
      buildingName: "Spitali Rajonal",
      address: "Rr. e Dibrës 370, Tiranë",
      entrance: "Hyrja kryesore",
      buildingType: BuildingType.PUBLIC_BUILDING,
      usagePurpose: UsagePurpose.PASSENGER_AND_BED,
      responsible: "Drejtoria e Spitalit Rajonal",
      email: "sherbimet@spitalirajonal.al",
      phone: "+355 69 200 0003",
    },
    {
      buildingName: "Kulla e Biznesit Alpha",
      address: "Bulevardi Bajram Curri, Tiranë",
      entrance: "Hyrja Veriore",
      buildingType: BuildingType.WORKPLACE,
      usagePurpose: UsagePurpose.ELECTRIC_PASSENGER,
      responsible: "Alpha Business Center Sh.p.k.",
      email: "admin@alphacenter.al",
      phone: "+355 69 200 0004",
    },
    {
      buildingName: "Rezidenca Kodra e Diellit",
      address: "Kodra e Diellit, Selitë, Tiranë",
      entrance: "Vila 12",
      buildingType: BuildingType.RESIDENTIAL,
      usagePurpose: UsagePurpose.HYDRAULIC_PASSENGER,
      responsible: "Personi Përgjegjës Shembull",
      email: "personi përgjegjës i ashensorit@example.al",
      phone: "+355 69 200 0005",
    },
  ];

  const year = new Date().getFullYear();
  let seq = 0;

  for (const plan of applicationsPlan) {
    seq += 1;
    const applicationNumber = `APP-${year}-REG-${String(seq).padStart(6, "0")}`;

    const application = await prisma.application.create({
      data: {
        applicationNumber,
        type: ApplicationType.NEW_REGISTRATION,
        status: ApplicationStatus.BASIC_DATA_COMPLETED,
        ownerOrgId: ownerOrg.id,
        createdById: ownerUserId,
      },
    });

    await prisma.applicationData.create({
      data: {
        applicationId: application.id,
        applicationDate: new Date(),
        buildingAddress: plan.address,
        municipalityId,
        legacyDistrictCode: munLegacyCode,
        buildingName: plan.buildingName,
        entrance: plan.entrance,
        buildingType: plan.buildingType,
        usagePurpose: plan.usagePurpose,
        responsibleEntityName: plan.responsible,
        responsibleEntityEmail: plan.email,
        responsibleEntityPhone: plan.phone,
        registrationExtendedData: buildNormalizedRegistrationExtended(
          { responsibleEntityType: "ADMINISTRATOR" },
          { buildingType: plan.buildingType, usagePurpose: plan.usagePurpose },
        ) as import("@prisma/client").Prisma.InputJsonValue,
      },
    });

    await prisma.applicationWorkflowHistory.createMany({
      data: [
        {
          applicationId: application.id,
          fromStatus: null,
          toStatus: ApplicationStatus.DRAFT,
          action: "CREATE",
          actorId: ownerUserId,
        },
        {
          applicationId: application.id,
          fromStatus: ApplicationStatus.DRAFT,
          toStatus: ApplicationStatus.BASIC_DATA_COMPLETED,
          action: "SAVE_BASIC_DATA",
          actorId: ownerUserId,
        },
      ],
    });

    // Keep application_sequence consistent so the next real application continues.
    await prisma.applicationSequence.upsert({
      where: { year_typeCode: { year, typeCode: "REG" } },
      update: { lastSequence: seq },
      create: { year, typeCode: "REG", lastSequence: seq },
    });

    console.log(`  • ${applicationNumber} - ${plan.buildingName}`);
  }

  console.log(`✓ ${applicationsPlan.length} aplikime u krijuan për personin përgjegjës të ashensorit (statusi: të dhënat bazë)\n`);

  // ---------------------------------------------------------------------------
  // 2 fully registered elevators (closed applications -> active digital files)
  // ---------------------------------------------------------------------------
  const certExpiry = new Date();
  certExpiry.setFullYear(certExpiry.getFullYear() + 2);
  const contractEnd = new Date();
  contractEnd.setFullYear(contractEnd.getFullYear() + 1);

  const registeredPlan = [
    {
      buildingName: "Rezidenca Panorama",
      address: "Rr. Sami Frashëri 15, Tiranë 1019",
      entrance: "Hyrja 1",
      buildingType: BuildingType.RESIDENTIAL,
      usagePurpose: UsagePurpose.ELECTRIC_PASSENGER,
      responsible: "Shoqata e Bashkëpronarëve Panorama",
      email: "panorama@example.al",
      phone: "+355 69 200 0101",
      manufacturer: "KONE",
      model: "MonoSpace 500",
      serialNumber: "KN-2025-884512",
      manufacturingYear: 2025,
      capacityKg: 630,
      capacityPersons: 8,
      floorsServed: 9,
      stops: 9,
      gpsLatitude: 41.3231,
      gpsLongitude: 19.8187,
    },
    {
      buildingName: "Kulla Office One",
      address: "Bulevardi Dëshmorët e Kombit 4, Tiranë",
      entrance: "Hyrja Qendrore",
      buildingType: BuildingType.WORKPLACE,
      usagePurpose: UsagePurpose.PASSENGER_AND_FREIGHT,
      responsible: "Office One Management Sh.p.k.",
      email: "facility@officeone.al",
      phone: "+355 69 200 0102",
      manufacturer: "Schindler",
      model: "Schindler 5500",
      serialNumber: "SCH-2024-553120",
      manufacturingYear: 2024,
      capacityKg: 1000,
      capacityPersons: 13,
      floorsServed: 14,
      stops: 14,
      gpsLatitude: 41.3265,
      gpsLongitude: 19.8201,
    },
  ];

  let regSeq = 0;
  let certSeq = 0;
  const seededElevators: {
    id: string;
    registryNumber: string;
    buildingName: string;
    inspectionIntervalMonths: number;
  }[] = [];

  for (const plan of registeredPlan) {
    seq += 1;
    regSeq += 1;
    certSeq += 1;
    const applicationNumber = `APP-${year}-REG-${String(seq).padStart(6, "0")}`;

    const application = await prisma.application.create({
      data: {
        applicationNumber,
        type: ApplicationType.NEW_REGISTRATION,
        status: ApplicationStatus.CLOSED,
        ownerOrgId: ownerOrg.id,
        installerOrgId: installerOrg.id,
        certifierOrgId: certifierOrg.id,
        createdById: ownerUserId,
      },
    });

    await prisma.applicationData.create({
      data: {
        applicationId: application.id,
        applicationDate: new Date(),
        buildingAddress: plan.address,
        municipalityId,
        buildingName: plan.buildingName,
        entrance: plan.entrance,
        buildingType: plan.buildingType,
        usagePurpose: plan.usagePurpose,
        responsibleEntityName: plan.responsible,
        responsibleEntityEmail: plan.email,
        responsibleEntityPhone: plan.phone,
        registrationExtendedData: {
          registrationBuildingType: plan.buildingType,
          usagePurposeCode: plan.usagePurpose,
          responsibleEntityType: "ADMINISTRATOR",
        },
      },
    });

    const registryNumber = `${String(900 + regSeq).padStart(6, "0")} ${munLegacyCode}`;
    const elevator = await prisma.elevator.create({
      data: {
        registryNumber,
        applicationId: application.id,
        status: ElevatorStatus.ACTIVE,
        ownerOrgId: ownerOrg.id,
        installerOrgId: installerOrg.id,
        certifierOrgId: certifierOrg.id,
        maintenanceOrgId: maintenanceOrg.id,
        buildingAddress: plan.address,
        municipalityId,
        buildingName: plan.buildingName,
        gpsLatitude: plan.gpsLatitude,
        gpsLongitude: plan.gpsLongitude,
        registrationDate: new Date(),
        activationDate: new Date(),
      },
    });

    await prisma.elevatorTechnicalData.create({
      data: {
        elevatorId: elevator.id,
        elevatorType: ElevatorType.PASSENGER,
        manufacturer: plan.manufacturer,
        model: plan.model,
        serialNumber: plan.serialNumber,
        manufacturingYear: plan.manufacturingYear,
        capacityKg: plan.capacityKg,
        capacityPersons: plan.capacityPersons,
        floorsServed: plan.floorsServed,
        stops: plan.stops,
        driveType: "ELECTRIC",
        doorType: "AUTOMATIC",
      },
    });

    await prisma.certificate.create({
      data: {
        certificateNumber: `CR${String(certSeq).padStart(5, "0")}`,
        elevatorId: elevator.id,
        type: CertificateType.REGISTRATION,
        status: CertificateStatus.ACTIVE,
        issuedDate: new Date(),
        expiryDate: certExpiry,
        issuedByOrgId: certifierOrg.id,
        applicationId: application.id,
      },
    });

    await prisma.elevatorComplianceStatus.create({
      data: {
        elevatorId: elevator.id,
        indicator: ComplianceIndicator.GREEN,
      },
    });

    await prisma.maintenanceContract.create({
      data: {
        elevatorId: elevator.id,
        maintenanceOrgId: maintenanceOrg.id,
        serviceType: "MAINTENANCE",
        contractNumber: `KM-${year}-${String(regSeq).padStart(5, "0")}`,
        startDate: new Date(),
        endDate: contractEnd,
        status: MaintenanceContractStatus.ACTIVE,
        isActive: true,
      },
    });

    await prisma.elevatorStatusHistory.create({
      data: {
        elevatorId: elevator.id,
        fromStatus: null,
        toStatus: ElevatorStatus.ACTIVE,
        reason: "Regjistrim fillestar i miratuar",
        applicationId: application.id,
        actorId: ownerUserId,
      },
    });

    await prisma.applicationWorkflowHistory.createMany({
      data: [
        { applicationId: application.id, fromStatus: null, toStatus: ApplicationStatus.DRAFT, action: "CREATE", actorId: ownerUserId },
        { applicationId: application.id, fromStatus: ApplicationStatus.DRAFT, toStatus: ApplicationStatus.BASIC_DATA_COMPLETED, action: "SAVE_BASIC_DATA", actorId: ownerUserId },
        { applicationId: application.id, fromStatus: ApplicationStatus.CERTIFICATION_COMPLETED, toStatus: ApplicationStatus.APPROVED, action: "APPROVE", actorId: ownerUserId },
        { applicationId: application.id, fromStatus: ApplicationStatus.APPROVED, toStatus: ApplicationStatus.CLOSED, action: "CLOSE", actorId: ownerUserId },
      ],
    });

    console.log(`  • Ashensor ${registryNumber} - ${plan.buildingName}`);
    seededElevators.push({
      id: elevator.id,
      registryNumber,
      buildingName: plan.buildingName,
      inspectionIntervalMonths:
        plan.buildingType === BuildingType.WORKPLACE ? 6 : 12,
    });
  }

  // Keep sequences consistent so future real registrations continue cleanly.
  await prisma.applicationSequence.upsert({
    where: { year_typeCode: { year, typeCode: "REG" } },
    update: { lastSequence: seq },
    create: { year, typeCode: "REG", lastSequence: seq },
  });
  await prisma.legacyRegistrySequence.upsert({
    where: { municipalityId },
    update: { lastSequence: 900 + regSeq },
    create: { municipalityId, lastSequence: 900 + regSeq },
  });
  await prisma.certificateSequence.upsert({
    where: { year_typeCode: { year, typeCode: "REG" } },
    update: { lastSequence: certSeq },
    create: { year, typeCode: "REG", lastSequence: certSeq },
  });

  console.log(`✓ ${registeredPlan.length} ashensorë të regjistruar u krijuan\n`);

  const maintenanceUser = await prisma.authUser.findFirst({
    where: { email: MAINTENANCE_SPECS[0].loginEmail },
  });
  const certifierUser = await prisma.authUser.findFirst({
    where: { email: CERTIFIER_SPECS[0].loginEmail },
  });
  const fieldInspectorUser = await prisma.authUser.findFirst({
    where: { email: "terren@ishmt.gov.al" },
  });
  const sectorHeadUser = await prisma.authUser.findFirst({
    where: { email: "shef@ishmt.gov.al" },
  });

  if (maintenanceUser && certifierUser && fieldInspectorUser && sectorHeadUser && ownerUserId) {
    const pipelineResult = await seedPipelineDemos(prisma, seededElevators, {
      ownerUserId,
      maintenanceUserId: maintenanceUser.id,
      certifierUserId: certifierUser.id,
      fieldInspectorUserId: fieldInspectorUser.id,
      sectorHeadUserId: sectorHeadUser.id,
      maintenanceOrgId: maintenanceOrg.id,
      certifierOrgId: certifierOrg.id,
    });
    console.log(`✓ Pipeline demo: ${pipelineResult.citizenReports.join(", ")}`);
    console.log(`  (raportime · mirëmbajtje · inspektime për ${pipelineResult.elevators.join(" dhe ")})\n`);
  }

  try {
    const chiefDemo = await seedChiefApprovalDemo(prisma);
    console.log(`✓ Aplikim demo për kryeinspektor: ${chiefDemo.applicationNumber}`);
    console.log(`  Hap: /ishmt/review/${chiefDemo.applicationId}\n`);
  } catch (error) {
    console.warn("⚠ Aplikimi demo për kryeinspektor nuk u krijua:", error instanceof Error ? error.message : error);
  }

  // ---------------------------------------------------------------------------
  // Print credentials summary
  // ---------------------------------------------------------------------------
  console.log("=".repeat(60));
  console.log(`AKSESET (fjalëkalimi i njëjtë për të gjithë: ${DEMO_PASSWORD})`);
  console.log("=".repeat(60));
  for (const s of summary) {
    console.log(`${s.role.padEnd(12)} | ${s.loginNote.padEnd(28)} | ${s.email}`);
  }
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
