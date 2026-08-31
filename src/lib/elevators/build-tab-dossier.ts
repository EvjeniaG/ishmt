import type {
  Certificate,
  ElevatorTechnicalData,
  ElevatorTechnicalDataVersion,
  Inspection,
  MaintenanceComplianceStatus,
  MaintenanceContract,
  MaintenanceRecord,
  Organization,
  QrCode,
} from "@prisma/client";
import {
  formatWorkflowHistoryLine,
  labelApplicationStatus,
  labelApplicationType,
  labelCertificateStatus,
  labelCertificateType,
  labelDelegationStatus,
  labelDelegationType,
  labelElevatorStatus,
} from "@/lib/constants/display-labels";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";
import { buildElevatorCompleteDossier } from "@/lib/elevators/build-complete-dossier";
import {
  extractLegacyPeriodicComments,
  formatInspectionFindings,
  isLegacyImportFindings,
} from "@/lib/elevators/format-inspection-findings";
import { displayCertifierOrganizationName, formatOmBodyNumber } from "@/lib/elevators/format-om-body";
import {
  ELEVATOR_DRIVE_TYPE_LABELS,
  EXAMINATION_TYPE_LABELS,
  USAGE_CLASSIFICATION_LABELS,
  SPEED_RANGE_LABELS,
  YES_NO_LABELS,
} from "@/lib/registration/labels";
import {
  displayLegacyActorName,
  isLegacyMigrationApplicationNumber,
  LEGACY_REGISTRY_ATTRIBUTION,
} from "@/lib/migration/legacy-display";
import type { DossierField, DossierSection, RegistrationDossierApplication } from "@/lib/registration/build-dossier";

export type ElevatorTabGroup = { title: string; fields: DossierField[] };

export type ElevatorTabId =
  | "summary"
  | "technical"
  | "certificate"
  | "qr"
  | "documents"
  | "maintenance"
  | "inspections"
  | "history"
  | "applications";

const ELEVATOR_TYPE_LABELS: Record<string, string> = {
  PASSENGER: "Pasagjerësh",
  FREIGHT: "Mallrash",
  SERVICE: "Shërbimi",
  HANDICAPPED: "Persona me aftësi të kufizuara",
  ESCALATOR: "Shkallë lëvizëse",
  MOVING_WALK: "Trotuar lëvizës",
};

const INSPECTION_TYPE_LABELS: Record<string, string> = {
  INITIAL: "Fillestar",
  PERIODIC: "Periodik",
  EXTRAORDINARY: "Jashtëzakonshme",
  RE_INSPECTION: "Rinspektim",
};

const INSPECTION_RESULT_LABELS: Record<string, string> = {
  PASS: "Kaloi",
  FAIL: "Dështoi",
  CONDITIONAL: "Me kushte",
  PENDING: "Në pritje",
};

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  ROUTINE: "Rutinë",
  ANNUAL_SERVICE: "Shërbim vjetor",
  EMERGENCY: "Emergjencë",
  MODERNIZATION: "Modernizim",
};

const MAINTENANCE_CONTRACT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Në pritje",
  ACTIVE: "Aktive",
  REJECTED: "Refuzuar",
  EXPIRED: "E skaduar",
  TERMINATED: "E përfunduar",
};

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Po" : "Jo";
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return String(value);
}

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("sq-AL");
}

function fmtDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("sq-AL");
}

function labelFrom(map: Record<string, string>, code: string | null | undefined): string {
  if (!code) return "-";
  return map[code] ?? code;
}

function pickSectionFields(sections: DossierSection[], id: string): DossierField[] {
  return sections.find((s) => s.id === id)?.fields ?? [];
}

const CONFORMITY_RESULT_LABELS: Record<string, string> = {
  CONFORM: "Konform",
  NON_CONFORM: "Jo konform",
  CONDITIONAL: "Konform me kushte",
};

