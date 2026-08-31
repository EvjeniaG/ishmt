import {
  ApplicationStatus,
  BuildingType,
  ConformityResult,
  DelegationStatus,
  DelegationType,
  UsagePurpose,
} from "@prisma/client";
import { getApplicationStatusLabel } from "@/lib/registration/status-presentation";
import { formatWorkflowHistoryLine } from "@/lib/constants/display-labels";
import { APPLICATION_STATUS_LABELS } from "@/lib/workflows/application-workflow";
import {
  annexBuildingTypeCode,
  annexUsagePurposeCode,
  LEGACY_DRIVE_TYPE_LABELS,
} from "@/lib/registration/anneks-codes";
import {
  APPLICATION_SUBTYPE_LABELS,
  CONFORMITY_RESULT_LABELS,
  ELEVATOR_CONDITION_LABELS,
  ELEVATOR_DRIVE_TYPE_LABELS,
  EU_DECLARATION_LABELS,
  EXAMINATION_TYPE_LABELS,
  IDENTIFIER_TYPE_LABELS,
  REGISTRATION_BUILDING_TYPE_LABELS,
  REGISTRATION_USAGE_PURPOSE_LABELS,
  RESPONSIBLE_ENTITY_TYPE_LABELS,
  SPEED_RANGE_LABELS,
  USAGE_CLASSIFICATION_LABELS,
  YES_NO_LABELS,
} from "@/lib/registration/labels";
import {
  displayCertifierOrganizationName,
  formatOmBodyNumber,
} from "@/lib/elevators/format-om-body";
import {
  certifierOrganizationFieldLabel,
  isLegacyMigrationApplicationNumber,
  isOmBodyOrganizationName,
  LEGACY_REGISTRY_ATTRIBUTION,
} from "@/lib/migration/legacy-display";

export type DossierField = { label: string; value: string; href?: string };
export type DossierSection = { id: string; title: string; fields: DossierField[] };

type RegistrationExtended = {
  elevatorConditionType?: keyof typeof ELEVATOR_CONDITION_LABELS;
  applicationSubtype?: keyof typeof APPLICATION_SUBTYPE_LABELS;
  existingRegisteredElevatorsCount?: number;
  responsibleEntityType?: keyof typeof RESPONSIBLE_ENTITY_TYPE_LABELS;
  responsibleIdentifierType?: keyof typeof IDENTIFIER_TYPE_LABELS;
  responsibleAddress?: string;
  representedBy?: string;
  representativePosition?: string;
  registrationBuildingType?: keyof typeof REGISTRATION_BUILDING_TYPE_LABELS;
  buildingMainUse?: string;
  businessNameIfWorkplace?: string;
  businessNiptIfWorkplace?: string;
  usagePurposeCode?: keyof typeof REGISTRATION_USAGE_PURPOSE_LABELS;
  usagePurposeOther?: string;
};

type TechnicalExtended = {
  brand?: string;
  elevatorDriveType?: keyof typeof ELEVATOR_DRIVE_TYPE_LABELS;
  elevatorDriveTypeOther?: string;
  usageClassification?: keyof typeof USAGE_CLASSIFICATION_LABELS;
  installationDate?: string;
  commissioningDate?: string;
  installationYear?: number;
  speedRange?: keyof typeof SPEED_RANGE_LABELS;
  openings?: number;
  accessibleForDisabled?: keyof typeof YES_NO_LABELS;
  cabinDimensions?: string;
  doorDimensions?: string;
  installerTechnicalNotes?: string;
};

type CertificationExtended = {
  certifierResponsiblePerson?: string;
  reportNumber?: string;
  euDeclarationPresent?: keyof typeof EU_DECLARATION_LABELS;
  euDeclarationNumber?: string;
  conformityResultCode?: keyof typeof CONFORMITY_RESULT_LABELS;
  examinationTypeCode?: keyof typeof EXAMINATION_TYPE_LABELS;
};

