import { ApplicationType, DataUpdateType, DocumentClassification } from "@prisma/client";
import type { FieldChange } from "@/lib/services/elevator-lifecycle-service";

/** Workflow phase that is responsible for uploading the document. */
export type RegistrationDocPhase = "owner" | "installer" | "certifier";

export type ApplicationDocumentSpec = {
  purpose: string;
  label: string;
  classification: DocumentClassification;
  required: boolean;
  reason: string;
  accept: string;
  maxMb: number;
  /** Which registration phase/actor attaches this document. */
  phase: RegistrationDocPhase;
};

type ApplicationDataLike = {
  updateType?: DataUpdateType | null;
  deregistrationReasonType?: string | null;
  modernizationType?: string | null;
  specificPosition?: string | null;
  installationCertificateNumber?: string | null;
  installationCertificateDate?: Date | string | null;
  additionalTechnical?: unknown;
  registrationExtendedData?: unknown;
  correctionFields?: unknown;
  updateFields?: unknown;
};

const DEFAULT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx";

function objectValue(raw: unknown, key: string): unknown {
  if (!raw || typeof raw !== "object") return undefined;
  return (raw as Record<string, unknown>)[key];
}

function parseFieldChanges(raw: unknown): FieldChange[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is FieldChange =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as FieldChange).field === "string",
  );
}