function additionalRegistryFields(raw: unknown): DossierField[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  const obj = raw as Record<string, unknown>;
  const { certifierMetadata, ...technicalRest } = obj;
  const fields: DossierField[] = [];

  const push = (label: string, value: unknown, format: "text" | "date" = "text") => {
    if (value === null || value === undefined || value === "") return;
    fields.push({
      label,
      value: format === "date" ? fmtDate(value as string) : fmt(value),
    });
  };

  push("Data e instalimit", technicalRest.installationDate, "date");
  push("Data e vënies në funksion", technicalRest.commissioningDate, "date");
  if (technicalRest.elevatorDriveType) {
    fields.push({
      label: "Lloji i ngritjes (formulari)",
      value: labelFrom(ELEVATOR_DRIVE_TYPE_LABELS, String(technicalRest.elevatorDriveType)),
    });
  }
  push("Lloj tjetër i ngritjes", technicalRest.elevatorDriveTypeOther);
  if (technicalRest.usageClassification) {
    fields.push({
      label: "Klasifikimi i përdorimit",
      value: labelFrom(USAGE_CLASSIFICATION_LABELS, String(technicalRest.usageClassification)),
    });
  }
  push("Viti i instalimit", technicalRest.installationYear);
  if (technicalRest.speedRange) {
    fields.push({
      label: "Shpejtësia (klasë)",
      value: labelFrom(SPEED_RANGE_LABELS, String(technicalRest.speedRange)),
    });
  }
  push("Hapje dyer", technicalRest.openings);
  if (technicalRest.accessibleForDisabled) {
    fields.push({
      label: "I aksesueshëm për persona me aftësi të kufizuara",
      value: labelFrom(YES_NO_LABELS, String(technicalRest.accessibleForDisabled)),
    });
  }
  push("Dimensionet e kabinës", technicalRest.cabinDimensions);
  push("Dimensionet e dyerve", technicalRest.doorDimensions);
  push("Shënime teknike të instaluesit", technicalRest.installerTechnicalNotes);
  push("Marka", technicalRest.brand);

  if (certifierMetadata && typeof certifierMetadata === "object" && !Array.isArray(certifierMetadata)) {
    const cm = certifierMetadata as Record<string, unknown>;
    const omi = cm.omiNumber ? formatOmBodyNumber(String(cm.omiNumber)) ?? String(cm.omiNumber) : null;
    push("Numri OM", omi);
    push("Data e certifikatës së instalimit", cm.installationCertificateDate, "date");
    if (cm.examinationType) {
      fields.push({
        label: "Lloji i ekzaminimit",
        value: labelFrom(EXAMINATION_TYPE_LABELS, String(cm.examinationType)),
      });
    }
    push("Data e ekzaminimit", cm.examinationDate, "date");
    if (cm.conformityResult) {
      fields.push({
        label: "Rezultati i konformitetit",
        value: labelFrom(CONFORMITY_RESULT_LABELS, String(cm.conformityResult)),
      });
    }
    push("Referenca e certifikatës", cm.certificateReference);
    push("Shënime të certifikuesit", cm.certifierNotes);
    push("Shënime teknike të certifikuesit", cm.certifierTechnicalNotes);
  }

  return fields;
}

function orgFields(prefix: string, org: Organization | null | undefined): DossierField[] {
  if (!org) return [{ label: `${prefix}`, value: "-" }];
  const displayName =
    prefix === "Certifikuesi"
      ? displayCertifierOrganizationName(org.name)
      : org.name;
  return [
    { label: `${prefix} - emri`, value: displayName },
    { label: `${prefix} - NIPT`, value: fmt(org.nipt) },
    { label: `${prefix} - email`, value: fmt(org.email) },
    { label: `${prefix} - telefon`, value: fmt(org.phone) },
    { label: `${prefix} - adresa`, value: fmt(org.address) },
  ];
}

function compactOrgField(prefix: string, org: Organization | null | undefined): DossierField | null {
  if (!org) return null;
  const displayName =
    prefix === "Certifikuesi (OM)"
      ? displayCertifierOrganizationName(org.name)
      : org.name;
  const nipt = org.nipt ? ` · ${org.nipt}` : "";
  return { label: prefix, value: `${displayName}${nipt}` };
}

function buildCompactRegistryFields(
  elevator: ElevatorForTabDossier,
  regCertNumber: string | null,
  regCertExpiry: Date | null,
  inspectionIntervalLabel: string,
): DossierField[] {
  return [
    { label: "Statusi", value: labelElevatorStatus(elevator.status) },
    { label: "Certifikata e regjistrimit", value: regCertNumber ?? "-" },
    { label: "Skadimi i certifikatës", value: fmtDate(regCertExpiry) },
    { label: "Intervali i inspektimit", value: inspectionIntervalLabel },
    { label: "Data e regjistrimit", value: fmtDate(elevator.registrationDate) },
  ];
}

function withApplicationNumberLink(
  fields: DossierField[],
  applicationId: string | undefined,
): DossierField[] {
  if (!applicationId) return fields;
  return fields.map((field) =>
    field.label === "Nr. aplikimit"
      ? { ...field, href: `/portal/applications/${applicationId}` }
      : field,
  );
}

function buildCompactPartiesFields(elevator: ElevatorForTabDossier): DossierField[] {
  return [
    compactOrgField("Personi përgjegjës", elevator.ownerOrg),
    compactOrgField("Instaluesi", elevator.installerOrg),
    compactOrgField("Certifikuesi (OM)", elevator.certifierOrg),
    compactOrgField("Mirëmbajtja", elevator.maintenanceOrg),
  ].filter((field): field is DossierField => field !== null);
}

