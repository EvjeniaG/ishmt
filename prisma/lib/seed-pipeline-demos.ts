import {
  CitizenReportStatus,
  CitizenReportType,
  InspectionResult,
  InspectionType,
  MaintenanceContractStatus,
  MaintenanceType,
  PrismaClient,
  ReportPriority,
} from "@prisma/client";
import { ComplianceService } from "../../src/lib/services/compliance-service";

const MONTHLY_REPORT_TYPE = "RAPORT_MUJOR";

export type PipelineDemoElevator = {
  id: string;
  registryNumber: string;
  buildingName: string;
  /** residential = 12 muaj, workplace = 6 muaj */
  inspectionIntervalMonths: number;
};

export type PipelineDemoActors = {
  ownerUserId: string;
  maintenanceUserId: string;
  certifierUserId: string;
  fieldInspectorUserId: string;
  sectorHeadUserId: string;
  maintenanceOrgId: string;
  certifierOrgId: string;
};

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

/**
 * Demo pipeline data - raportime qytetarësh, mirëmbajtje, inspektime periodike
 * (një për secilin ashensor demo).
 */
export async function seedPipelineDemos(
  prisma: PrismaClient,
  elevators: PipelineDemoElevator[],
  actors: PipelineDemoActors,
) {
  if (elevators.length < 2) {
    throw new Error("Duhen të paktën 2 ashensorë për demo pipeline.");
  }

  const [panorama, officeOne] = elevators;
  const year = new Date().getFullYear();

  const elevatorMunicipalities = await prisma.elevator.findMany({
    where: { id: { in: [panorama.id, officeOne.id] } },
    select: { id: true, municipalityId: true },
  });
  const municipalityByElevator = new Map(
    elevatorMunicipalities.map((e) => [e.id, e.municipalityId]),
  );

  // Idempotent: hiq demo të mëparshme (numra fiks demo)
  const demoReportNumbers = [
    `RPT-${year}-DEMO01`,
    `RPT-${year}-DEMO02`,
    `RPT-${year}-DEMO03`,
    `RPT-${year}-DEMO04`,
    `RPT-${year}-DEMO05`,
  ];
  await prisma.citizenReport.deleteMany({
    where: { reportNumber: { in: demoReportNumbers } },
  });

  // ---------------------------------------------------------------------------
  // RAPORTIMET E QYTETARËVE - SUBMITTED → … → RESOLVED
  // ---------------------------------------------------------------------------
  await prisma.citizenReport.createMany({
    data: [
      {
        reportNumber: demoReportNumbers[0],
        type: CitizenReportType.SAFETY_ISSUE,
        status: CitizenReportStatus.SUBMITTED,
        priority: ReportPriority.HIGH,
        elevatorId: panorama.id,
        municipalityId: municipalityByElevator.get(panorama.id) ?? null,
        description:
          "Demo: Ashensori u ngec midis katit 3 dhe 4. Dy persona brenda. Kërkohet ndihmë e menjëhershme.",
        reporterName: "Ana Gjini",
        reporterEmail: "ana.gjini@example.al",
        reporterPhone: "+355 69 111 2233",
        locationAddress: "Rruga e Durrësit, Tiranë",
      },
      {
        reportNumber: demoReportNumbers[1],
        type: CitizenReportType.NO_QR,
        status: CitizenReportStatus.SUBMITTED,
        priority: ReportPriority.NORMAL,
        elevatorId: officeOne.id,
        municipalityId: municipalityByElevator.get(officeOne.id) ?? null,
        description:
          "Demo: Nuk ka QR kod të dukshëm brenda kabinës. Nuk mund të verifikoj certifikatën e ashensorit.",
        reporterName: "Besnik Hoxha",
        reporterPhone: "+355 68 222 3344",
        locationAddress: "Blloku, Tiranë",
      },
      {
        reportNumber: demoReportNumbers[2],
        type: CitizenReportType.COMPLAINT,
        status: CitizenReportStatus.TRIAGED,
        priority: ReportPriority.NORMAL,
        elevatorId: panorama.id,
        municipalityId: municipalityByElevator.get(panorama.id) ?? null,
        description:
          "Demo: Zhurmë e tepërt gjatë lëvizjes, sidomos në mëngjes. U mor në shqyrtim - pres caktim inspektori.",
        reporterName: "Elona Krasniqi",
        reporterEmail: "elona.k@example.al",
        locationAddress: "Kompleksi Panorama, Tiranë",
      },
      {
        reportNumber: demoReportNumbers[3],
        type: CitizenReportType.SAFETY_ISSUE,
        status: CitizenReportStatus.ASSIGNED,
        priority: ReportPriority.HIGH,
        elevatorId: officeOne.id,
        municipalityId: municipalityByElevator.get(officeOne.id) ?? null,
        assignedInspectorId: actors.fieldInspectorUserId,
        description:
          "Demo: Dera e kabinës mbyllet shumë shpejt - rrezik për personat me lëvizje të kufizuar. Caktuar inspektor terreni.",
        reporterName: "Gent Rama",
        reporterPhone: "+355 67 333 4455",
        locationAddress: "Sheshi Wilson, Tiranë",
      },
      {
        reportNumber: demoReportNumbers[4],
        type: CitizenReportType.COMPLAINT,
        status: CitizenReportStatus.INVESTIGATING,
        priority: ReportPriority.NORMAL,
        elevatorId: panorama.id,
        municipalityId: municipalityByElevator.get(panorama.id) ?? null,
        assignedInspectorId: actors.fieldInspectorUserId,
        description:
          "Demo: Ashensori ndalet shpesh midis kateve. Inspektori terreni po heton në objekt.",
        reporterName: "Mira Shehu",
        reporterEmail: "mira.s@example.al",
        reporterPhone: "+355 69 444 5566",
        locationAddress: "Kompleksi Panorama, Tiranë",
      },
    ],
  });

  // ---------------------------------------------------------------------------
  // MIRËMBAJTJA - kontratë → ndërhyrje → raport mujor → compliance
  // ---------------------------------------------------------------------------
  await prisma.maintenanceRecord.deleteMany({
    where: { elevatorId: { in: [panorama.id, officeOne.id] } },
  });
  await prisma.maintenanceComplianceStatus.deleteMany({
    where: { elevatorId: { in: [panorama.id, officeOne.id] } },
  });

  const panoramaInterventionDate = daysAgo(10);
  await prisma.maintenanceRecord.create({
    data: {
      elevatorId: panorama.id,
      maintenanceOrgId: actors.maintenanceOrgId,
      type: MaintenanceType.ROUTINE,
      interventionType: "Rutinë",
      performedDate: panoramaInterventionDate,
      startTime: "09:00",
      endTime: "11:30",
      durationMinutes: 150,
      technicianName: "Florian Beqiri",
      description:
        "Demo: Kontroll rutinë - vajosje shinore, test sigurie, verifikim dyerve. Ashensori në gjendje normale.",
      createdById: actors.maintenanceUserId,
    },
  });
  await prisma.maintenanceRecord.create({
    data: {
      elevatorId: panorama.id,
      maintenanceOrgId: actors.maintenanceOrgId,
      type: MaintenanceType.ROUTINE,
      interventionType: MONTHLY_REPORT_TYPE,
      performedDate: monthStart(),
      description: "Demo: Raport mujor i dorëzuar në kohë.",
      createdById: actors.maintenanceUserId,
    },
  });
  await prisma.maintenanceComplianceStatus.create({
    data: {
      elevatorId: panorama.id,
      lastMaintenanceDate: panoramaInterventionDate,
      nextDueDate: addMonths(panoramaInterventionDate, 1),
      isCompliant: true,
      daysOverdue: 0,
    },
  });

  const officeInterventionDate = daysAgo(40);
  await prisma.maintenanceRecord.create({
    data: {
      elevatorId: officeOne.id,
      maintenanceOrgId: actors.maintenanceOrgId,
      type: MaintenanceType.EMERGENCY,
      interventionType: "Emergjencë",
      performedDate: officeInterventionDate,
      startTime: "14:00",
      endTime: "17:00",
      durationMinutes: 180,
      technicianName: "Florian Beqiri",
      description:
        "Demo: Ndërhyrje emergjence për zhurmë - u zëvendësua rulmenti. Mungon raporti mujor i muajit aktual (alarm).",
      partsReplaced: "Rulment primary sheave",
      createdById: actors.maintenanceUserId,
    },
  });
  await prisma.maintenanceComplianceStatus.create({
    data: {
      elevatorId: officeOne.id,
      lastMaintenanceDate: officeInterventionDate,
      nextDueDate: addMonths(officeInterventionDate, 1),
      isCompliant: false,
      daysOverdue: 10,
    },
  });

  // ---------------------------------------------------------------------------
  // INSPEKTIMET - kontratë PERIODIC_INSPECTION → PASS / FAIL
  // ---------------------------------------------------------------------------
  await prisma.inspection.deleteMany({
    where: { elevatorId: { in: [panorama.id, officeOne.id] } },
  });

  for (const elv of elevators) {
    await prisma.maintenanceContract.deleteMany({
      where: { elevatorId: elv.id, serviceType: "PERIODIC_INSPECTION" },
    });
    await prisma.maintenanceContract.create({
      data: {
        elevatorId: elv.id,
        maintenanceOrgId: actors.certifierOrgId,
        serviceType: "PERIODIC_INSPECTION",
        contractNumber: `KI-${year}-DEMO-${elv.id.slice(0, 4).toUpperCase()}`,
        startDate: daysAgo(30),
        endDate: addMonths(new Date(), 12),
        status: MaintenanceContractStatus.ACTIVE,
        isActive: true,
        respondedAt: daysAgo(29),
      },
    });
  }

  const panoramaInspectionDate = daysAgo(45);
  const panoramaNextInspection = addMonths(panoramaInspectionDate, panorama.inspectionIntervalMonths);
  await prisma.inspection.create({
    data: {
      elevatorId: panorama.id,
      inspectorId: actors.certifierUserId,
      type: InspectionType.PERIODIC,
      status: InspectionResult.PASS,
      result: InspectionResult.PASS,
      scheduledDate: panoramaInspectionDate,
      conductedDate: panoramaInspectionDate,
      approvedBodyNumber: "OMI-2026-001",
      examinationType: "PERIODIC_VISUAL",
      findings: "Demo: Inspektim periodik KALUES - ashensor në përputhje.",
      nextInspectionDate: panoramaNextInspection,
    },
  });

  const officeInspectionDate = daysAgo(14);
  const officeNextInspection = addMonths(officeInspectionDate, officeOne.inspectionIntervalMonths);
  await prisma.inspection.create({
    data: {
      elevatorId: officeOne.id,
      inspectorId: actors.certifierUserId,
      type: InspectionType.PERIODIC,
      status: InspectionResult.FAIL,
      result: InspectionResult.FAIL,
      scheduledDate: officeInspectionDate,
      conductedDate: officeInspectionDate,
      approvedBodyNumber: "OMI-2026-001",
      examinationType: "PERIODIC_VISUAL",
      findings:
        "Demo: Inspektim periodik JO KALUES - zhurmë e tepërt, kërkohet riparim dhe reinspektim.",
      nextInspectionDate: officeNextInspection,
    },
  });

  await prisma.elevator.update({
    where: { id: panorama.id },
    data: { requiresAttention: false },
  });
  await prisma.elevator.update({
    where: { id: officeOne.id },
    data: { requiresAttention: true },
  });

  for (const elv of elevators) {
    await ComplianceService.recalculateForElevator(elv.id);
  }

  return {
    citizenReports: demoReportNumbers,
    elevators: elevators.map((e) => e.registryNumber),
  };
}
