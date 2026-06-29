import { APPLICATION_TYPE_GUIDE } from "@/lib/constants/application-type-guide";
import { OWNER_REGISTRATION_STEPS } from "@/lib/registration/phase-router";
import { ROLE_LABELS } from "@/lib/constants/role-labels";
import { ROLE_CODES } from "@/lib/constants/roles";

export type GuideStep = {
  step: number;
  actor: string;
  title: string;
  description: string;
};

/** Rrjedha e plotë e regjistrimit fillestar (wizard + palët + ISHMT). */
export const NEW_REGISTRATION_FULL_FLOW: GuideStep[] = [
  ...OWNER_REGISTRATION_STEPS.map((s) => ({
    step: s.step,
    actor:
      s.delegateRole === "INSTALLER"
        ? "Instaluesi (pas ftesës)"
        : s.delegateRole === "CERTIFIER"
          ? "Certifikuesi / OM (pas ftesës)"
          : "Personi përgjegjës",
    title: s.label,
    description:
      s.id === "basic-data"
        ? "Formulari Aneksi 1, vendndodhja, dokumentet e detyrueshme. Bashkia zgjidhet manualisht; kodi i distriktit llogaritet automatikisht."
        : s.id === "select-installer"
          ? "Zgjedhja e kompanisë instaluese të licencuar; ftesë delegimi."
          : s.id === "technical-data"
            ? "Të dhënat teknike, planvendosja, dokumentacioni i instaluesit dhe caktimi i certifikuesit."
            : s.id === "select-certifier"
              ? "Zgjedhja e trupit certifikues / OM; ftesë delegimi."
              : s.id === "certification-data"
                ? "Certifikimi, numri OM, ekzaminimi, konformiteti dhe dokumentet e certifikuesit."
                : s.id === "final-review"
                  ? "Rishikim i dosjes, checklist parashtrimi dhe dërgim te ISHMT."
                  : s.label,
  })),
  {
    step: 7,
    actor: "ISHMT - Specialist sektori",
    title: "Shqyrtim administrativ",
    description:
      "Marrja e aplikimit në shqyrtim, verifikimi i dokumenteve dhe dërgesa te kryeinspektori ose kthim për korrigjim.",
  },
  {
    step: 8,
    actor: "ISHMT - Kryeinspektor",
    title: "Miratim final",
    description:
      "Miratim, refuzim ose kthim te personi përgjegjës, instaluesi ose certifikuesi. Pas miratimit krijohet ashensori në regjistër.",
  },
  {
    step: 9,
    actor: "Sistemi",
    title: "Certifikata & QR",
    description:
      "Gjenerimi i numrit të regjistrit, certifikatës CR (PDF), kodit QR dhe dosjes digjitale të ashensorit.",
  },
];

export const ISHMT_REVIEW_FLOW = [
  "Parashtrimi nga personi përgjegjës",
  "Marrja në shqyrtim nga specialisti i sektorit",
  "Verifikim i plotësisë së dosjes dhe afatit 10-ditor",
  "Dërgesa te kryeinspektori për vendim final",
  "Miratim → krijim ashensori, certifikatë dhe QR",
  "Refuzim ose kthim për korrigjim te roli i caktuar",
] as const;

export const ELEVATOR_DOSSIER_GUIDE = [
  {
    tab: "Përmbledhje",
    description:
      "Numri i regjistrit, statusi, përputhshmëria, palët (pronar, instalues, OM, mirëmbajtje) dhe përmbledhje e aplikimit fillestar.",
  },
  {
    tab: "Të dhënat teknike",
    description: "Specifikimet e ashensorit, versionet historike të të dhënave teknike.",
  },
  {
    tab: "Certifikata",
    description: "Certifikatat CR/CA, datat e lëshimit dhe skadimit, shkarkimi i PDF.",
  },
  {
    tab: "Kodi QR",
    description:
      "Kodi QR publik, URL për qytetarët, ngarkimi i fotos së vendosjes fizike të etiketës.",
  },
  {
    tab: "Dokumente",
    description: "Dosja digjitale: planvendosje, certifikata, raporte dhe dokumente të ngarkuara.",
  },
  {
    tab: "Mirëmbajtje",
    description:
      "Kontratat e mirëmbajtjes dhe inspektimit periodik, regjistrat e ndërhyrjeve, raportet mujore.",
  },
  {
    tab: "Inspektime",
    description:
      "Historiku i inspektimeve fillestare, periodike dhe jashtëzakonshme; trupi OM, raportet, statusi kalues.",
  },
  {
    tab: "Historiku",
    description: "Timeline i ngjarjeve: status, pronësi, aplikime, inspektime, mirëmbajtje.",
  },
  {
    tab: "Aplikime",
    description:
      "Aplikimet e lidhura (regjistrim fillestar, ndryshime, modernizime) dhe gjendja e tyre.",
  },
] as const;