function technicalDataFields(td: ElevatorTechnicalData | null): DossierField[] {
  if (!td) return [];
  return [
    { label: "Lloji i ashensorit", value: labelFrom(ELEVATOR_TYPE_LABELS, td.elevatorType) },
    { label: "Prodhuesi", value: fmt(td.manufacturer) },
    { label: "Modeli", value: fmt(td.model) },
    { label: "Nr. serial", value: fmt(td.serialNumber) },
    { label: "Viti i prodhimit", value: fmt(td.manufacturingYear) },
    { label: "Kapaciteti (kg)", value: fmt(td.capacityKg) },
    { label: "Kapaciteti (persona)", value: fmt(td.capacityPersons) },
    { label: "Shpejtësia (m/s)", value: fmt(td.speedMs) },
    { label: "Kate të shërbyera", value: fmt(td.floorsServed) },
    { label: "Ndalesa", value: fmt(td.stops) },
    { label: "Lloji i ngritjes", value: fmt(td.driveType) },
    { label: "Lloji i dyerve", value: fmt(td.doorType) },
    { label: "Sistemi i kontrollit", value: fmt(td.controlSystem) },
    ...additionalRegistryFields(td.additionalData),
    { label: "Përditësuar më", value: fmtDateTime(td.updatedAt) },
  ];
}

function versionFields(
  version: ElevatorTechnicalDataVersion & {
    createdBy?: { firstName: string; lastName: string } | null;
    application?: { applicationNumber: string } | null;
  },
): DossierField[] {
  return [
    { label: "Versioni", value: fmt(version.versionNumber) },
    { label: "Aktual", value: version.isCurrent ? "Po" : "Jo" },
    { label: "Lloji i ashensorit", value: labelFrom(ELEVATOR_TYPE_LABELS, version.elevatorType) },
    { label: "Prodhuesi", value: fmt(version.manufacturer) },
    { label: "Modeli", value: fmt(version.model) },
    { label: "Nr. serial", value: fmt(version.serialNumber) },
    { label: "Viti i prodhimit", value: fmt(version.manufacturingYear) },
    { label: "Kapaciteti (kg)", value: fmt(version.capacityKg) },
    { label: "Kapaciteti (persona)", value: fmt(version.capacityPersons) },
    { label: "Shpejtësia (m/s)", value: fmt(version.speedMs) },
    { label: "Kate të shërbyera", value: fmt(version.floorsServed) },
    { label: "Ndalesa", value: fmt(version.stops) },
    { label: "Lloji i ngritjes", value: fmt(version.driveType) },
    { label: "Lloji i dyerve", value: fmt(version.doorType) },
    { label: "Sistemi i kontrollit", value: fmt(version.controlSystem) },
    ...additionalRegistryFields(version.additionalData),
    { label: "Arsyeja e ndryshimit", value: fmt(version.changeReason) },
    {
      label: "Aplikimi burim",
      value: version.application?.applicationNumber ?? "-",
    },
    {
      label: "Krijuar nga",
      value: displayLegacyActorName(version.createdBy ?? null, {
        applicationNumber: version.application?.applicationNumber,
        legacyImport: Boolean(
          (version.additionalData as { legacyImport?: boolean } | null)?.legacyImport,
        ),
      }),
    },
    { label: "Data e versionit", value: fmtDateTime(version.createdAt) },
  ];
}

function certificateRecordFields(cert: Certificate): DossierField[] {
  return [
    { label: "Nr. certifikate", value: cert.certificateNumber },
    { label: "Lloji", value: labelCertificateType(cert.type) },
    { label: "Statusi", value: labelCertificateStatus(cert.status) },
    { label: "Data e lëshimit", value: fmtDate(cert.issuedDate) },
    { label: "Data e skadimit", value: fmtDate(cert.expiryDate) },
    cert.documentId
      ? {
          label: "Dokumenti",
          value: "Shkarko PDF",
          href: `/api/documents/${cert.documentId}/download`,
        }
      : { label: "Dokumenti PDF", value: "Mungon" },
  ];
}

function partitionRegistrationCertificates(certificates: Certificate[]) {
  const registration = certificates.filter((cert) => cert.type === "REGISTRATION");
  return {
    active: registration.filter((cert) => cert.status === "ACTIVE"),
    historical: registration.filter((cert) => cert.status !== "ACTIVE"),
  };
}

