export const ELEVATOR_CONDITION_LABELS = {
  NEW: "I RI",
  EXISTING: "EKZISTUES",
} as const;

export const APPLICATION_SUBTYPE_LABELS = {
  FIRST: "Aplikim i parë",
  ADDITIONAL: "Aplikim për regjistrimin e një ashensori shtesë",
} as const;

export const RESPONSIBLE_ENTITY_TYPE_LABELS = {
  ADMINISTRATOR: "Administrator Pallati",
  OWNERS_ASSEMBLY: "Asamble e bashkëpronarëve",
  PHYSICAL_PERSON: "Person Fizik",
  LEGAL_PERSON: "Person Juridik",
  CONSTRUCTOR: "Ndërtues",
  CONSTRUCTION_COMPANY: "Kompani Ndërtimi",
} as const;

export const IDENTIFIER_TYPE_LABELS = {
  NID: "NID",
  NIPT: "NIPT",
} as const;

export const REGISTRATION_BUILDING_TYPE_LABELS = {
  VEND_PUNE_QENDER_TREGTARE: "Vend pune / Qendër tregtare",
  NDERTESA_NE_BASHKEPRONESI: "Ndërtesë në bashkëpronësi",
  MJEDISE_SHTEPIAKE: "Mjedis shtëpiak",
  NDERTESE_PUBLIKE: "Ndërtesë publike",
} as const;

export const REGISTRATION_USAGE_PURPOSE_LABELS = {
  TRANSPORT_NJEREZISH_ELEKTRIK: "Transport njerëzish - elektrik",
  TRANSPORT_NJEREZISH_HIDRAULIK: "Transport njerëzish - hidraulik",
  TRANSPORT_NJEREZISH_DHE_MALLRASH: "Transport njerëzish dhe mallrash",
  TRANSPORT_NJEREZISH_DHE_SHTRATI: "Transport njerëzish dhe shtrati",
  TRANSPORT_NJEREZISH_DHE_PAJISJE_MOTORIKE: "Transport njerëzish dhe pajisje motorike",
  TJETER: "Tjetër",
} as const;

export const ELEVATOR_DRIVE_TYPE_LABELS = {
  ME_KAVO_TERHEQESE_KONVENCIONALE: "Me kavo tërheqëse konvencionale",
  ME_KAVO_PA_KABINE: "Me kavo pa kabinë",
  HIDRAULIK: "Hidraulik",
  HIDRAULIK_PA_KABINE: "Hidraulik pa kabinë",
  PERSONA_ME_AFTESI_TE_KUFIZUAR: "Persona me aftësi të kufizuara",
  TJETER: "Tjetër",
} as const;

export const USAGE_CLASSIFICATION_LABELS = {
  NJEREZISH: "Njerëzish",
  NJEREZISH_DHE_MALLRA: "Njerëzish dhe mallra",
  NJEREZISH_DHE_PAJISJE_MOTORIKE: "Njerëzish dhe pajisje motorike",
  NJEREZISH_DHE_SHTRATI: "Njerëzish dhe shtrati",
  TJETER: "Tjetër",
} as const;

export const SPEED_RANGE_LABELS = {
  NEN_0_15: "Nën 0.15 m/s",
  NGA_0_15_DERI_1: "0.15 – 1 m/s",
  NGA_1_DERI_6_5: "1 – 6.5 m/s",
  MBI_6_5: "Mbi 6.5 m/s",
} as const;

export const YES_NO_LABELS = { PO: "Po", JO: "Jo" } as const;

export const EXAMINATION_TYPE_LABELS = {
  EKZAMINIM_I_PLOTE: "Ekzaminim i plotë",
  EKZAMINIM_PERIODIK: "Ekzaminim periodik",
} as const;

export const CONFORMITY_RESULT_LABELS = {
  KONFORM: "Konform",
  JO_KONFORM: "Jo konform",
  KONFORM_ME_KUSHTE: "Konform me kushte",
} as const;

export const EU_DECLARATION_LABELS = {
  PO: "Po",
  JO: "Jo",
  NUK_APLIKOHET: "Nuk aplikohet",
} as const;
