import {
  ApplicationStatus,
  ApplicationType,
  BuildingType,
  ComplianceIndicator,
  DelegationStatus,
  DelegationType,
  ElevatorStatus,
  ElevatorType,
  InspectionResult,
  InspectionType,
  MaintenanceContractStatus,
  MaintenanceType,
  OrgStatus,
  OrgType,
  PrismaClient,
  ReturnTargetRole,
  UsagePurpose,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_CODES } from "../../src/lib/constants/roles";
import { MembershipService } from "../../src/lib/services/membership-service";
import { DEMO_OWNER_NID } from "./demo-owner";
import {
  SERVICE_PROVIDER_DEMO,
  SERVICE_PROVIDER_DEMO_APP_PREFIX,
  SERVICE_PROVIDER_DEMO_CONTRACT_PREFIX,
} from "../../src/lib/demo/service-provider-demo-constants";

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

async function ensureLicense(
  prisma: PrismaClient,
  organizationId: string,
  licenseNumber: string,
  licenseType: string,
) {
  const existing = await prisma.organizationLicense.findFirst({
    where: { organizationId, licenseNumber },
  });
  if (existing) return existing;

  return prisma.organizationLicense.create({
    data: {
      organizationId,
      licenseNumber,
      licenseType,
      issuedDate: new Date("2024-01-01"),
      expiryDate: addYears(new Date(), 2),
      status: OrgStatus.ACTIVE,
      issuedBy: "Drejtoria e Politikave të Tregut të Brendshëm",
    },
  });
}

