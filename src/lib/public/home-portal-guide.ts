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

/** Rrjedha e plotë e regjistrimit fillestar (wizard + palët + IQMT). */
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
                  ? "Rishikim i dosjes, checklist dhe dërgim i aplikimit për rregjistrim te IQMT."
                  : s.label,
  })),
  {
    step: 7,
    actor: "IQMT - Kryeinspektor",
    title: "Delegim dhe caktim inspektorësh",
    description:
      "Merr aplikimin, cakton numrin e inspektorëve dhe e delegon te drejtori i drejtorisë.",
  },
  {
    step: 8,
    actor: "IQMT - Drejtor → Përgjegjës → Inspektor(ët)",
    title: "Shqyrtim hierarkik me raporte",
    description:
      "Zinxhiri: drejtor delegon te përgjegjësi, përgjegjësi cakton inspektorët, secili dorëzon raportin e vet.",
  },
  {
    step: 9,
    actor: "IQMT - Kryeinspektor",
    title: "Miratim final",
    description:
      "Pas raporteve të drejtorit, kryeinspektori miraton, refuzon ose kthen për korrigjim.",
  },
  {
    step: 10,
    actor: "Sistemi",
    title: "Certifikata & QR",
    description:
      "Gjenerimi i numrit të regjistrit, certifikatës CR (PDF), kodit QR dhe dosjes digjitale të ashensorit.",
  },
];

export const ISHMT_REVIEW_FLOW = [
  "Aplikim për rregjistrim nga personi përgjegjës",
  "Kryeinspektori delegon dhe cakton numrin e inspektorëve",
  "Drejtor i drejtorisë → përgjegjës sektori → inspektor(ët)",
  "Secili nivel dorëzon raportin e vet",
  "Kryeinspektori miraton → krijim ashensori, certifikatë dhe QR",
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
      "Kontratat e mirëmbajtjes dhe të kontrollit periodik, regjistrat e ndërhyrjeve, raportet mujore.",
  },
  {
    tab: "Kontrolle",
    description:
      "Historiku i kontrolleve fillestare, periodike dhe jashtëzakonshme; trupi OM, raportet, statusi kalues.",
  },
  {
    tab: "Historiku",
    description: "Timeline i ngjarjeve: status, pronësi, aplikime, kontrolle periodike, mirëmbajtje.",
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
      "Aplikim për rregjistrim te IQMT",
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
    summary: "Certifikon dhe menaxhon kontrollet periodike.",
    actions: [
      "Pranim/refuzim i ftesës",
      "Plotësim i certifikimit dhe konformitetit",
      "Kontratat e kontrollit periodik",
      "Ngarkim raportesh për kontrollet legacy (pa PDF historik)",
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
    code: ROLE_CODES.SECTOR_HEAD,
    label: ROLE_LABELS[ROLE_CODES.SECTOR_HEAD],
    portal: "Portali IQMT",
    summary: "Caktim inspektorësh dhe raport drejt drejtorit.",
    actions: [
      "Caktim inspektorësh për shqyrtim dosjeje",
      "Raport dhe dërgim te drejtori i drejtorisë",
      "Caktim inspektimi terreni",
      "Raportimet e qytetarëve",
    ],
  },
  {
    code: ROLE_CODES.CHIEF_INSPECTOR,
    label: ROLE_LABELS[ROLE_CODES.CHIEF_INSPECTOR],
    portal: "Portali IQMT - Kryeinspektor",
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
    portal: "Portali IQMT - Drejtor i Drejtorisë",
    summary: "Delegim dhe raport drejt kryeinspektorit.",
    actions: ["Delegim te përgjegjësi sektori", "Raport dhe dërgim te kryeinspektori", "Caktim inspektimesh terreni"],
  },
  {
    code: ROLE_CODES.FIELD_INSPECTOR,
    label: ROLE_LABELS[ROLE_CODES.FIELD_INSPECTOR],
    portal: "Portali IQMT - Terren",
    summary: "Verifikim fizik në objekt.",
    actions: ["Inspektime terreni të caktuara", "Regjistrim rezultati verifikimi"],
  },
  {
    code: ROLE_CODES.ADMIN,
    label: ROLE_LABELS[ROLE_CODES.ADMIN],
    portal: "Administrimi IQMT",
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
    text: "Çdo fazë tregon dokumentet e detyrueshme; aplikimi për regjistrim bllokohet nëse mungon diçka.",
  },
  {
    title: "Afatet ligjore",
    text: "Shfaqen afatet 10-ditore të shqyrtimit dhe detyrimet e mirëmbajtjes/kontrollit periodik për personin përgjegjës.",
  },
  {
    title: "Dosja digjitale",
    text: "Pas regjistrimit, çdo ashensor ka dosje me skeda, timeline dhe historik kontrollesh periodike.",
  },
  {
    title: "Regjistër legacy",
    text: "Të dhënat historike nga regjistri i mëparshëm u ngarkuan nga sistemi; kontrollet periodike dhe fillestare shfaqen pa përsëritje të panevojshme.",
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