export const ROLE_PLAYBOOK = [
  {
    code: ROLE_CODES.OWNER,
    label: ROLE_LABELS[ROLE_CODES.OWNER],
    portal: "Portali i personit përgjegjës",
    summary: "Krijon dhe menaxhon ashensorët e regjistruar.",
    actions: [
      "Regjistrim i ri (wizard 6 hapa)",
      "Ndryshim, përditësim, çregjistrim, modernizim, transferim pronësie",
      "Caktim instaluesi, certifikuesit dhe kompanisë së mirëmbajtjes",
      "Dosja e ashensorit, afatet, certifikatat, QR",
      "Parashtrimi final te ISHMT",
    ],
  },
  {
    code: ROLE_CODES.INSTALLER,
    label: ROLE_LABELS[ROLE_CODES.INSTALLER],
    portal: "Portali i instaluesit",
    summary: "Plotëson pjesën teknike pas ftesës së personit përgjegjës.",
    actions: [
      "Pranim/refuzim i ftesës së delegimit",
      "Të dhëna teknike dhe dokumentacion instalimi",
      "Caktim i certifikuesit (në regjistrim fillestar)",
      "Modernizime ku është palë instaluese",
    ],
  },
  {
    code: ROLE_CODES.CERTIFIER,
    label: ROLE_LABELS[ROLE_CODES.CERTIFIER],
    portal: "Portali i certifikuesit / OM",
    summary: "Certifikon dhe menaxhon inspektimet periodike.",
    actions: [
      "Pranim/refuzim i ftesës",
      "Plotësim i certifikimit dhe konformitetit",
      "Kontrata inspektimi periodik",
      "Ngarkim raportesh për periodiket legacy (pa PDF historik)",
    ],
  },
  {
    code: ROLE_CODES.MAINTENANCE,
    label: ROLE_LABELS[ROLE_CODES.MAINTENANCE],
    portal: "Portali i mirëmbajtjes",
    summary: "Regjistron ndërhyrjet dhe raportet e shërbimit.",
    actions: [
      "Pranim kontratash mirëmbajtjeje",
      "Regjistrim ndërhyrjesh dhe raporte mujore",
      "Ndjekje detyrimesh për ashensorët e caktuar",
    ],
  },
  {
    code: ROLE_CODES.SECTOR_SPECIALIST,
    label: ROLE_LABELS[ROLE_CODES.SECTOR_SPECIALIST],
    portal: "Portali ISHMT",
    summary: "Shqyrtim administrativ i aplikimeve.",
    actions: [
      "Marrja e aplikimeve në shqyrtim",
      "Verifikim dosjeje dhe dokumentesh",
      "Dërgesë te kryeinspektori ose kthim për korrigjim",
      "Kërkesë verifikimi fizik në terren (kur nevojitet)",
    ],
  },
  {
    code: ROLE_CODES.SECTOR_HEAD,
    label: ROLE_LABELS[ROLE_CODES.SECTOR_HEAD],
    portal: "Portali ISHMT",
    summary: "Mbikëqyrje e sektorit dhe shqyrtime.",
    actions: [
      "Shqyrtim aplikimesh",
      "Caktim inspektori terreni",
      "Raportimet e qytetarëve",
    ],
  },
  {
    code: ROLE_CODES.CHIEF_INSPECTOR,
    label: ROLE_LABELS[ROLE_CODES.CHIEF_INSPECTOR],
    portal: "Portali ISHMT - Kryeinspektor",
    summary: "Vendimi final për regjistrimin dhe aplikimet.",
    actions: [
      "Miratim / refuzim / kthim aplikimesh",
      "Harta dhe dashboard i regjistrit",
      "Nënshkrimi në certifikatën CR (PDF)",
    ],
  },
  {
    code: ROLE_CODES.ISHMT_DIRECTOR,
    label: ROLE_LABELS[ROLE_CODES.ISHMT_DIRECTOR],
    portal: "Portali ISHMT - Drejtor Teknik",
    summary: "Mbikëqyrje operacionale.",
    actions: ["Miratime, caktim inspektimesh terreni, dashboard"],
  },
  {
    code: ROLE_CODES.FIELD_INSPECTOR,
    label: ROLE_LABELS[ROLE_CODES.FIELD_INSPECTOR],
    portal: "Portali ISHMT - Terren",
    summary: "Verifikim fizik në objekt.",
    actions: ["Inspektime terreni të caktuara", "Regjistrim rezultati verifikimi"],
  },
  {
    code: ROLE_CODES.ADMIN,
    label: ROLE_LABELS[ROLE_CODES.ADMIN],
    portal: "Administrimi ISHMT",
    summary: "Menaxhim i sistemit.",
    actions: ["Përdorues, role, audit, konfigurime"],
  },
  {
    code: ROLE_CODES.DIRECTORATE,
    label: ROLE_LABELS[ROLE_CODES.DIRECTORATE],
    portal: "Drejtoria e Politikave",
    summary: "Licencim kompanish.",
    actions: [
      "Regjistrim dhe validim kompanish instaluese/certifikuese/mirëmbajtëse",
      "Statistika dhe aktivitet i licencave",
    ],
  },
  {
    code: ROLE_CODES.PUBLIC,
    label: "Qytetar (pa llogari)",
    portal: "Faqe publike",
    summary: "Verifikim dhe raportim pa identifikim.",
    actions: [
      "Skanim QR → status publik i ashensorit",
      "Raportim problemi sigurie",
      "Raportim ashensori pa QR ose të paregjistruar",
    ],
  },
] as const;