const BUILDING_TYPE_FROM_PRISMA: Record<BuildingType, string> = {
  WORKPLACE: REGISTRATION_BUILDING_TYPE_LABELS.VEND_PUNE_QENDER_TREGTARE,
  CO_OWNERSHIP_BUILDING: REGISTRATION_BUILDING_TYPE_LABELS.NDERTESA_NE_BASHKEPRONESI,
  RESIDENTIAL: REGISTRATION_BUILDING_TYPE_LABELS.MJEDISE_SHTEPIAKE,
  PUBLIC_BUILDING: "Ndërtesë publike",
  SHOPPING_CENTER: "Qendër tregtare",
  OTHER: "Tjetër",
};

const USAGE_PURPOSE_FROM_PRISMA: Record<UsagePurpose, string> = {
  ELECTRIC_PASSENGER: REGISTRATION_USAGE_PURPOSE_LABELS.TRANSPORT_NJEREZISH_ELEKTRIK,
  HYDRAULIC_PASSENGER: REGISTRATION_USAGE_PURPOSE_LABELS.TRANSPORT_NJEREZISH_HIDRAULIK,
  PASSENGER_AND_FREIGHT: REGISTRATION_USAGE_PURPOSE_LABELS.TRANSPORT_NJEREZISH_DHE_MALLRASH,
  PASSENGER_AND_BED: REGISTRATION_USAGE_PURPOSE_LABELS.TRANSPORT_NJEREZISH_DHE_SHTRATI,
  PASSENGER_AND_MOTOR_DEVICE: REGISTRATION_USAGE_PURPOSE_LABELS.TRANSPORT_NJEREZISH_DHE_PAJISJE_MOTORIKE,
  OTHER: REGISTRATION_USAGE_PURPOSE_LABELS.TJETER,
};

const CONFORMITY_FROM_PRISMA: Record<ConformityResult, string> = {
  CONFORM: CONFORMITY_RESULT_LABELS.KONFORM,
  NON_CONFORM: CONFORMITY_RESULT_LABELS.JO_KONFORM,
  CONDITIONAL: CONFORMITY_RESULT_LABELS.KONFORM_ME_KUSHTE,
};

const DELEGATION_STATUS_LABELS: Record<DelegationStatus, string> = {
  PENDING: "Në pritje",
  INVITED: "Ftuar",
  ACCEPTED: "Pranuar",
  REJECTED: "Refuzuar",
  EXPIRED: "Skaduar",
  REVOKED: "Revokuar",
};

function fmt(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Po" : "Jo";
  return String(value);
}

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("sq-AL");
}

function fmtDateTime(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return d.toLocaleString("sq-AL");
}

function labelFrom<T extends Record<string, string>>(map: T, code: string | null | undefined): string {
  if (!code) return "-";
  return map[code as keyof T] ?? code;
}

function driveTypeLabel(
  technicalCode: keyof typeof ELEVATOR_DRIVE_TYPE_LABELS | undefined,
  prismaDrive: string | null | undefined,
): string {
  if (technicalCode) return labelFrom(ELEVATOR_DRIVE_TYPE_LABELS, technicalCode);
  if (!prismaDrive) return "-";
  const formal = labelFrom(ELEVATOR_DRIVE_TYPE_LABELS, prismaDrive as keyof typeof ELEVATOR_DRIVE_TYPE_LABELS);
  if (formal !== prismaDrive) return formal;
  return LEGACY_DRIVE_TYPE_LABELS[prismaDrive] ?? prismaDrive;
}

function splitAdditionalTechnical(raw: unknown): { technical: TechnicalExtended; certification: CertificationExtended } {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const technical: TechnicalExtended = {};
  const certification: CertificationExtended = {};

  const technicalKeys = [
    "brand",
    "elevatorDriveType",
    "elevatorDriveTypeOther",
    "usageClassification",
    "installationDate",
    "commissioningDate",
    "installationYear",
    "speedRange",
    "openings",
    "accessibleForDisabled",
    "cabinDimensions",
    "doorDimensions",
    "installerTechnicalNotes",
  ] as const;

  const certKeys = [
    "certifierResponsiblePerson",
    "reportNumber",
    "euDeclarationPresent",
    "euDeclarationNumber",
    "conformityResultCode",
    "examinationTypeCode",
  ] as const;

  for (const key of technicalKeys) {
    if (obj[key] !== undefined) (technical as Record<string, unknown>)[key] = obj[key];
  }
  for (const key of certKeys) {
    if (obj[key] !== undefined) (certification as Record<string, unknown>)[key] = obj[key];
  }

  return { technical, certification };
}