function buildCertificateTabGroups(
  certificates: Certificate[],
  sections: ReturnType<typeof buildElevatorCompleteDossier>,
  compactSummary: boolean,
): ElevatorTabGroup[] {
  const { active, historical } = partitionRegistrationCertificates(certificates);

  if (compactSummary) {
    return active.map((cert) => ({
      title: `Certifikata ${cert.certificateNumber}`,
      fields: certificateRecordFields(cert),
    }));
  }

  const groups: ElevatorTabGroup[] = [
    { title: "F. Certifikuesi (OM)", fields: pickSectionFields(sections, "certifier") },
    { title: "G. Certifikimi dhe konformiteti", fields: pickSectionFields(sections, "certification") },
    ...active.map((cert) => ({
      title: `Certifikata aktive e regjistrimit (${cert.certificateNumber})`,
      fields: certificateRecordFields(cert),
    })),
  ];

  if (historical.length > 0) {
    groups.push({
      title: "Historiku i certifikatave të zëvendësuara",
      fields: historical.flatMap((cert) => [
        { label: `Certifikata ${cert.certificateNumber}`, value: labelCertificateStatus(cert.status) },
        ...certificateRecordFields(cert),
      ]),
    });
  }

  return groups;
}

function buildCompactQrFields(qr: QrCode | null | undefined): DossierField[] {
  if (!qr) {
    return [{ label: "Statusi", value: "Kodi QR nuk është gjeneruar" }];
  }
  return [
    { label: "Aktiv", value: qr.isActive ? "Po" : "Jo" },
    { label: "Gjeneruar më", value: fmtDateTime(qr.generatedAt) },
    { label: "Numri i skanimeve", value: fmt(qr.scanCount) },
    { label: "Foto vendosjeje", value: qr.placementPhotoDocumentId ? "Konfirmuar" : "Mungon" },
    ...(qr.placementConfirmedAt
      ? [{ label: "Vendosja konfirmuar më", value: fmtDateTime(qr.placementConfirmedAt) }]
      : []),
  ];
}

function qrFields(qr: QrCode | null | undefined, publicUrl: string | null): DossierField[] {
  if (!qr) {
    return [{ label: "Statusi", value: "Kodi QR nuk është gjeneruar" }];
  }
  return [
    { label: "Kodi QR", value: qr.code },
    { label: "Aktiv", value: qr.isActive ? "Po" : "Jo" },
    { label: "URL publike", value: publicUrl ?? "-" },
    { label: "Gjeneruar më", value: fmtDateTime(qr.generatedAt) },
    { label: "Çaktivizuar më", value: fmtDateTime(qr.deactivatedAt) },
    { label: "Numri i skanimeve", value: fmt(qr.scanCount) },
    { label: "Imazhi QR", value: qr.imageDocumentId ? "Gjeneruar" : "Mungon" },
    { label: "Foto vendosjeje", value: qr.placementPhotoDocumentId ? "Konfirmuar" : "Mungon" },
    { label: "Vendosja konfirmuar më", value: fmtDateTime(qr.placementConfirmedAt) },
  ];
}

function maintenanceContractFields(
  contract: MaintenanceContract & { maintenanceOrg?: Organization | null },
): DossierField[] {
  return [
    { label: "Kompania", value: contract.maintenanceOrg?.name ?? "-" },
    { label: "Nr. kontrate", value: fmt(contract.contractNumber) },
    { label: "Lloji shërbimit", value: fmt(contract.serviceType) },
    { label: "Statusi", value: labelFrom(MAINTENANCE_CONTRACT_STATUS_LABELS, contract.status) },
    { label: "Aktive", value: contract.isActive ? "Po" : "Jo" },
    { label: "Fillimi", value: fmtDate(contract.startDate) },
    { label: "Mbarimi", value: fmtDate(contract.endDate) },
    { label: "Arsye refuzimi", value: fmt(contract.rejectionReason) },
    { label: "Përgjigjur më", value: fmtDateTime(contract.respondedAt) },
    { label: "Krijuar më", value: fmtDateTime(contract.createdAt) },
  ];
}

function maintenanceRecordFields(
  record: MaintenanceRecord & { maintenanceOrg?: Organization | null },
): DossierField[] {
  return [
    { label: "Kompania", value: record.maintenanceOrg?.name ?? "-" },
    { label: "Lloji", value: labelFrom(MAINTENANCE_TYPE_LABELS, record.type) },
    { label: "Lloji i ndërhyrjes", value: fmt(record.interventionType) },
    { label: "Data", value: fmtDate(record.performedDate) },
    { label: "Ora fillimit", value: fmt(record.startTime) },
    { label: "Ora mbarimit", value: fmt(record.endTime) },
    { label: "Kohëzgjatja (min)", value: fmt(record.durationMinutes) },
    { label: "Tekniku", value: fmt(record.technicianName) },
    { label: "Përshkrimi", value: fmt(record.description) },
    { label: "Pjesë të zëvendësuara", value: fmt(record.partsReplaced) },
    { label: "Gjetjet", value: fmt(record.findings) },
    { label: "Afati i radhës", value: fmtDate(record.nextDueDate) },
    { label: "Regjistruar më", value: fmtDateTime(record.createdAt) },
  ];
}

