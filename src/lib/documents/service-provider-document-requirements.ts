import type { OrgCapabilities } from "@/lib/organizations/org-capabilities";
import {
  getRegistrationDocumentSpecsByPhase,
  REGISTRATION_DOC_PHASE_LABELS,
  type RegistrationDocPhase,
} from "@/lib/documents/application-document-checklist";

export type ServiceProviderDocArea = "install" | "maintenance" | "om";

export type OperationalDocumentRequirement = {
  id: string;
  label: string;
  required: boolean;
  reason: string;
  context: string;
};

const MAINTENANCE_OPERATIONAL_DOCS: OperationalDocumentRequirement[] = [
  {
    id: "MAINTENANCE_CONTRACT",
    label: "Kontrata e mirëmbajtjes e nënshkruar",
    required: true,
    reason: "Duhet ngarkuar kur pranoni ftesën e kontratës nga personi përgjegjës.",
    context: "Kontratat e mirëmbajtjes",
  },
  {
    id: "INTERVENTION",
    label: "Foto / raport shtesë i ndërhyrjes",
    required: false,
    reason: "Opsionale - PDF, foto ose Word; regjistrimi bazohet në të dhënat e formularit.",
    context: "Ndërhyrjet & defektet",
  },
  {
    id: "MONTHLY_REPORT",
    label: "Shtojcë kontrolli periodik mujor (opsionale)",
    required: false,
    reason: "Formulari plotësohet në sistem; skedari është opsional.",
    context: "Kontrollet periodike",
  },
];

const OM_OPERATIONAL_DOCS: OperationalDocumentRequirement[] = [
  {
    id: "PERIODIC_INSPECTION_CONTRACT",
    label: "Kontrata e kontrollit periodik e nënshkruar",
    required: true,
    reason: "Duhet ngarkuar kur pranoni ftesën e kontratës së kontrollit periodik.",
    context: "Kontratat e kontrollit periodik",
  },
  {
    id: "PERIODIC_INSPECTION",
    label: "Raport i kontrollit periodik OM",
    required: true,
    reason: "Ngarkohet kur regjistroni kontrollin periodik për ashensorin.",
    context: "Kontrollet periodike",
  },
];

function registrationDocsForPhase(phase: RegistrationDocPhase) {
  return getRegistrationDocumentSpecsByPhase(phase, {
    registrationExtendedData: { elevatorConditionType: "NEW" },
  }).map((spec) => ({
    id: spec.purpose,
    label: spec.label,
    required: spec.required,
    reason: spec.reason,
    context: `Aplikime regjistrimi · ${REGISTRATION_DOC_PHASE_LABELS[phase]}`,
  }));
}

/** Udhëzues statik i dokumenteve sipas funksionit të kompanisë shërbimi. */
export function getServiceProviderDocumentRequirements(caps: OrgCapabilities): {
  area: ServiceProviderDocArea;
  title: string;
  items: OperationalDocumentRequirement[];
}[] {
  const sections: {
    area: ServiceProviderDocArea;
    title: string;
    items: OperationalDocumentRequirement[];
  }[] = [];

  if (caps.capInstall) {
    sections.push({
      area: "install",
      title: "Instalim",
      items: [
        ...registrationDocsForPhase("installer"),
        {
          id: "SUPPLEMENTARY_INSTALLER",
          label: "Dokumente shtesë (opsionale)",
          required: false,
          reason: "Material mbështetës që nuk është në listën e detyrueshme.",
          context: "Aplikime instalimi",
        },
      ],
    });
  }

  if (caps.capMaintenance) {
    sections.push({
      area: "maintenance",
      title: "Mirëmbajtje",
      items: MAINTENANCE_OPERATIONAL_DOCS,
    });
  }

  if (caps.capOm) {
    sections.push({
      area: "om",
      title: "OM / Certifikim",
      items: [
        ...registrationDocsForPhase("certifier"),
        ...OM_OPERATIONAL_DOCS,
        {
          id: "SUPPLEMENTARY_CERTIFIER",
          label: "Dokumente shtesë OM (opsionale)",
          required: false,
          reason: "Material mbështetës gjatë certifikimit ose inspektimit.",
          context: "Aplikime për certifikim",
        },
      ],
    });
  }

  return sections;
}

/** Shënim ligjor për ashensor të ri vs ekzistues (regjistrim). */
export const ELEVATOR_CONDITION_DOC_NOTE =
  "Për ashensor të ri (nga 01/01/2020) kërkohen deklaratat EU dhe lista e komponentëve; për ashensor ekzistues (para 31/12/2019) kërkohet raporti i ekzaminimit të parë nga OM.";