export type RegistrationDossierApplication = {
  id: string;
  applicationNumber: string;
  type: string;
  status: ApplicationStatus;
  createdAt: Date;
  submittedAt: Date | null;
  ownerOrg: { name: string; nipt?: string | null };
  installerOrg: { name: string; nipt?: string | null; email?: string | null; phone?: string | null } | null;
  certifierOrg: { name: string; nipt?: string | null; email?: string | null; phone?: string | null } | null;
  delegations?: {
    accessType: DelegationType;
    status: DelegationStatus;
    invitedAt: Date | null;
    acceptedAt: Date | null;
    organization: { name: string };
  }[];
  workflowHistory?: {
    id: string;
    fromStatus: ApplicationStatus | null;
    toStatus: ApplicationStatus;
    action: string;
    createdAt: Date;
  }[];
  data: {
    applicationDate: Date | null;
    buildingAddress: string | null;
    municipality: { nameSq: string } | null;
    administrativeUnit: { nameSq: string } | null;
    buildingName: string | null;
    entrance: string | null;
    specificPosition: string | null;
    legacyDistrictCode: string | null;
    buildingType: BuildingType | null;
    usagePurpose: UsagePurpose | null;
    responsibleEntityName: string | null;
    responsibleEntityIdentifier: string | null;
    responsibleEntityEmail: string | null;
    responsibleEntityPhone: string | null;
    notes: string | null;
    manufacturer: string | null;
    model: string | null;
    serialNumber: string | null;
    manufacturingYear: number | null;
    capacityKg: number | null;
    capacityPersons: number | null;
    speedMs: { toString(): string } | number | null;
    floorsServed: number | null;
    stops: number | null;
    driveType: string | null;
    elevatorType: string | null;
    additionalTechnical: unknown;
    registrationExtendedData: unknown;
    installationCertificateNumber: string | null;
    installationCertificateDate: Date | null;
    certifierNotes: string | null;
    omiNumber: string | null;
    examinationType: string | null;
    examinationDate: Date | null;
    conformityResult: ConformityResult | null;
    certificateReference: string | null;
    certifierTechnicalNotes: string | null;
  } | null;
};

export function buildRegistrationSubmissionChecklist(
  missingFields: string[],
  missingDocuments: string[],
  options?: { hasCertificationIssues?: boolean; conformityOk?: boolean },
): { key: string; label: string; ok: boolean }[] {
  const ownerFieldKeys = [
    "adresa",
    "bashkia",
    "tipi i godinës",
    "qëllimi i përdorimit",
    "personi përgjegjës",
    "data e aplikimit (Aneksi 1)",
    "lloji i ashensorit (i ri/ekzistues)",
    "nënlloji i aplikimit",
    "lloji i personit përgjegjës",
    "tipi i ndërtesës (Aneksi 1)",
    "qëllimi i përdorimit (Aneksi 1)",
  ];
  const technicalFieldKeys = ["numri serial", "prodhuesi", "katet"];
  const certificationFieldKeys = [
    "certifikuesi",
    "numri OM",
    "data e ekzaminimit",
    "referenca e certifikatës",
    "data e certifikatës",
  ];

  const missingOwner = missingFields.some((f) => ownerFieldKeys.includes(f));
  const missingTechnical = missingFields.some((f) => technicalFieldKeys.includes(f));
  const missingCertification = missingFields.some((f) => certificationFieldKeys.includes(f));
  const missingInstaller = missingFields.includes("instaluesi");

  return [
    { key: "owner", label: "Të dhënat e personit përgjegjës të ashensorit dhe godinës", ok: !missingOwner },
    { key: "installer", label: "Instaluesi i caktuar", ok: !missingInstaller },
    { key: "technical", label: "Të dhënat teknike të ashensorit", ok: !missingTechnical },
    {
      key: "certification",
      label: "Certifikimi dhe konformiteti",
      ok:
        !missingCertification &&
        !options?.hasCertificationIssues &&
        options?.conformityOk !== false,
    },
    { key: "documents", label: "Dokumentacioni i ngarkuar", ok: missingDocuments.length === 0 },
  ];
}