function complianceFields(compliance: MaintenanceComplianceStatus | null | undefined): DossierField[] {
  if (!compliance) return [];
  return [
    { label: "Mirëmbajtja e fundit", value: fmtDate(compliance.lastMaintenanceDate) },
    { label: "Afati i radhës", value: fmtDate(compliance.nextDueDate) },
    { label: "Në përputhje", value: compliance.isCompliant ? "Po" : "Jo" },
    { label: "Ditë vonë", value: fmt(compliance.daysOverdue) },
    { label: "Llogaritur më", value: fmtDateTime(compliance.lastCalculatedAt) },
  ];
}

function inspectionFields(
  insp: Inspection & { inspector?: { firstName: string; lastName: string } | null },
): DossierField[] {
  const legacyImport = isLegacyImportFindings(insp.findings);
  const findings = legacyImport
    ? extractLegacyPeriodicComments(insp.findings)
    : formatInspectionFindings(insp.findings);

  return [
    { label: "Lloji", value: labelFrom(INSPECTION_TYPE_LABELS, insp.type) },
    { label: "Statusi", value: labelFrom(INSPECTION_RESULT_LABELS, insp.status) },
    { label: "Rezultati", value: insp.result ? labelFrom(INSPECTION_RESULT_LABELS, insp.result) : "-" },
    { label: "Data e kryerjes", value: fmtDate(insp.conductedDate) },
    { label: "Inspektori", value: insp.inspector ? `${insp.inspector.firstName} ${insp.inspector.lastName}` : "-" },
    { label: legacyImport ? "Shënime" : "Gjetjet", value: fmt(findings) },
    { label: "Kushtet", value: fmt(insp.conditions) },
    {
      label: "Trupi OM",
      value: fmt(formatOmBodyNumber(insp.approvedBodyNumber) ?? insp.approvedBodyNumber),
    },
    { label: "Lloji i ekzaminimit", value: fmt(insp.examinationType) },
    { label: "Inspektimi i radhës", value: fmtDate(insp.nextInspectionDate) },
    { label: "Certifikata e lidhur", value: insp.certificateId ? "Po" : "Jo" },
    { label: "Krijuar më", value: fmtDateTime(insp.createdAt) },
    { label: "Përditësuar më", value: fmtDateTime(insp.updatedAt) },
  ];
}

type ElevatorForTabDossier = {
  registryNumber: string;
  status: string;
  buildingAddress: string;
  buildingName: string | null;
  gpsLatitude: { toString(): string } | null;
  gpsLongitude: { toString(): string } | null;
  registrationDate: Date;
  activationDate: Date | null;
  deregistrationDate: Date | null;
  deregistrationReason: string | null;
  requiresAttention: boolean;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  municipality: { nameSq: string };
  administrativeUnit: { nameSq: string } | null;
  ownerOrg: Organization;
  installerOrg: Organization;
  certifierOrg: Organization;
  maintenanceOrg: Organization | null;
  technicalData: ElevatorTechnicalData | null;
  technicalVersions: (ElevatorTechnicalDataVersion & {
    createdBy?: { firstName: string; lastName: string } | null;
    application?: { applicationNumber: string } | null;
  })[];
  certificates: Certificate[];
  qrCodes: QrCode[];
  maintenanceContracts: (MaintenanceContract & { maintenanceOrg?: Organization | null })[];
  maintenanceRecords: (MaintenanceRecord & { maintenanceOrg?: Organization | null })[];
  maintenanceCompliance: MaintenanceComplianceStatus | null;
  inspections: (Inspection & { inspector?: { firstName: string; lastName: string } | null })[];
  statusHistory: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    createdAt: Date;
    actor?: { firstName: string; lastName: string } | null;
  }[];
  ownershipHistory: {
    id: string;
    changeDate: Date;
    reason: string | null;
    oldOwner?: { name: string } | null;
    newOwner?: { name: string } | null;
  }[];
  delegationHistory: {
    id: string;
    delegationType: string;
    status: string;
    assignedAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    organization: { name: string };
  }[];
  originatingApplication: RegistrationDossierApplication | null;
  targetApplications: {
    id: string;
    applicationNumber: string;
    type: string;
    status: string;
    createdAt: Date;
    submittedAt: Date | null;
    data?: { updateType?: string | null; notes?: string | null } | null;
  }[];
};