export const LIFECYCLE_APPLICATIONS = (
  [
    "NEW_REGISTRATION",
    "DATA_CORRECTION",
    "DATA_UPDATE",
    "OWNERSHIP_TRANSFER",
    "DEREGISTRATION",
    "MODERNIZATION",
  ] as const
).map((key) => {
  const guide = APPLICATION_TYPE_GUIDE[key];
  return {
    key,
    title: guide.title,
    tagline: guide.tagline,
    steps: guide.steps,
    outcome: guide.outcome,
    approvers: guide.approvers,
  };
});

export const UX_HIGHLIGHTS = [
  {
    title: "Wizard me hapa",
    text: "Regjistrimi fillestar udhëheq personin përgjegjës në 6 hapa me progres të dukshëm dhe ruajtje draft.",
  },
  {
    title: "Delegim i palëve",
    text: "Instaluesi dhe certifikuesi marrin ftesë, pranojnë dhe plotësojnë vetëm pjesën e tyre - pa hyrë në të dhënat e palës tjetër.",
  },
  {
    title: "Checklist dokumentesh",
    text: "Çdo fazë tregon dokumentet e detyrueshme; parashtrimi bllokohet nëse mungon diçka.",
  },
  {
    title: "Afatet ligjore",
    text: "Shfaqen afatet 10-ditore të shqyrtimit dhe detyrimet e mirëmbajtjes/inspektimit për personin përgjegjës.",
  },
  {
    title: "Dosja digjitale",
    text: "Pas regjistrimit, çdo ashensor ka dosje me skeda, timeline dhe historik inspektimesh.",
  },
  {
    title: "Regjistër legacy",
    text: "Të dhënat historike nga regjistri i mëparshëm u ngarkuan nga sistemi; periodiket dhe inspektimet fillestare shfaqen pa përsëritje të panevojshme.",
  },
  {
    title: "Transparencë publike",
    text: "Qytetarët verifikojnë statusin me QR; të dhënat sensitive të pronarit nuk shfaqen publikisht.",
  },
  {
    title: "Njoftime",
    text: "Përdoruesit njoftohen për ftesa delegimi, kthime për korrigjim, miratime dhe detyrime.",
  },
] as const;