export function buildRegistrationDossier(application: RegistrationDossierApplication): {
  sections: DossierSection[];
  workflow: { id: string; label: string; at: string }[];
} {
  const data = application.data;
  const ext = (data?.registrationExtendedData ?? {}) as RegistrationExtended;
  const { technical, certification } = splitAdditionalTechnical(data?.additionalTechnical);

  const installerDelegation = application.delegations?.find((d) => d.accessType === DelegationType.INSTALLER);
  const certifierDelegation = application.delegations?.find((d) => d.accessType === DelegationType.CERTIFIER);

  const buildingAnnexCode = annexBuildingTypeCode(ext.registrationBuildingType, data?.buildingType);
  const buildingTypeLabel = buildingAnnexCode
    ? REGISTRATION_BUILDING_TYPE_LABELS[buildingAnnexCode]
    : data?.buildingType
      ? BUILDING_TYPE_FROM_PRISMA[data.buildingType]
      : "-";

  const usageAnnexCode = annexUsagePurposeCode(ext.usagePurposeCode, data?.usagePurpose);
  const usagePurposeLabel = usageAnnexCode
    ? REGISTRATION_USAGE_PURPOSE_LABELS[usageAnnexCode]
    : data?.usagePurpose
      ? USAGE_PURPOSE_FROM_PRISMA[data.usagePurpose]
      : "-";

  const driveLabel = driveTypeLabel(technical.elevatorDriveType, data?.driveType);

  const conformityLabel = certification.conformityResultCode
    ? labelFrom(CONFORMITY_RESULT_LABELS, certification.conformityResultCode)
    : data?.conformityResult
      ? CONFORMITY_FROM_PRISMA[data.conformityResult]
      : "-";

  const legacyMigration = isLegacyMigrationApplicationNumber(application.applicationNumber);
  const certifierOrgName = application.certifierOrg?.name;
  const certifierDisplayName = displayCertifierOrganizationName(certifierOrgName, data?.omiNumber);

  const sections: DossierSection[] = [
    {
      id: "application",
      title: "A. Të dhënat e aplikimit",
      fields: [
        { label: "Nr. aplikimit", value: application.applicationNumber },
        { label: "Lloji", value: "Regjistrim i ri" },
        {
          label: "Statusi aktual",
          value: getApplicationStatusLabel(
            application.status,
            application.type as import("@prisma/client").ApplicationType,
          ),
        },
        ...(legacyMigration
          ? [{ label: "Burimi", value: LEGACY_REGISTRY_ATTRIBUTION }]
          : []),
        { label: "Data e aplikimit", value: fmtDate(data?.applicationDate) },
        {
          label: "Data e instalimit / vënies në shërbim",
          value: fmtDate(
            (ext.elevatorInServiceDate as string | undefined) ??
              technical.installationDate ??
              technical.commissioningDate,
          ),
        },
        { label: "Data e krijimit", value: fmtDate(application.createdAt) },
        { label: "Data e parashtrimit", value: fmtDate(application.submittedAt) },
        { label: "Organizata e personit përgjegjës", value: application.ownerOrg.name },
        {
          label: "Gjendja e ashensorit",
          value: labelFrom(ELEVATOR_CONDITION_LABELS, ext.elevatorConditionType),
        },
        {
          label: "Nënlloji i aplikimit",
          value: labelFrom(APPLICATION_SUBTYPE_LABELS, ext.applicationSubtype),
        },
        {
          label: "Ashensorë të regjistruar më parë",
          value: fmt(ext.existingRegisteredElevatorsCount),
        },
        { label: "Shënime të personit përgjegjës", value: fmt(data?.notes) },
      ],
    },
    {
      id: "responsible",
      title: "B. Personi / subjekti përgjegjës",
      fields: [
        {
          label: "Lloji i subjektit",
          value: labelFrom(RESPONSIBLE_ENTITY_TYPE_LABELS, ext.responsibleEntityType),
        },
        { label: "Emri", value: fmt(data?.responsibleEntityName) },
        {
          label: "Lloji i identifikuesit",
          value: labelFrom(IDENTIFIER_TYPE_LABELS, ext.responsibleIdentifierType),
        },
        {
          label: "NID / NIPT",
          value: fmt(data?.responsibleEntityIdentifier ?? application.ownerOrg.nipt),
        },
        { label: "Telefoni", value: fmt(data?.responsibleEntityPhone) },
        { label: "Email", value: fmt(data?.responsibleEntityEmail) },
        { label: "Përfaqësuar nga", value: fmt(ext.representedBy) },
        { label: "Pozicioni i përfaqësuesit", value: fmt(ext.representativePosition) },
      ],
    },
    {
      id: "building",
      title: "C. Godina dhe vendndodhja",
      fields: [
        { label: "Emri i godinës", value: fmt(data?.buildingName) },
        { label: "Adresa", value: fmt(data?.buildingAddress) },
        { label: "Bashkia", value: fmt(data?.municipality?.nameSq) },
        { label: "Njësia administrative", value: fmt(data?.administrativeUnit?.nameSq) },
        { label: "Hyrja", value: fmt(data?.entrance) },
        { label: "Pozicioni specifik", value: fmt(data?.specificPosition) },
        { label: "Lloji i ndërtesës", value: buildingTypeLabel },
        { label: "Natyra e përdorimit", value: fmt(ext.buildingMainUse) },
        { label: "Emri tregtar (vend pune)", value: fmt(ext.businessNameIfWorkplace) },
        { label: "NIPT (vend pune)", value: fmt(ext.businessNiptIfWorkplace) },
        { label: "Qëllimi i përdorimit", value: usagePurposeLabel },
        { label: "Qëllim tjetër (specifikim)", value: fmt(ext.usagePurposeOther) },
      ],
    },
    {
      id: "installer",
      title: "D. Instaluesi",
      fields: [
        { label: "Kompania e instalimit", value: fmt(application.installerOrg?.name) },
        { label: "NIPT", value: fmt(application.installerOrg?.nipt) },
        { label: "Email", value: fmt(application.installerOrg?.email) },
        { label: "Telefoni", value: fmt(application.installerOrg?.phone) },
        {
          label: "Statusi i delegimit",
          value: installerDelegation ? DELEGATION_STATUS_LABELS[installerDelegation.status] : "-",
        },
        { label: "Data e ftesës", value: fmtDate(installerDelegation?.invitedAt) },
        { label: "Data e pranimit", value: fmtDate(installerDelegation?.acceptedAt) },
      ],
    },
    {
      id: "technical",
      title: "E. Të dhënat teknike të ashensorit",
      fields: [
        { label: "Marka", value: fmt(technical.brand ?? data?.model) },
        { label: "Prodhuesi", value: fmt(data?.manufacturer) },
        { label: "Modeli", value: fmt(data?.model) },
        { label: "Nr. serial", value: fmt(data?.serialNumber) },
        { label: "Viti i instalimit", value: fmt(technical.installationYear ?? data?.manufacturingYear) },
        { label: "Data e instalimit", value: fmtDate(technical.installationDate) },
        { label: "Data e vënies në funksion", value: fmtDate(technical.commissioningDate) },
        { label: "Lloji i ngritjes", value: driveLabel },
        { label: "Lloj tjetër (specifikim)", value: fmt(technical.elevatorDriveTypeOther) },
        {
          label: "Klasifikimi i përdorimit",
          value: labelFrom(USAGE_CLASSIFICATION_LABELS, technical.usageClassification),
        },
        { label: "Kapaciteti (kg)", value: fmt(data?.capacityKg) },
        { label: "Kapaciteti (persona)", value: fmt(data?.capacityPersons) },
        {
          label: "Shpejtësia",
          value: technical.speedRange
            ? labelFrom(SPEED_RANGE_LABELS, technical.speedRange)
            : data?.speedMs
              ? `${data.speedMs} m/s`
              : "-",
        },
        { label: "Kate të shërbyera", value: fmt(data?.floorsServed) },
        { label: "Ndalesa", value: fmt(data?.stops) },
        { label: "Hapje dyer", value: fmt(technical.openings) },
        {
          label: "I aksesueshëm për persona me aftësi të kufizuara",
          value: labelFrom(YES_NO_LABELS, technical.accessibleForDisabled),
        },
        { label: "Dimensionet e kabinës", value: fmt(technical.cabinDimensions) },
        { label: "Dimensionet e dyerve", value: fmt(technical.doorDimensions) },
        { label: "Shënime teknike të instaluesit", value: fmt(technical.installerTechnicalNotes) },
      ],
    },
    {
      id: "certifier",
      title: "F. Certifikuesi (OM)",
      fields: [
        {
          label: certifierOrganizationFieldLabel(certifierOrgName),
          value: fmt(certifierDisplayName),
        },
        ...(isOmBodyOrganizationName(certifierOrgName)
          ? []
          : [
              { label: "NIPT", value: fmt(application.certifierOrg?.nipt) },
              { label: "Email", value: fmt(application.certifierOrg?.email) },
              { label: "Telefoni", value: fmt(application.certifierOrg?.phone) },
            ]),
        {
          label: "Statusi i delegimit",
          value: certifierDelegation ? DELEGATION_STATUS_LABELS[certifierDelegation.status] : "-",
        },
        { label: "Data e ftesës", value: fmtDate(certifierDelegation?.invitedAt) },
        { label: "Data e pranimit", value: fmtDate(certifierDelegation?.acceptedAt) },
      ],
    },
    {
      id: "certification",
      title: "G. Certifikimi dhe konformiteti",
      fields: [
        { label: "Trupi OM", value: fmt(formatOmBodyNumber(data?.omiNumber) ?? data?.omiNumber) },
        { label: "Personi përgjegjës (certifikues)", value: fmt(certification.certifierResponsiblePerson) },
        {
          label: "Lloji i ekzaminimit",
          value: certification.examinationTypeCode
            ? labelFrom(EXAMINATION_TYPE_LABELS, certification.examinationTypeCode)
            : labelFrom(EXAMINATION_TYPE_LABELS, data?.examinationType as keyof typeof EXAMINATION_TYPE_LABELS),
        },
        { label: "Data e ekzaminimit", value: fmtDate(data?.examinationDate) },
        { label: "Rezultati i konformitetit", value: conformityLabel },
        { label: "Nr. reference certifikate", value: fmt(data?.certificateReference) },
        { label: "Nr. raporti", value: fmt(certification.reportNumber) },
        { label: "Nr. certifikate instalimi", value: fmt(data?.installationCertificateNumber) },
        { label: "Data e certifikatës së instalimit", value: fmtDate(data?.installationCertificateDate) },
        {
          label: "Deklarata EU e konformitetit",
          value: labelFrom(EU_DECLARATION_LABELS, certification.euDeclarationPresent),
        },
        { label: "Nr. deklaratës EU", value: fmt(certification.euDeclarationNumber) },
        { label: "Shënime të certifikuesit", value: fmt(data?.certifierTechnicalNotes ?? data?.certifierNotes) },
      ],
    },
  ];

  const workflow = (application.workflowHistory ?? []).map((h) => ({
    id: h.id,
    label: formatWorkflowHistoryLine({
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      action: h.action,
      statusLabels: APPLICATION_STATUS_LABELS,
    }),
    at: fmtDateTime(h.createdAt),
  }));

  return { sections, workflow };
}