function buildRegistryFields(
  elevator: ElevatorForTabDossier,
  complianceLabel: string,
  needsAttention: boolean,
  regCertNumber: string | null,
  regCertExpiry: Date | null,
  nextInspection: Date | null,
  inspectionIntervalLabel: string,
): DossierField[] {
  return [
    { label: "Nr. regjistrit", value: elevator.registryNumber },
    { label: "Statusi", value: labelElevatorStatus(elevator.status) },
    { label: "Përputhshmëria", value: complianceLabel },
    { label: "Nr. certifikate regjistrimi", value: regCertNumber ?? "-" },
    { label: "Skadimi certifikate", value: fmtDate(regCertExpiry) },
    { label: "Kërkon vëmendje", value: needsAttention ? "Po" : "Jo" },
    { label: "Emri i godinës", value: fmt(elevator.buildingName) },
    { label: "Adresa", value: elevator.buildingAddress },
    { label: "Bashkia", value: elevator.municipality.nameSq },
    { label: "Njësia administrative", value: fmt(elevator.administrativeUnit?.nameSq) },
    { label: "GPS - gjerësi", value: fmt(elevator.gpsLatitude) },
    { label: "GPS - gjatësi", value: fmt(elevator.gpsLongitude) },
    { label: "Data e regjistrimit", value: fmtDate(elevator.registrationDate) },
    { label: "Data e aktivizimit", value: fmtDate(elevator.activationDate) },
    { label: "Data e çregjistrimit", value: fmtDate(elevator.deregistrationDate) },
    { label: "Arsye çregjistrimi", value: fmt(elevator.deregistrationReason) },
    { label: "Konfirmuar më", value: fmtDateTime(elevator.confirmedAt) },
    { label: "Inspektimi i radhës", value: fmtDate(nextInspection) },
    { label: "Intervali i inspektimit", value: inspectionIntervalLabel },
    { label: "Krijuar në regjistër më", value: fmtDateTime(elevator.createdAt) },
    { label: "Përditësuar më", value: fmtDateTime(elevator.updatedAt) },
  ];
}

function buildApplicationDetailFields(
  app: ElevatorForTabDossier["targetApplications"][number] & { isOrigin?: boolean },
): DossierField[] {
  const legacyMigration = isLegacyMigrationApplicationNumber(app.applicationNumber);
  return [
    {
      label: "Nr. aplikimit",
      value: app.applicationNumber,
      href: `/portal/applications/${app.id}`,
    },
    {
      label: "Lloji",
      value: app.isOrigin ? "Regjistrim fillestar" : labelApplicationType(app.type, app.data?.updateType),
    },
    { label: "Statusi", value: labelApplicationStatus(app.status) },
    ...(legacyMigration ? [{ label: "Burimi", value: LEGACY_REGISTRY_ATTRIBUTION }] : []),
    { label: "Data e krijimit", value: fmtDateTime(app.createdAt) },
    { label: "Data e parashtrimit", value: fmtDateTime(app.submittedAt) },
    { label: "Shënime", value: fmt(app.data?.notes) },
  ];
}

export type ElevatorApplicationListItem = {
  id: string;
  applicationNumber: string;
  type: string;
  typeLabel: string;
  status: string;
  statusLabel: string;
  createdAt: Date;
  submittedAt: Date | null;
  notes: string | null;
  isOrigin: boolean;
};

