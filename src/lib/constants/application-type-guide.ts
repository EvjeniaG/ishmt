import { ApplicationType, DataUpdateType } from "@prisma/client";

export type ApplicationGuideKey =
  | ApplicationType
  | "OWNERSHIP_TRANSFER";

export type ApplicationGuideEntry = {
  title: string;
  shortTitle: string;
  tagline: string;
  whenToUse: string;
  whenNotToUse?: string;
  steps: string[];
  approvers: string;
  outcome: string;
  legalRef?: string;
};

export const APPLICATION_TYPE_GUIDE: Record<ApplicationGuideKey, ApplicationGuideEntry> = {
  NEW_REGISTRATION: {
    title: "Regjistrim i ri ashensori",
    shortTitle: "Regjistrim i ri",
    tagline: "Për ashensor që regjistrohet për herë të parë pranë ISHMT-së.",
    whenToUse:
      "Kur instalohet ashensor i ri ose kryhet ekzaminimi i parë i plotë në ashensor ekzistues. Certifikata CR lëshohet pas miratimit.",
    whenNotToUse: "Për ashensorë tashmë të regjistruar - përdorni Ndryshim, Përditësim ose Çregjistrim.",
    steps: [
      "Plotësoni formularin e regjistrimit (Aneksi 1) dhe ngarkoni dokumentet",
      "Zgjidhni instaluesin - ai plotëson të dhënat teknike",
      "Zgjidhni certifikuesin OMI - ai plotëson certifikimin",
      "Parashtroni te ISHMT - shqyrtim brenda 10 ditëve pune",
      "Pas miratimit: regjistrim në regjistrin CR dhe certifikatë e re",
    ],
    approvers: "Instalues · Certifikues · ISHMT",
    outcome: "Ashensor i ri me numër regjistri dhe certifikatë CR.",
    legalRef: "Udhëzim ISHMT p.6",
  },
  DATA_CORRECTION: {
    title: "Ndryshim të dhënash",
    shortTitle: "Ndryshim",
    tagline: "Korrigjim i gabimeve teknik, përshkrues ose shkrimor në regjistër/certifikatë.",
    whenToUse:
      "Kur konstatohet gabim (emër, datë, serial i shkruar gabim, numër protokolli, etj.) që nuk pasqyrojnë situatën reale. Kërkon arsye për çdo fushë.",
    whenNotToUse:
      "Jo për ndryshime faktike/juridike pas regjistrimit - ato bëhen me Përditësim. Jo për kalim pronësie.",
    steps: [
      "Zgjidhni ashensorin",
      "Specifikoni fushat e gabuara, vlerat e sakta dhe arsyen e korrigjimit",
      "Konfirmoni dhe parashtroni te ISHMT (formular digjital)",
      "Pas miratimit: certifikata e vjetër shfuqizohet, lëshohet CR e re nëse ndikon",
    ],
    approvers: "ISHMT",
    outcome: "Korrigjim i të dhënave të gabuara; certifikatë e re CR nëse ndikon.",
    legalRef: "Udhëzim ISHMT p.10–14",
  },
  DATA_UPDATE: {
    title: "Përditësim të dhënash",
    shortTitle: "Përditësim",
    tagline: "Modifikim i të dhënave për shkak të ndryshimeve faktike, juridike ose teknike.",
    whenToUse:
      "Kur ndryshon adresa (nga organet kompetente), numri serial (pas OMI), personi përgjegjës, mirëmbajtja ose kontaktet.",
    whenNotToUse: "Jo për gabime shkrimore - përdorni Ndryshim. Jo për kalim pronësie - përdorni Transferim pronësie.",
    steps: [
      "Zgjidhni ashensorin dhe llojin e përditësimit",
      "Plotësoni fushat e lejuara me arsye",
      "Ngarkoni dokumentacionin sipas llojit",
      "Parashtroni te ISHMT - afat 10 ditë pune",
      "Pas miratimit: certifikatë e re CR, e vjetra shfuqizohet",
    ],
    approvers: "ISHMT",
    outcome: "Përditësim i të dhënave legjitime; certifikatë e re CR.",
    legalRef: "Udhëzim ISHMT p.15–17",
  },
  OWNERSHIP_TRANSFER: {
    title: "Transferim pronësie",
    shortTitle: "Transferim pronësie",
    tagline: "Kalim i përgjegjësisë për shkak të ndryshimit të pronësisë së objektit.",
    whenToUse:
      "Kur pronësia e objektit ku është instaluar ashensori kalon te subjekt tjetër. Marrësi duhet ta pranojë ftesën.",
    whenNotToUse: "Jo për ndryshim adrese, serial ose mirëmbajtje - ato bëhen me Përditësim.",
    steps: [
      "Zgjidhni ashensorin",
      "Shkruani NIPT/NID e marrësit dhe arsyen - dërgohet ftesë",
      "Marrësi pranon ose refuzon në portal",
      "Parashtroni te ISHMT me aktin e kalimit",
      "ISHMT miraton - përgjegjësia kalon te marrësi",
    ],
    approvers: "Marrësi · ISHMT",
    outcome: "Kartela kalon te subjekti i ri përgjegjës.",
    legalRef: "Udhëzim ISHMT p.15.c–16.c",
  },
  DEREGISTRATION: {
    title: "Çregjistrim ashensori",
    shortTitle: "Çregjistrim",
    tagline: "Heqje përfundimisht e ashensorit nga regjistri aktiv.",
    whenToUse:
      "Kur ashensori çmontohet, zëvendësohet me të ri në të njëjtin objekt, ose ndryshimet strukturore e bëjnë të papërdorshëm.",
    whenNotToUse: "Jo për modernizim ose përditësim të dhënash.",
    steps: [
      "Zgjidhni ashensorin dhe arsyen e çregjistrimit",
      "Ngarkoni kërkesën, provën faktike dhe certifikatën origjinale",
      "Parashtroni te ISHMT - afat 10 ditë pune",
      "Pas miratimit: certifikata shfuqizohet, rreshti shënohet ÇREGJISTRUAR",
    ],
    approvers: "ISHMT",
    outcome: "Ashensori hiqet nga regjistri aktiv; certifikata nuk prodhon efekte juridike.",
    legalRef: "Udhëzim ISHMT p.9",
  },
  MODERNIZATION: {
    title: "Modernizim ashensori",
    shortTitle: "Modernizim",
    tagline: "Ndryshime thelbësore teknike sipas VKM 1056 p.6.",
    whenToUse:
      "Kur modernizohet/modifikohet ashensori dhe kërkohet dokumentim i ri nga instaluesi dhe certifikuesi.",
    whenNotToUse: "Jo për ndryshime kontakti ose adrese - përdorni Përditësim.",
    steps: [
      "Zgjidhni ashensorin dhe llojin e modernizimit",
      "Caktoni instaluesin dhe certifikuesin",
      "Parashtroni te ISHMT",
      "Pas miratimit: version i ri teknik + certifikatë CR e re",
    ],
    approvers: "Instalues · Certifikues · ISHMT",
    outcome: "Version i ri teknik me certifikatë CR të përditësuar.",
    legalRef: "Udhëzim ISHMT p.15.c.iv",
  },
};

export const DATA_UPDATE_SUBTYPE_LABELS: Record<
  Exclude<DataUpdateType, "RESPONSIBLE_ENTITY_CHANGE" | "OWNERSHIP_TRANSFER">,
  string
> = {
  SERIAL_NUMBER_CHANGE: "Ndryshim numri serial (pas OMI)",
  MAINTENANCE_COMPANY_CHANGE: "Ndryshim kompanie mirëmbajtjeje",
  ADDRESS_CHANGE: "Ndryshim adrese",
  CONTACT_UPDATE: "Përditësim kontakti",
};

export function getApplicationGuideKey(input: {
  type: ApplicationType;
  updateType?: DataUpdateType | string | null;
}): ApplicationGuideKey {
  if (input.type === ApplicationType.DATA_UPDATE && input.updateType === DataUpdateType.OWNERSHIP_TRANSFER) {
    return "OWNERSHIP_TRANSFER";
  }
  return input.type;
}

export function getApplicationDisplayLabel(input: {
  type: ApplicationType;
  updateType?: DataUpdateType | string | null;
}): string {
  return APPLICATION_TYPE_GUIDE[getApplicationGuideKey(input)].title;
}
