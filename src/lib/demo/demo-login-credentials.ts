/** Kredencialet e plota demo - një burim i vetëm për login UI dhe deploy. */
import {
  DEMO_CERTIFIER_PROFILES,
  DEMO_INSTALLER_PROFILES,
  DEMO_MAINTENANCE_PROFILES,
  DEMO_OWNER_ADMINISTRATOR,
  DEMO_OWNER_CONSTRUCTION,
} from "@/lib/demo/demo-seed-profiles";

export const DEMO_LOGIN_PASSWORD = "Ishmt2026";

export type DemoLoginCredential = {
  role: string;
  kind: "owner" | "company" | "staff";
  identifier: string;
};

/** Kërkon `npm run db:seed:full-demo` (ose restore nga backup lokal). */
export const DEMO_LOGIN_CREDENTIALS: DemoLoginCredential[] = [
  {
    role: DEMO_OWNER_ADMINISTRATOR.loginLabel,
    kind: "owner",
    identifier: DEMO_OWNER_ADMINISTRATOR.nid,
  },
  {
    role: DEMO_OWNER_CONSTRUCTION.loginLabel,
    kind: "owner",
    identifier: DEMO_OWNER_CONSTRUCTION.nid,
  },
  ...DEMO_INSTALLER_PROFILES.map((profile) => ({
    role: profile.loginLabel,
    kind: "company" as const,
    identifier: profile.nipt,
  })),
  ...DEMO_CERTIFIER_PROFILES.map((profile) => ({
    role: profile.loginLabel,
    kind: "company" as const,
    identifier: profile.nipt,
  })),
  ...DEMO_MAINTENANCE_PROFILES.map((profile) => ({
    role: profile.loginLabel,
    kind: "company" as const,
    identifier: profile.nipt,
  })),
  { role: "Admin IQMT", kind: "staff", identifier: "I90101001A" },
  { role: "Kryeinspektor - Edison Konomi", kind: "staff", identifier: "I90505005E" },
  { role: "Drejtor i Drejtorisë - Erion Prifti", kind: "staff", identifier: "I90606006F" },
  { role: "Përgjegjës sektori - Albert Shqalshi", kind: "staff", identifier: "I90707007G" },
  { role: "Inspektor - Dritan Gjoka", kind: "staff", identifier: "I90909009I" },
  { role: "Inspektor - Elona Marku", kind: "staff", identifier: "I90909010J" },
  { role: "Drejtoria e Politikave", kind: "staff", identifier: "I90303003C" },
];

export const CANONICAL_DEMO_IDENTIFIERS = DEMO_LOGIN_CREDENTIALS.map((cred) => cred.identifier);

export const DEMO_DATASET_SUMMARY = [
  "17 përdorues (2 lloje pronarësh demo, 3 instalues, 3 certifikues, 2 mirëmbajtje, 2 inspektorë, 6 IQMT/MPB)",
  "5 aplikime regjistrimi në status «të dhëna bazë»",
  "2 ashensorë të regjistruar (KN-2025-884512, SCH-2024-553120)",
  "Raportime qytetarësh, mirëmbajtje, inspektime për pipeline demo",
  "1 aplikim gati për miratim nga kryeinspektori",
] as const;