export function buildElevatorApplicationsList(
  elevator: Pick<ElevatorForTabDossier, "originatingApplication" | "targetApplications">,
): ElevatorApplicationListItem[] {
  const originId = elevator.originatingApplication?.id;
  const items: ElevatorApplicationListItem[] = [];

  if (elevator.originatingApplication) {
    const app = elevator.originatingApplication;
    items.push({
      id: app.id,
      applicationNumber: app.applicationNumber,
      type: app.type,
      typeLabel: "Regjistrim fillestar",
      status: app.status,
      statusLabel: labelApplicationStatus(app.status),
      createdAt: app.createdAt,
      submittedAt: app.submittedAt,
      notes: app.data?.notes ?? null,
      isOrigin: true,
    });
  }

  for (const app of elevator.targetApplications) {
    if (app.id === originId) continue;
    items.push({
      id: app.id,
      applicationNumber: app.applicationNumber,
      type: app.type,
      typeLabel: labelApplicationType(app.type, app.data?.updateType),
      status: app.status,
      statusLabel: labelApplicationStatus(app.status),
      createdAt: app.createdAt,
      submittedAt: app.submittedAt,
      notes: app.data?.notes ?? null,
      isOrigin: false,
    });
  }

  return items.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

export function buildElevatorTabDossier(input: {
  elevator: ElevatorForTabDossier;
  complianceLabel: string;
  needsAttention: boolean;
  regCertNumber: string | null;
  regCertExpiry: Date | null;
  nextInspection: Date | null;
  inspectionIntervalLabel: string;
  qrPublicUrl: string | null;
  /** Përmbledhje e shkurtër për portalin e pronarit; staff merr versionin e plotë. */
  compactSummary?: boolean;
}): Record<ElevatorTabId, ElevatorTabGroup[]> {
  const {
    elevator,
    complianceLabel,
    needsAttention,
    regCertNumber,
    regCertExpiry,
    nextInspection,
    inspectionIntervalLabel,
    qrPublicUrl,
    compactSummary = false,
  } = input;

  const sections = buildElevatorCompleteDossier({
    registryNumber: elevator.registryNumber,
    technicalData: elevator.technicalData,
    originatingApplication: elevator.originatingApplication,
  });

  const registryFields = buildRegistryFields(
    elevator,
    complianceLabel,
    needsAttention,
    regCertNumber,
    regCertExpiry,
    nextInspection,
    inspectionIntervalLabel,
  );

  const partiesFields: DossierField[] = [
    ...orgFields("Personi përgjegjës i ashensorit", elevator.ownerOrg),
    ...orgFields("Instaluesi", elevator.installerOrg),
    ...orgFields("Certifikuesi", elevator.certifierOrg),
    ...orgFields("Mirëmbajtja", elevator.maintenanceOrg),
  ];

  const ownershipTransferred = elevator.ownershipHistory.length > 0;
  const responsibleSectionTitle = ownershipTransferred
    ? "B. Personi / subjekti përgjegjës (regjistrimi fillestar)"
    : "B. Personi / subjekti përgjegjës";
  const currentOwnerSection: ElevatorTabGroup | null = ownershipTransferred
    ? {
        title: "Personi përgjegjës aktual i ashensorit",
        fields: orgFields("Regjistri aktual", elevator.ownerOrg),
      }
    : null;

  const summary: ElevatorTabGroup[] = [
    {
      title: "Regjistri",
      fields: buildCompactRegistryFields(
        elevator,
        regCertNumber,
        regCertExpiry,
        inspectionIntervalLabel,
      ),
    },
    {
      title: "A. Të dhënat e aplikimit",
      fields: withApplicationNumberLink(
        pickSectionFields(sections, "application"),
        elevator.originatingApplication?.id,
      ),
    },
    {
      title: responsibleSectionTitle,
      fields: pickSectionFields(sections, "responsible"),
    },
    ...(currentOwnerSection ? [currentOwnerSection] : []),
    {
      title: "C. Godina dhe vendndodhja",
      fields: pickSectionFields(sections, "building"),
    },
    { title: "Palët e lidhura", fields: buildCompactPartiesFields(elevator) },
  ];

  const fullSummary: ElevatorTabGroup[] = [
    { title: "Regjistri dhe statusi", fields: registryFields },
    { title: "A. Të dhënat e aplikimit", fields: pickSectionFields(sections, "application") },
    { title: responsibleSectionTitle, fields: pickSectionFields(sections, "responsible") },
    ...(currentOwnerSection ? [currentOwnerSection] : []),
    { title: "C. Godina dhe vendndodhja", fields: pickSectionFields(sections, "building") },
    { title: "Palët e lidhura (regjistri aktual)", fields: partiesFields },
  ];

  const registryTechnicalFields = technicalDataFields(elevator.technicalData);
  const currentTechnicalVersion = elevator.technicalVersions.find((version) => version.isCurrent);
  const historicalTechnicalVersions = elevator.technicalVersions.filter((version) => !version.isCurrent);

  const technical: ElevatorTabGroup[] = compactSummary
    ? [
        {
          title: "Të dhënat teknike",
          fields:
            registryTechnicalFields.length > 0
              ? registryTechnicalFields
              : pickSectionFields(sections, "technical"),
        },
      ]
    : currentTechnicalVersion
      ? [
          { title: "D. Instaluesi", fields: pickSectionFields(sections, "installer") },
          {
            title: `Versioni teknik ${currentTechnicalVersion.versionNumber} (aktual)`,
            fields: versionFields(currentTechnicalVersion),
          },
          ...historicalTechnicalVersions.map((version) => ({
            title: `Versioni teknik ${version.versionNumber}`,
            fields: versionFields(version),
          })),
        ]
      : [
          { title: "D. Instaluesi", fields: pickSectionFields(sections, "installer") },
          { title: "E. Të dhënat teknike të ashensorit", fields: pickSectionFields(sections, "technical") },
          ...(registryTechnicalFields.length > 0
            ? [{ title: "Të dhënat teknike në regjistër", fields: registryTechnicalFields }]
            : []),
          ...elevator.technicalVersions.map((version) => ({
            title: `Versioni teknik ${version.versionNumber}${version.isCurrent ? " (aktual)" : ""}`,
            fields: versionFields(version),
          })),
        ];

  const certificate: ElevatorTabGroup[] = buildCertificateTabGroups(
    elevator.certificates,
    sections,
    compactSummary,
  );

  const qr: ElevatorTabGroup[] = compactSummary
    ? [{ title: "Regjistri QR", fields: buildCompactQrFields(elevator.qrCodes[0]) }]
    : [{ title: "Kodi QR", fields: qrFields(elevator.qrCodes[0], qrPublicUrl) }];

  const maintenance: ElevatorTabGroup[] = [
    { title: "Kompania aktuale e mirëmbajtjes", fields: orgFields("Mirëmbajtja", elevator.maintenanceOrg) },
    { title: "Përputhshmëria e mirëmbajtjes", fields: complianceFields(elevator.maintenanceCompliance) },
    ...elevator.maintenanceContracts.map((contract, index) => ({
      title: `Kontrata ${contract.contractNumber ?? index + 1}`,
      fields: maintenanceContractFields(contract),
    })),
    ...elevator.maintenanceRecords.map((record, index) => ({
      title: `Regjistër mirëmbajtjeje ${fmtDate(record.performedDate) !== "-" ? fmtDate(record.performedDate) : index + 1}`,
      fields: maintenanceRecordFields(record),
    })),
  ];

  const inspections: ElevatorTabGroup[] = elevator.inspections.map((insp, index) => ({
    title: `Inspektim ${labelFrom(INSPECTION_TYPE_LABELS, insp.type)} - ${fmtDate(insp.conductedDate ?? insp.scheduledDate) !== "-" ? fmtDate(insp.conductedDate ?? insp.scheduledDate) : index + 1}`,
    fields: inspectionFields(insp),
  }));

  const workflowFields: DossierField[] =
    elevator.originatingApplication?.workflowHistory?.map((h) => ({
      label: formatWorkflowHistoryLine({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        action: h.action,
        statusLabels: APPLICATION_STATUS_LABELS,
      }),
      value: fmtDateTime(h.createdAt),
    })) ?? [];

  const history: ElevatorTabGroup[] = [
    {
      title: "Aplikimi fillestar",
      fields: elevator.originatingApplication
        ? [
            { label: "Nr. aplikimit", value: elevator.originatingApplication.applicationNumber },
            { label: "Statusi", value: labelApplicationStatus(elevator.originatingApplication.status) },
            { label: "Krijuar më", value: fmtDateTime(elevator.originatingApplication.createdAt) },
          ]
        : [],
    },
    { title: "Historiku i statusit të ashensorit", fields: elevator.statusHistory.map((h) => ({
      label: fmtDateTime(h.createdAt),
      value: `${labelElevatorStatus(h.fromStatus)} → ${labelElevatorStatus(h.toStatus)}${h.reason ? ` - ${h.reason}` : ""}${h.actor ? ` (${h.actor.firstName} ${h.actor.lastName})` : ""}`,
    })) },
    { title: "Historiku i pronësisë", fields: elevator.ownershipHistory.map((o) => ({
      label: fmtDate(o.changeDate),
      value: `${o.oldOwner?.name ?? "?"} → ${o.newOwner?.name ?? "?"}${o.reason ? ` - ${o.reason}` : ""}`,
    })) },
    { title: "Historiku i delegimeve", fields: elevator.delegationHistory.map((d) => ({
      label: fmtDateTime(d.assignedAt),
      value: `${labelDelegationType(d.delegationType)} - ${d.organization.name} (${labelDelegationStatus(d.status)})`,
    })) },
    { title: "Historiku i aplikimit (workflow)", fields: workflowFields },
  ];

  const applicationItems = buildElevatorApplicationsList(elevator);
  const applications: ElevatorTabGroup[] = applicationItems.map((item) => ({
    title: item.isOrigin
      ? `Aplikimi fillestar · ${item.applicationNumber}`
      : `${item.typeLabel} · ${item.applicationNumber}`,
    fields: buildApplicationDetailFields({
      id: item.id,
      applicationNumber: item.applicationNumber,
      type: item.type,
      status: item.status,
      createdAt: item.createdAt,
      submittedAt: item.submittedAt,
      data: { notes: item.notes, updateType: null },
      isOrigin: item.isOrigin,
    }),
  }));

  return {
    summary: compactSummary ? summary : fullSummary,
    technical, certificate, qr, maintenance, inspections, history, applications, documents: [] };
}