async function ensureOrgAndUser(prisma: PrismaClient, municipalityId: string) {
  const passwordHash = await bcrypt.hash(SERVICE_PROVIDER_DEMO.password, 12);

  const org = await prisma.organization.upsert({
    where: { nipt: SERVICE_PROVIDER_DEMO.nipt },
    update: {
      capInstall: true,
      capMaintenance: true,
      capOm: true,
      name: SERVICE_PROVIDER_DEMO.orgName,
      status: OrgStatus.ACTIVE_AUTHORIZED,
      qkbValidated: true,
      qkbValidatedAt: new Date(),
      deletedAt: null,
    },
    create: {
      type: OrgType.INSTALLER,
      capInstall: true,
      capMaintenance: true,
      capOm: true,
      name: SERVICE_PROVIDER_DEMO.orgName,
      nipt: SERVICE_PROVIDER_DEMO.nipt,
      status: OrgStatus.ACTIVE_AUTHORIZED,
      qkbValidated: true,
      qkbValidatedAt: new Date(),
      municipalityId,
      email: SERVICE_PROVIDER_DEMO.email,
      phone: SERVICE_PROVIDER_DEMO.phone,
    },
  });

  await Promise.all([
    ensureLicense(prisma, org.id, SERVICE_PROVIDER_DEMO.omLicenseNumber, "CERTIFICATION"),
    ensureLicense(prisma, org.id, SERVICE_PROVIDER_DEMO.installLicenseNumber, "INSTALLATION"),
    ensureLicense(prisma, org.id, SERVICE_PROVIDER_DEMO.maintenanceLicenseNumber, "MAINTENANCE"),
  ]);

  const user = await prisma.authUser.upsert({
    where: { email: SERVICE_PROVIDER_DEMO.email },
    update: {
      firstName: SERVICE_PROVIDER_DEMO.firstName,
      lastName: SERVICE_PROVIDER_DEMO.lastName,
      phone: SERVICE_PROVIDER_DEMO.phone,
      passwordHash,
      isActive: true,
      emailVerified: true,
      deletedAt: null,
    },
    create: {
      email: SERVICE_PROVIDER_DEMO.email,
      passwordHash,
      firstName: SERVICE_PROVIDER_DEMO.firstName,
      lastName: SERVICE_PROVIDER_DEMO.lastName,
      phone: SERVICE_PROVIDER_DEMO.phone,
      isActive: true,
      emailVerified: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    await MembershipService.grantCapabilityMemberships(tx, user.id, org, {
      primaryRoleCode: ROLE_CODES.INSTALLER,
    });
  });

  return { org, user };
}

async function resolveOwnerContext(prisma: PrismaClient) {
  const ownerUser = await prisma.authUser.findFirst({
    where: { nid: DEMO_OWNER_NID, deletedAt: null },
    include: {
      memberships: {
        where: { deactivatedAt: null },
        include: { organization: true },
        take: 1,
      },
    },
  });

  if (!ownerUser?.memberships[0]) {
    throw new Error(
      "Personi përgjegjës demo nuk u gjet. Ekzekutoni: npm run db:seed ose npm run db:seed:full-demo",
    );
  }

  return {
    ownerUserId: ownerUser.id,
    ownerOrgId: ownerUser.memberships[0].organizationId,
  };
}

async function cleanupPreviousDemo(prisma: PrismaClient, orgId: string) {
  const demoApps = await prisma.application.findMany({
    where: {
      applicationNumber: { startsWith: SERVICE_PROVIDER_DEMO_APP_PREFIX },
      NOT: { applicationNumber: { contains: "-ELV-" } },
    },
    select: { id: true },
  });
  const demoAppIds = demoApps.map((a) => a.id);

  if (demoAppIds.length > 0) {
    await prisma.applicationDelegation.deleteMany({
      where: { applicationId: { in: demoAppIds } },
    });
    await prisma.applicationWorkflowHistory.deleteMany({
      where: { applicationId: { in: demoAppIds } },
    });
    await prisma.applicationData.deleteMany({
      where: { applicationId: { in: demoAppIds } },
    });
    await prisma.application.deleteMany({ where: { id: { in: demoAppIds } } });
  }

  await prisma.maintenanceRecord.deleteMany({
    where: {
      maintenanceOrgId: orgId,
      description: { contains: "Demo SP:" },
    },
  });

  await prisma.inspection.deleteMany({
    where: { findings: { contains: "Demo SP:" } },
  });

  await prisma.maintenanceContract.deleteMany({
    where: {
      maintenanceOrgId: orgId,
      OR: [
        { contractNumber: { startsWith: SERVICE_PROVIDER_DEMO_CONTRACT_PREFIX } },
        { contractNumber: { startsWith: "KO-SP-DEMO" } },
      ],
    },
  });
}

async function ensureDemoElevators(
  prisma: PrismaClient,
  ownerOrgId: string,
  ownerUserId: string,
  municipalityId: string,
  serviceOrgId: string,
  serviceUserId: string,
) {
  const existing = await prisma.elevator.findMany({
    where: {
      ownerOrgId,
      registryNumber: { startsWith: "0009" },
      deletedAt: null,
    },
    take: 3,
    orderBy: { registryNumber: "asc" },
  });

  if (existing.length >= 2) {
    return existing;
  }

  const mun = await prisma.geoMunicipality.findUniqueOrThrow({
    where: { id: municipalityId },
    select: { legacyRegistryCode: true },
  });
  const legacyCode = mun.legacyRegistryCode ?? "EL";

  const plans = [
    {
      registryNumber: `000901 ${legacyCode}`,
      buildingName: "Pallati Demo SP Alpha",
      address: "Rr. e Kavajës Nr. 120, Tiranë",
      buildingType: BuildingType.CO_OWNERSHIP_BUILDING,
    },
    {
      registryNumber: `000902 ${legacyCode}`,
      buildingName: "Qendra Biznesi Demo SP Beta",
      address: "Bulevardi Zogu I, Tiranë",
      buildingType: BuildingType.WORKPLACE,
    },
    {
      registryNumber: `000903 ${legacyCode}`,
      buildingName: "Rezidenca Demo SP Gamma",
      address: "Rr. Dritan Hoxha, Tiranë",
      buildingType: BuildingType.RESIDENTIAL,
    },
  ];

  const created = [];
  for (const plan of plans) {
    const found = await prisma.elevator.findFirst({
      where: { registryNumber: plan.registryNumber },
    });
    if (found) {
      created.push(found);
      continue;
    }

    const application = await prisma.application.create({
      data: {
        applicationNumber: `${SERVICE_PROVIDER_DEMO_APP_PREFIX}-ELV-${plan.registryNumber.slice(0, 6).trim()}`,
        type: ApplicationType.NEW_REGISTRATION,
        status: ApplicationStatus.CLOSED,
        ownerOrgId,
        installerOrgId: serviceOrgId,
        certifierOrgId: serviceOrgId,
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
        buildingType: plan.buildingType,
        usagePurpose: UsagePurpose.ELECTRIC_PASSENGER,
        responsibleEntityName: "Demo SP Owner",
      },
    });

    const elevator = await prisma.elevator.create({
      data: {
        registryNumber: plan.registryNumber,
        applicationId: application.id,
        status: ElevatorStatus.ACTIVE,
        ownerOrgId,
        installerOrgId: serviceOrgId,
        certifierOrgId: serviceOrgId,
        maintenanceOrgId: serviceOrgId,
        buildingAddress: plan.address,
        buildingName: plan.buildingName,
        municipalityId,
        registrationDate: daysAgo(400),
        activationDate: daysAgo(380),
      },
    });

    await prisma.elevatorTechnicalData.create({
      data: {
        elevatorId: elevator.id,
        elevatorType: ElevatorType.PASSENGER,
        manufacturer: "Otis",
        model: "Gen2",
        serialNumber: `SP-${plan.registryNumber.slice(0, 6).trim()}`,
        manufacturingYear: 2019,
        capacityKg: 630,
        capacityPersons: 8,
        floorsServed: 8,
        stops: 8,
        driveType: "ELECTRIC",
      },
    });

    await prisma.elevatorComplianceStatus.create({
      data: { elevatorId: elevator.id, indicator: ComplianceIndicator.GREEN },
    });

    created.push(elevator);
  }

  return created;
}

async function seedMaintenanceDemo(
  prisma: PrismaClient,
  orgId: string,
  userId: string,
  elevators: { id: string; registryNumber: string }[],
) {
  const year = new Date().getFullYear();
  const [el1, el2, el3] = elevators;

  if (el1) {
    const existingActive = await prisma.maintenanceContract.findFirst({
      where: {
        elevatorId: el1.id,
        maintenanceOrgId: orgId,
        serviceType: "MAINTENANCE",
        contractNumber: `${SERVICE_PROVIDER_DEMO_CONTRACT_PREFIX}-${year}-001`,
      },
    });
    if (!existingActive) {
      await prisma.maintenanceContract.create({
        data: {
          elevatorId: el1.id,
          maintenanceOrgId: orgId,
          serviceType: "MAINTENANCE",
          contractNumber: `${SERVICE_PROVIDER_DEMO_CONTRACT_PREFIX}-${year}-001`,
          startDate: daysAgo(120),
          endDate: addMonths(new Date(), 8),
          status: MaintenanceContractStatus.ACTIVE,
          isActive: true,
        },
      });
    }

    await prisma.maintenanceRecord.create({
      data: {
        elevatorId: el1.id,
        maintenanceOrgId: orgId,
        type: MaintenanceType.ROUTINE,
        interventionType: "Rutinë",
        performedDate: daysAgo(12),
        startTime: "09:30",
        endTime: "11:00",
        technicianName: "Bledar Shehu",
        description: "Demo SP: Kontroll rutinë - vajosje, test sigurie, verifikim dyerve.",
        createdById: userId,
      },
    });

    await prisma.maintenanceRecord.create({
      data: {
        elevatorId: el1.id,
        maintenanceOrgId: orgId,
        type: MaintenanceType.ROUTINE,
        interventionType: "RAPORT_MUJOR",
        performedDate: monthStart(),
        technicianName: "Bledar Shehu",
        description: "Demo SP: Kontroll periodik mujor i regjistruar.",
        createdById: userId,
      },
    });
  }

  if (el2) {
    await prisma.maintenanceContract.create({
      data: {
        elevatorId: el2.id,
        maintenanceOrgId: orgId,
        serviceType: "MAINTENANCE",
        contractNumber: `${SERVICE_PROVIDER_DEMO_CONTRACT_PREFIX}-${year}-002`,
        startDate: daysAgo(30),
        endDate: addMonths(new Date(), 11),
        status: MaintenanceContractStatus.ACTIVE,
        isActive: true,
      },
    });

    await prisma.maintenanceRecord.create({
      data: {
        elevatorId: el2.id,
        maintenanceOrgId: orgId,
        type: MaintenanceType.EMERGENCY,
        interventionType: "Emergjencë",
        performedDate: daysAgo(5),
        startTime: "14:00",
        endTime: "16:30",
        technicianName: "Bledar Shehu",
        description: "Demo SP: Ndërhyrje emergjence - zhurmë e tepërt, u zëvendësua rulmenti.",
        partsReplaced: "Rulment primary sheave",
        createdById: userId,
      },
    });
  }

  if (el3) {
    const existingActive = await prisma.maintenanceContract.findFirst({
      where: {
        elevatorId: el3.id,
        maintenanceOrgId: orgId,
        serviceType: "MAINTENANCE",
        contractNumber: `${SERVICE_PROVIDER_DEMO_CONTRACT_PREFIX}-${year}-003`,
      },
    });
    if (!existingActive) {
      await prisma.maintenanceContract.create({
        data: {
          elevatorId: el3.id,
          maintenanceOrgId: orgId,
          serviceType: "MAINTENANCE",
          contractNumber: `${SERVICE_PROVIDER_DEMO_CONTRACT_PREFIX}-${year}-003`,
          startDate: daysAgo(90),
          endDate: addMonths(new Date(), 9),
          status: MaintenanceContractStatus.ACTIVE,
          isActive: true,
        },
      });
    }

    const existingRecord = await prisma.maintenanceRecord.findFirst({
      where: { elevatorId: el3.id, maintenanceOrgId: orgId },
    });
    if (!existingRecord) {
      const interventionDate = daysAgo(14);
      await prisma.maintenanceRecord.create({
        data: {
          elevatorId: el3.id,
          maintenanceOrgId: orgId,
          type: MaintenanceType.ROUTINE,
          interventionType: "Rutinë",
          performedDate: interventionDate,
          startTime: "10:00",
          endTime: "11:30",
          technicianName: "Bledar Shehu",
          description: "Demo SP: Kontroll rutinë për ashensorin 000903.",
          createdById: userId,
        },
      });
      await prisma.maintenanceRecord.create({
        data: {
          elevatorId: el3.id,
          maintenanceOrgId: orgId,
          type: MaintenanceType.ROUTINE,
          interventionType: "RAPORT_MUJOR",
          performedDate: monthStart(),
          technicianName: "Bledar Shehu",
          description: "Demo SP: Kontroll periodik mujor i regjistruar.",
          createdById: userId,
        },
      });
      await prisma.maintenanceComplianceStatus.upsert({
        where: { elevatorId: el3.id },
        update: {
          lastMaintenanceDate: interventionDate,
          nextDueDate: addMonths(interventionDate, 1),
          isCompliant: true,
          daysOverdue: 0,
        },
        create: {
          elevatorId: el3.id,
          lastMaintenanceDate: interventionDate,
          nextDueDate: addMonths(interventionDate, 1),
          isCompliant: true,
          daysOverdue: 0,
        },
      });
    }

    await prisma.maintenanceContract.deleteMany({
      where: {
        elevatorId: el3.id,
        contractNumber: `${SERVICE_PROVIDER_DEMO_CONTRACT_PREFIX}-${year}-PENDING`,
      },
    });
  }
}

async function seedOmDemo(
  prisma: PrismaClient,
  orgId: string,
  userId: string,
  elevators: { id: string }[],
) {
  const year = new Date().getFullYear();
  const [el1, el2] = elevators;

  if (el1) {
    await prisma.maintenanceContract.create({
      data: {
        elevatorId: el1.id,
        maintenanceOrgId: orgId,
        serviceType: "PERIODIC_INSPECTION",
        contractNumber: `KO-SP-DEMO-${year}-001`,
        startDate: daysAgo(200),
        endDate: addMonths(new Date(), 4),
        status: MaintenanceContractStatus.ACTIVE,
        isActive: true,
      },
    });

    await prisma.inspection.create({
      data: {
        elevatorId: el1.id,
        inspectorId: userId,
        type: InspectionType.PERIODIC,
        status: InspectionResult.PASS,
        scheduledDate: daysAgo(180),
        conductedDate: daysAgo(179),
        result: InspectionResult.PASS,
        findings: "Demo SP: Inspektim periodik - ashensor në gjendje të mirë.",
        approvedBodyNumber: "OM-DEMO-001",
        examinationType: "EKZAMINIM_I_PLOTE",
        nextInspectionDate: addMonths(new Date(), 6),
      },
    });
  }

  if (el2) {
    await prisma.maintenanceContract.create({
      data: {
        elevatorId: el2.id,
        maintenanceOrgId: orgId,
        serviceType: "PERIODIC_INSPECTION",
        contractNumber: `KO-SP-DEMO-${year}-PENDING`,
        startDate: new Date(),
        endDate: addMonths(new Date(), 12),
        status: MaintenanceContractStatus.PENDING,
        isActive: false,
      },
    });
  }
}

async function seedInstallationApplications(
  prisma: PrismaClient,
  serviceOrgId: string,
  ownerOrgId: string,
  ownerUserId: string,
  municipalityId: string,
) {
  const year = new Date().getFullYear();

  const scenarios: {
    suffix: string;
    status: ApplicationStatus;
    delegationStatus: DelegationStatus;
    returnToRole?: ReturnTargetRole;
    certifierPhase?: boolean;
    elevatorConditionType: "NEW" | "EXISTING";
    withTechnicalData?: boolean;
  }[] = [
    {
      suffix: "01",
      status: ApplicationStatus.PENDING_INSTALLER,
      delegationStatus: DelegationStatus.INVITED,
      elevatorConditionType: "NEW",
    },
    {
      suffix: "02",
      status: ApplicationStatus.INSTALLER_ACCEPTED,
      delegationStatus: DelegationStatus.ACCEPTED,
      elevatorConditionType: "NEW",
    },
    {
      suffix: "03",
      status: ApplicationStatus.TECHNICAL_DATA_IN_PROGRESS,
      delegationStatus: DelegationStatus.ACCEPTED,
      elevatorConditionType: "NEW",
      withTechnicalData: true,
    },
    {
      suffix: "04",
      status: ApplicationStatus.RETURNED,
      delegationStatus: DelegationStatus.ACCEPTED,
      returnToRole: ReturnTargetRole.INSTALLER,
      elevatorConditionType: "NEW",
      withTechnicalData: true,
    },
    {
      suffix: "05",
      status: ApplicationStatus.CERTIFICATION_IN_PROGRESS,
      delegationStatus: DelegationStatus.ACCEPTED,
      certifierPhase: true,
      elevatorConditionType: "EXISTING",
      withTechnicalData: true,
    },
    {
      suffix: "06",
      status: ApplicationStatus.PENDING_CERTIFIER,
      delegationStatus: DelegationStatus.INVITED,
      certifierPhase: true,
      elevatorConditionType: "EXISTING",
      withTechnicalData: true,
    },
  ];

  for (const scenario of scenarios) {
    const applicationNumber = `${SERVICE_PROVIDER_DEMO_APP_PREFIX}-${year}-${scenario.suffix}`;

    const app = await prisma.application.create({
      data: {
        applicationNumber,
        type: ApplicationType.NEW_REGISTRATION,
        status: scenario.status,
        ownerOrgId,
        installerOrgId: scenario.certifierPhase ? null : serviceOrgId,
        certifierOrgId: scenario.certifierPhase ? serviceOrgId : null,
        createdById: ownerUserId,
        returnToRole: scenario.returnToRole ?? null,
        returnReason: scenario.returnToRole ? "Demo SP: Plotësoni të dhënat teknike." : null,
      },
    });

    await prisma.applicationData.create({
      data: {
        applicationId: app.id,
        applicationDate: new Date(),
        buildingAddress: `Rr. Demo SP ${scenario.suffix}, Tiranë`,
        municipalityId,
        buildingName: `Godina Demo ${scenario.suffix}`,
        entrance: "A",
        buildingType: BuildingType.CO_OWNERSHIP_BUILDING,
        usagePurpose: UsagePurpose.ELECTRIC_PASSENGER,
        responsibleEntityName: "Shoqëria Demo SP",
        responsibleEntityEmail: "demo.sp@example.al",
        responsibleEntityPhone: "+355692000099",
        registrationExtendedData: {
          elevatorConditionType: scenario.elevatorConditionType,
        },
        ...(scenario.withTechnicalData
          ? {
              elevatorType: ElevatorType.PASSENGER,
              manufacturer: "Otis",
              model: "Gen2",
              serialNumber: `SP-DEMO-${scenario.suffix}`,
              manufacturingYear: scenario.elevatorConditionType === "EXISTING" ? 2015 : 2024,
              capacityKg: 630,
              capacityPersons: 8,
              floorsServed: 8,
            }
          : {}),
      },
    });

    if (!scenario.certifierPhase) {
      await prisma.applicationDelegation.create({
        data: {
          applicationId: app.id,
          organizationId: serviceOrgId,
          accessType: DelegationType.INSTALLER,
          status: scenario.delegationStatus,
          invitedById: ownerUserId,
          invitedAt: daysAgo(3),
          acceptedAt: scenario.delegationStatus === DelegationStatus.ACCEPTED ? daysAgo(2) : null,
        },
      });
    } else {
      await prisma.applicationDelegation.create({
        data: {
          applicationId: app.id,
          organizationId: serviceOrgId,
          accessType: DelegationType.CERTIFIER,
          status: scenario.delegationStatus,
          invitedById: ownerUserId,
          invitedAt: daysAgo(2),
          acceptedAt: scenario.delegationStatus === DelegationStatus.ACCEPTED ? daysAgo(1) : null,
        },
      });
    }
  }
}

export type ServiceProviderPortalDemoResult = {
  orgId: string;
  userId: string;
  email: string;
  nipt: string;
  password: string;
  elevatorCount: number;
  applicationCount: number;
};

/** Mbush të dhëna demo për të gjitha faqet e portalit të kompanisë shërbimi. */
export async function seedServiceProviderPortalDemo(
  prisma: PrismaClient,
): Promise<ServiceProviderPortalDemoResult> {
  const municipality = await prisma.geoMunicipality.findFirst({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
  if (!municipality) {
    throw new Error("Municipaliteti demo mungon. Ekzekutoni npm run db:seed.");
  }

  const { org, user } = await ensureOrgAndUser(prisma, municipality.id);
  const owner = await resolveOwnerContext(prisma);

  await cleanupPreviousDemo(prisma, org.id);

  const elevators = await ensureDemoElevators(
    prisma,
    owner.ownerOrgId,
    owner.ownerUserId,
    municipality.id,
    org.id,
    user.id,
  );

  await seedMaintenanceDemo(prisma, org.id, user.id, elevators);
  await seedOmDemo(prisma, org.id, user.id, elevators);
  await seedInstallationApplications(
    prisma,
    org.id,
    owner.ownerOrgId,
    owner.ownerUserId,
    municipality.id,
  );

  return {
    orgId: org.id,
    userId: user.id,
    email: SERVICE_PROVIDER_DEMO.email,
    nipt: SERVICE_PROVIDER_DEMO.nipt,
    password: SERVICE_PROVIDER_DEMO.password,
    elevatorCount: elevators.length,
    applicationCount: 6,
  };
}
