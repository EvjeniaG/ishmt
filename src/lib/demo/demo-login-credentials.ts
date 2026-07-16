/** Kredencialet e plota demo — një burim i vetëm për login UI dhe deploy. */
export const DEMO_LOGIN_PASSWORD = "Ishmt2026";

export type DemoLoginCredential = {
  role: string;
  level:
    | "OWNER"
    | "INSTALLER"
    | "CERTIFIER"
    | "MAINTENANCE"
    | "ADMIN"
    | "CHIEF_INSPECTOR"
    | "ISHMT_DIRECTOR"
    | "SECTOR_HEAD"
    | "SECTOR_SPECIALIST"
    | "FIELD_INSPECTOR"
    | "DIRECTORATE";
  identifier: string;
};

/** Kërkon `npm run db:seed:full-demo` (ose restore nga backup lokal). */
export const DEMO_LOGIN_CREDENTIALS: DemoLoginCredential[] = [
  { role: "Personi përgjegjës i ashensorit", level: "OWNER", identifier: "I90404004D" },
  { role: "Instalues - Ashensorë Pro", level: "INSTALLER", identifier: "K11111111A" },
  { role: "Instalues - Lift Master", level: "INSTALLER", identifier: "L10000001A" },
  { role: "Instalues - Euro Ashensorë", level: "INSTALLER", identifier: "L10000002B" },
  { role: "Certifikues - OMI Certifikim", level: "CERTIFIER", identifier: "K22222222B" },
  { role: "Certifikues - Inspekt OMI", level: "CERTIFIER", identifier: "M20000001A" },
  { role: "Certifikues - Quality Lift", level: "CERTIFIER", identifier: "M20000002B" },
  { role: "Mirëmbajtje - Servis Ashensorë", level: "MAINTENANCE", identifier: "K33333333C" },
  { role: "Mirëmbajtje - Servis Lift 24", level: "MAINTENANCE", identifier: "N30000001A" },
  { role: "Admin ISHMT", level: "ADMIN", identifier: "I90101001A" },
  { role: "Kryeinspektor - Edison Konomi", level: "CHIEF_INSPECTOR", identifier: "I90505005E" },
  { role: "Drejtor Teknik - Erion Prifti", level: "ISHMT_DIRECTOR", identifier: "I90606006F" },
  {
    role: "Përgjegjës i Sektorit të Produkteve Mekanike - Albert Shqalshi",
    level: "SECTOR_HEAD",
    identifier: "I90707007G",
  },
  { role: "Specialist sektori", level: "SECTOR_SPECIALIST", identifier: "I90808008H" },
  { role: "Inspektor terreni", level: "FIELD_INSPECTOR", identifier: "I90909009I" },
  { role: "Drejtoria e Politikave", level: "DIRECTORATE", identifier: "I90303003C" },
];

export const DEMO_DATASET_SUMMARY = [
  "16 përdorues (pronar, 3 instalues, 3 certifikues, 2 mirëmbajtje, 7 ISHMT/MPB)",
  "5 aplikime regjistrimi në status «të dhëna bazë»",
  "2 ashensorë të regjistruar (KN-2025-884512, SCH-2024-553120)",
  "Raportime qytetarësh, mirëmbajtje, inspektime për pipeline demo",
  "1 aplikim gati për miratim nga kryeinspektori",
] as const;
