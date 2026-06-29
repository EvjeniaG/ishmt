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
  const raw =
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
        purpose: "REGISTRATION_REQUEST",
        label: "Kërkesë/Formular regjistrimi i nënshkruar (Aneksi 1)",
        classification: DocumentClassification.APPLICATION,
        required: false,
        reason: "Opsionale kur formulari plotësohet drejtpërdrejt në sistem; mund të shkarkohet i parambushur.",
        phase: "owner",
      }),
      spec({
        purpose: "LAYOUT_PLAN",
        label: "Planvendosje ose dokument pozicionimi në ndërtesë",
        classification: DocumentClassification.TECHNICAL,
        required: true,
        reason: "Identifikon ashensorin në ndërtesë, sidomos kur ka më shumë se një ashensor.",
        phase: "owner",
      }),
      spec({
        purpose: "TECHNICAL_DOSSIER",
        label: "Dokumentacion teknik i ashensorit",
        classification: DocumentClassification.TECHNICAL,
        required: true,
        reason: "Kërkohet për verifikimin teknik të të dhënave të formularit.",
        phase: "installer",
      }),
      spec({
        purpose: "INSTALLATION_DOCUMENT",
        label: "Dokument instalimi / dokument prodhuesi",
        classification: DocumentClassification.TECHNICAL,
        required: true,
        reason: "Provon instalimin dhe identifikimin teknik të ashensorit.",
        phase: "installer",
      }),
      spec({
        purpose: "EU_DECLARATION_CE",
        label: "Deklaratë EU e konformitetit (ashensori + komponentët e sigurisë)",
        classification: DocumentClassification.CERTIFICATE,
        required: isNew,
        reason: isNew
          ? "E detyrueshme për ashensorët e instaluar/vënë në shërbim nga 01/01/2020 (Udhëzim p.6.e)."
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
          ? "E detyrueshme për ashensorët e rinj sipas pikës 6.e të Udhëzimit."
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
          ? "E detyrueshme për ashensorët e rinj sipas pikës 6.e të Udhëzimit."
          : "Kërkohet vetëm për ashensorët e rinj (nga 01/01/2020).",
        phase: "installer",
      }),
      spec({
        purpose: "INITIAL_INSPECTION_CERT",
        label: "Raport i Ekzaminimit të Parë të Plotë nga OMI",
        classification: DocumentClassification.CERTIFICATE,
        required: isExisting,
        reason: isExisting
          ? "I detyrueshëm për ashensorët ekzistues (para 31/12/2019), i lëshuar nga një OMI i vlefshëm dhe kalues."
          : "Për ashensorët e rinj zëvendësohet nga deklarata EU e konformitetit.",
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
          reason: "Udhëzim p.16.a.i - njoftim zyrtar OMI.",
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
          purpose: "ORIGINAL_REGISTRATION_CERTIFICATE",
          label: "Certifikatë origjinale ose kopje e njësuar me origjinalin",
          classification: DocumentClassification.CERTIFICATE,
          required: true,
          reason: "Certifikata ekzistuese për referencë.",
        }),
      ];
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
        label: "Raport OMI pas modernizimit",
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

/** Fazat e dokumenteve që certifikuesi duhet të verifikojë para përfundimit të certifikimit. */
export const CERTIFIER_COMPLETION_DOC_PHASES: RegistrationDocPhase[] = ["installer", "certifier"];

/** Dokumentet që shfaqen në checklist dhe selector - vetëm të detyrueshmet ose të ngarkuara tashmë. */
export function getVisibleApplicationDocumentSpecs(input: {
  type: ApplicationType;
  data?: ApplicationDataLike | null;
  uploadedPurposes?: string[];
}): ApplicationDocumentSpec[] {
  const uploaded = new Set(input.uploadedPurposes ?? []);
  return getApplicationDocumentSpecs(input).filter((item) => item.required || uploaded.has(item.purpose));
}