export function commissioningOrInstallationDate(data?: ApplicationDataLike | null): Date | null {
  const ext = data?.registrationExtendedData as Record<string, unknown> | null;
  if (ext?.elevatorConditionType === "NEW") {
    const date = commissioningDateFromTechnical(data);
    if (date) return date;
  }
  if (ext?.elevatorConditionType === "EXISTING") return null;

  const raw =
    objectValue(data?.additionalTechnical, "commissioningDate") ??
    objectValue(data?.additionalTechnical, "installationDate") ??
    data?.installationCertificateDate;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

function commissioningDateFromTechnical(data?: ApplicationDataLike | null): Date | null {
  const ext = data?.registrationExtendedData as Record<string, unknown> | null;
  const raw =
    objectValue(ext, "elevatorInServiceDate") ??
    objectValue(data?.additionalTechnical, "commissioningDate") ??
    objectValue(data?.additionalTechnical, "installationDate") ??
    data?.installationCertificateDate;
  if (!raw) return null;
  const date = raw instanceof Date ? raw : new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Cut-off që ndan ashensorin "ekzistues" (para 31.12.2019) nga "i ri" (nga 01.01.2020). */
const NEW_ELEVATOR_CUTOFF = new Date("2020-01-01T00:00:00.000Z");

/** Ashensor i ri: instaluar/vënë në shërbim nga 01.01.2020 (kërkon deklaratë EU). */
export function requiresEuDeclaration(data?: ApplicationDataLike | null): boolean {
  const ext = data?.registrationExtendedData as Record<string, unknown> | null;
  if (ext?.elevatorConditionType === "NEW") return true;
  if (ext?.elevatorConditionType === "EXISTING") return false;

  const date = commissioningOrInstallationDate(data);
  if (!date) return false;
  return date >= NEW_ELEVATOR_CUTOFF;
}

/**
 * Ashensor "ekzistues" sipas VKM 1056: i instaluar dhe vënë në shërbim para 31.12.2019.
 */
export function isExistingElevator(data?: ApplicationDataLike | null): boolean {
  return !requiresEuDeclaration(data);
}

function spec(
  input: Omit<ApplicationDocumentSpec, "accept" | "maxMb" | "phase"> &
    Partial<Pick<ApplicationDocumentSpec, "accept" | "maxMb" | "phase">>,
): ApplicationDocumentSpec {
  return {
    accept: DEFAULT_ACCEPT,
    maxMb: 20,
    phase: "owner",
    ...input,
  };
}

function updateTargetsSerial(data?: ApplicationDataLike | null): boolean {
  if (data?.updateType === DataUpdateType.SERIAL_NUMBER_CHANGE) return true;
  return parseFieldChanges(data?.updateFields).some((c) => c.field === "serialNumber");
}

export function getApplicationDocumentSpecs(input: {
  type: ApplicationType;
  data?: ApplicationDataLike | null;
}): ApplicationDocumentSpec[] {
  const { type, data } = input;

  if (type === ApplicationType.NEW_REGISTRATION) {
    const isNew = requiresEuDeclaration(data);
    const isExisting = !isNew;
    return [
      spec({
        purpose: "LAYOUT_PLAN",
        label: "Planvendosje ose dokument pozicionimi në ndërtesë",
        classification: DocumentClassification.TECHNICAL,
        required: true,
        reason: "E detyrueshme për identifikimin e ashensorit në ndërtesë.",
        phase: "owner",
      }),
      spec({
        purpose: "EU_DECLARATION_CE",
        label: "Deklaratë EU e konformitetit (ashensori + komponentët e sigurisë)",
        classification: DocumentClassification.CERTIFICATE,
        required: isNew,
        reason: isNew
          ? "Udhëzim p.6.e.iv - e detyrueshme për ashensorët e instaluar/vënë në shërbim nga 01/01/2020."
          : "Kërkohet vetëm për ashensorët e rinj (nga 01/01/2020).",
        accept: ".pdf",
        maxMb: 10,
        phase: "installer",
      }),
      spec({
        purpose: "EU_DECLARATION_INSTALLER",
        label: "Deklaratë EU e instaluesit të ashensorit",
        classification: DocumentClassification.CERTIFICATE,
        required: isNew,
        reason: isNew
          ? "Udhëzim p.6.e.v - e detyrueshme për ashensorët e rinj."
          : "Kërkohet vetëm për ashensorët e rinj (nga 01/01/2020).",
        accept: ".pdf",
        maxMb: 10,
        phase: "installer",
      }),
      spec({
        purpose: "SAFETY_COMPONENTS_LIST",
        label: "Listë e komponentëve të sigurisë (lëshuar nga instaluesi)",
        classification: DocumentClassification.TECHNICAL,
        required: isNew,
        reason: isNew
          ? "Udhëzim p.6.e.vi - e detyrueshme për ashensorët e rinj."
          : "Kërkohet vetëm për ashensorët e rinj (nga 01/01/2020).",
        phase: "installer",
      }),
      spec({
        purpose: "INITIAL_INSPECTION_CERT",
        label: "Raport i Ekzaminimit të Parë të Plotë nga OM",
        classification: DocumentClassification.CERTIFICATE,
        required: isExisting,
        reason: isExisting
          ? "Udhëzim p.6.e.iii - i detyrueshëm për ashensorët ekzistues (para 31/12/2019), i lëshuar nga një OM i vlefshëm dhe kalues."
          : "Për ashensorët e rinj zëvendësohet nga deklarata EU e konformitetit (p.6.e.iv).",
        phase: "certifier",
      }),
    ];
  }

  if (type === ApplicationType.DEREGISTRATION) {
    return [
      spec({
        purpose: "DEREGISTRATION_REQUEST",
        label: "Kërkesë me shkrim për çregjistrim",
        classification: DocumentClassification.APPLICATION,
        required: true,
        reason: "Udhëzim p.9.c.i - kërkesa me shkrim ku argumentohet arsyeja.",
      }),
      spec({
        purpose: "DEREGISTRATION_PROOF",
        label: "Foto ose dokumentacion që provon gjendjen faktike",
        classification: DocumentClassification.TECHNICAL,
        required: true,
        reason: "Udhëzim p.9.c.ii - provë e çmontimit, zëvendësimit ose ndryshimit strukturor.",
      }),
      spec({
        purpose: "ORIGINAL_REGISTRATION_CERTIFICATE",
        label: "Certifikatë origjinale e regjistrimit ose kopje e njësuar me origjinalin",
        classification: DocumentClassification.CERTIFICATE,
        required: true,
        reason: "Udhëzim p.9.c.iii - certifikata origjinale ose kopje e vërtetuar.",
      }),
      spec({
        purpose: "DEREGISTRATION_TECHNICAL_REPORT",
        label: "Raport teknik shoqërues",
        classification: DocumentClassification.TECHNICAL,
        required: false,
        reason: "Rekomandohet kur arsyeja është zëvendësim ose ndryshim strukturor.",
      }),
    ];
  }

  if (type === ApplicationType.DATA_CORRECTION) {
    // p.13.a–c: kërkesa, vetëdeklarim dhe referenca certifikate mbulohen nga formulari
    // digjital, konfirmimi para parashtrimit dhe certifikata aktive në regjistër (PDF opsional).
    return [];
  }

  if (type === ApplicationType.DATA_UPDATE) {
    if (data?.updateType === DataUpdateType.CONTACT_UPDATE) {
      return [
        spec({
          purpose: "CONTACT_UPDATE_NOTE",
          label: "Dokument mbështetës për kontaktet",
          classification: DocumentClassification.APPLICATION,
          required: false,
          reason: "Opsionale - ndryshimet e kontaktit dokumentohen në audit trail.",
        }),
      ];
    }

    if (data?.updateType === DataUpdateType.MAINTENANCE_COMPANY_CHANGE) {
      return [
        spec({
          purpose: "MAINTENANCE_CONTRACT",
          label: "Kontratë mirëmbajtjeje",
          classification: DocumentClassification.APPLICATION,
          required: true,
          reason: "Ndryshimi i mirëmbajtësit duhet të provohet me kontratë aktive.",
        }),
      ];
    }

    if (data?.updateType === DataUpdateType.ADDRESS_CHANGE) {
      return [
        spec({
          purpose: "ADDRESS_CHANGE_OFFICIAL_NOTICE",
          label: "Njoftim zyrtar nga organet shtetërore për ndryshimin e adresës",
          classification: DocumentClassification.APPLICATION,
          required: true,
          reason: "Udhëzim p.16.b.i - njoftim publik ose shkresë specifike.",
        }),
        spec({
          purpose: "ADDRESS_CHANGE_PROOF",
          label: "Dokument që vërteton ndryshimin zyrtar të adresës",
          classification: DocumentClassification.APPLICATION,
          required: true,
          reason: "Udhëzim p.16.b.ii - dokument vërtetues i adresës së re.",
        }),
      ];
    }

    if (
      data?.updateType === DataUpdateType.SERIAL_NUMBER_CHANGE ||
      updateTargetsSerial(data)
    ) {
      return [
        spec({
          purpose: "SERIAL_CHANGE_OMI_NOTICE",
          label: "Njoftim zyrtar nga Organ i Miratuar për ndryshimin e serialit",
          classification: DocumentClassification.CERTIFICATE,
          required: true,
          reason: "Udhëzim p.16.a.i - njoftim zyrtar OM.",
        }),
        spec({
          purpose: "SERIAL_CHANGE_CONFORMITY",
          label: "Vlerësim konformiteti për ndërhyrjet e kryera",
          classification: DocumentClassification.CERTIFICATE,
          required: true,
          reason: "Udhëzim p.16.a.ii - vlerësim konformiteti pas ndërhyrjes.",
        }),
        spec({
          purpose: "ORIGINAL_REGISTRATION_CERTIFICATE",
          label: "Certifikatë origjinale ose kopje e njësuar me origjinalin",
          classification: DocumentClassification.CERTIFICATE,
          required: true,
          reason: "Certifikata ekzistuese për referencë dhe shfuqizim.",
        }),
      ];
    }

    if (data?.updateType === DataUpdateType.RESPONSIBLE_ENTITY_CHANGE) {
      return [
        spec({
          purpose: "RESPONSIBLE_ENTITY_CHANGE_REQUEST",
          label: "Kërkesë për kalimin e përgjegjësisë",
          classification: DocumentClassification.APPLICATION,
          required: true,
          reason: "Udhëzim p.16.c.i - kërkesë nga personi përgjegjës aktual.",
        }),
        spec({
          purpose: "RESPONSIBLE_ENTITY_CHANGE_ACT",
          label: "Akti i kalimit të përgjegjësisë",
          classification: DocumentClassification.APPLICATION,
          required: true,
          reason: "Udhëzim p.16.c.ii - akt kontraktual ose administrativ.",
        }),
        spec({
          purpose: "RESPONSIBLE_ENTITY_CHANGE_SUPPLEMENT",
          label: "Dokumentacion plotësues (sipas kërkesës së IQMT)",
          classification: DocumentClassification.APPLICATION,
          required: false,
          reason: "Udhëzim p.16.c.iii - kur IQMT kërkon dokumentacion shtesë.",
        }),
        spec({
          purpose: "ORIGINAL_REGISTRATION_CERTIFICATE",
          label: "Certifikatë origjinale ose kopje e njësuar me origjinalin",
          classification: DocumentClassification.CERTIFICATE,
          required: true,
          reason: "Certifikata ekzistuese për referencë.",
        }),
      ];
    }

    if (data?.updateType === DataUpdateType.OWNERSHIP_TRANSFER) {
      return [];
    }

    return [
      spec({
        purpose: "DATA_UPDATE_REQUEST",
        label: "Kërkesë për përditësim të të dhënave",
        classification: DocumentClassification.APPLICATION,
        required: true,
        reason: "Udhëzim p.15.e - kërkesë zyrtare nga personi përgjegjës.",
      }),
      spec({
        purpose: "ORIGINAL_REGISTRATION_CERTIFICATE",
        label: "Certifikatë origjinale ose kopje e njësuar me origjinalin",
        classification: DocumentClassification.CERTIFICATE,
        required: true,
        reason: "Certifikata ekzistuese për referencë dhe shfuqizim pas përditësimit.",
      }),
    ];
  }

  if (type === ApplicationType.MODERNIZATION) {
    return [
      spec({
        purpose: "MODERNIZATION_TECHNICAL_DOSSIER",
        label: "Dokumentacion teknik i modernizimit",
        classification: DocumentClassification.TECHNICAL,
        required: true,
        reason: "Modernizimi ndryshon karakteristikat teknike dhe duhet dokumentuar (Udhëzim p.15.c.iv).",
      }),
      spec({
        purpose: "MODERNIZATION_OMI_REPORT",
        label: "Raport OM pas modernizimit",
        classification: DocumentClassification.CERTIFICATE,
        required: true,
        reason: "Kërkohet verifikim pas ndërhyrjes teknike.",
      }),
      spec({
        purpose: "ORIGINAL_REGISTRATION_CERTIFICATE",
        label: "Certifikatë origjinale ose kopje e njësuar me origjinalin",
        classification: DocumentClassification.CERTIFICATE,
        required: true,
        reason: "Certifikata ekzistuese shfuqizohet pas modernizimit.",
      }),
    ];
  }

  return [];
}

/** Checklist për një fazë - vetëm dokumentet që janë ngarkuar (pamje read-only). */
export function getUploadedDocumentsChecklistForPhase(input: {
  phase: RegistrationDocPhase;
  type: ApplicationType;
  data?: ApplicationDataLike | null;
  uploadedPurposes: string[];
}) {
  const uploaded = new Set(input.uploadedPurposes);
  return getApplicationDocumentSpecs(input)
    .filter((item) => item.phase === input.phase && uploaded.has(item.purpose))
    .map((item) => ({ ...item, uploaded: true }));
}

export function getRegistrationDocumentSpecsByPhase(
  phase: RegistrationDocPhase,
  data?: ApplicationDataLike | null,
): ApplicationDocumentSpec[] {
  return getApplicationDocumentSpecs({ type: ApplicationType.NEW_REGISTRATION, data }).filter(
    (item) => item.phase === phase,
  );
}

export function getMissingRequiredApplicationDocuments(input: {
  type: ApplicationType;
  data?: ApplicationDataLike | null;
  uploadedPurposes: string[];
}) {
  const uploaded = new Set(input.uploadedPurposes);
  return getApplicationDocumentSpecs(input).filter((item) => item.required && !uploaded.has(item.purpose));
}

/** Dokumentet e detyrueshme që mungojnë, vetëm për fazat e specifikuara (owner / installer / certifier). */
export function getMissingRequiredApplicationDocumentsForPhases(input: {
  type: ApplicationType;
  data?: ApplicationDataLike | null;
  uploadedPurposes: string[];
  phases: RegistrationDocPhase[];
}) {
  const phaseSet = new Set(input.phases);
  return getMissingRequiredApplicationDocuments(input).filter((item) => phaseSet.has(item.phase));
}

/** Të gjitha dokumentet e një faze - të detyrueshmet dhe opsionale (si te personi përgjegjës). */
export function getPhaseDocumentChecklist(input: {
  phase: RegistrationDocPhase;
  type: ApplicationType;
  data?: ApplicationDataLike | null;
}): ApplicationDocumentSpec[] {
  return getApplicationDocumentSpecs(input).filter((item) => item.phase === input.phase);
}

export const REGISTRATION_DOC_PHASE_LABELS: Record<RegistrationDocPhase, string> = {
  owner: "Personi përgjegjës i ashensorit",
  installer: "Instaluesi",
  certifier: "Certifikuesi / OM",
};

/** Fazat e dokumenteve që certifikuesi duhet të verifikojë para përfundimit të certifikimit. */
export const CERTIFIER_COMPLETION_DOC_PHASES: RegistrationDocPhase[] = ["installer", "certifier"];

export const SUPPLEMENTARY_PURPOSE_PREFIX = "SUPPLEMENTARY_";

export function supplementaryDocumentPurpose(phase: RegistrationDocPhase): string {
  return `${SUPPLEMENTARY_PURPOSE_PREFIX}${phase.toUpperCase()}`;
}

export function isSupplementaryDocumentPurpose(purpose?: string | null): boolean {
  return Boolean(purpose?.startsWith(SUPPLEMENTARY_PURPOSE_PREFIX));
}

export function supplementaryPhaseFromPurpose(purpose: string): RegistrationDocPhase | null {
  if (!isSupplementaryDocumentPurpose(purpose)) return null;
  const phase = purpose.slice(SUPPLEMENTARY_PURPOSE_PREFIX.length).toLowerCase();
  if (phase === "owner" || phase === "installer" || phase === "certifier") return phase;
  return null;
}

export const SUPPLEMENTARY_PHASE_LABELS: Record<RegistrationDocPhase, string> = {
  owner: "Personi përgjegjës",
  installer: "Instaluesi",
  certifier: "Certifikuesi (OM)",
};

export function filterSupplementaryDocuments<T extends { purpose?: string }>(
  documents: T[],
  phase: RegistrationDocPhase,
): T[] {
  const purpose = supplementaryDocumentPurpose(phase);
  return documents.filter((doc) => doc.purpose === purpose);
}

export function hasSupplementaryDocuments(
  documents: { purpose?: string }[],
  phase: RegistrationDocPhase,
): boolean {
  return filterSupplementaryDocuments(documents, phase).length > 0;
}

/** Dokumentet që shfaqen në checklist dhe selector - vetëm të detyrueshmet ose të ngarkuara tashmë. */
export function getVisibleApplicationDocumentSpecs(input: {
  type: ApplicationType;
  data?: ApplicationDataLike | null;
  uploadedPurposes?: string[];
}): ApplicationDocumentSpec[] {
  const uploaded = new Set(input.uploadedPurposes ?? []);
  return getApplicationDocumentSpecs(input).filter((item) => item.required || uploaded.has(item.purpose));
}
