import type { RegisterOwnerEntityType } from "@/lib/registration/owner-entity-role";

export const DEMO_SEED_PASSWORD = "Ishmt2026";

export type DemoOwnerSeedProfile = {
  email: string;
  nid: string;
  firstName: string;
  fatherName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  ownerBuildingRole: RegisterOwnerEntityType;
  /** Emri i organizatës - për administrator emri i personit. */
  orgName: string;
  nipt: string | null;
  representativeName: string;
  loginLabel: string;
};

/** Përdoruesi kryesor demo i pipeline-it (Administrator Pallati). */
export const DEMO_OWNER_ADMINISTRATOR: DemoOwnerSeedProfile = {
  email: "arben.demo@example.al",
  nid: "I90404004D",
  firstName: "Arben",
  fatherName: "Përparim",
  lastName: "Demo",
  birthDate: "1985-06-15",
  phone: "+355692000001",
  ownerBuildingRole: "ADMINISTRATOR",
  orgName: "Arben Demo",
  nipt: null,
  representativeName: "Arben Demo",
  loginLabel: "Personi përgjegjës i ashensorit (Administrator Pallati)",
};

export const DEMO_OWNER_CONSTRUCTION: DemoOwnerSeedProfile = {
  email: "ndertim.demo@example.al",
  nid: "I90404006F",
  firstName: "Gent",
  fatherName: "Përparim",
  lastName: "Berisha",
  birthDate: "1982-11-08",
  phone: "+355692000003",
  ownerBuildingRole: "CONSTRUCTION_COMPANY",
  orgName: "Kompani Ndërtimi Demo",
  nipt: "L6040406A",
  representativeName: "Gent Berisha",
  loginLabel: "Kompani Ndërtimi",
};

export const DEMO_OWNER_PROFILES = [
  DEMO_OWNER_ADMINISTRATOR,
  DEMO_OWNER_CONSTRUCTION,
] as const;

export type DemoCompanySeedProfile = {
  orgName: string;
  nipt: string;
  orgEmail: string;
  orgPhone: string;
  orgAddress?: string;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  contactPhone: string;
  loginLabel: string;
};

export const DEMO_INSTALLER_PROFILES: DemoCompanySeedProfile[] = [
  {
    orgName: "Ashensorë Pro Sh.p.k.",
    nipt: "K11111111A",
    orgEmail: "info@ashensorepro.al",
    orgPhone: "+35542100100",
    orgAddress: "Rruga e Durrësit, Tiranë",
    contactEmail: "installer@ashensorepro.al",
    contactFirstName: "Genti",
    contactLastName: "Hoxha",
    contactPhone: "+355692001001",
    loginLabel: "Instalues - Ashensorë Pro",
  },
  {
    orgName: "Lift Master Albania Sh.p.k.",
    nipt: "L10000001A",
    orgEmail: "zyra@liftmaster.al",
    orgPhone: "+35542100200",
    orgAddress: "Rruga Kavajës, Tiranë",
    contactEmail: "installer@liftmaster.al",
    contactFirstName: "Ardit",
    contactLastName: "Leka",
    contactPhone: "+355692001002",
    loginLabel: "Instalues - Lift Master",
  },
  {
    orgName: "Euro Ashensorë Sh.p.k.",
    nipt: "L10000002B",
    orgEmail: "info@euroashensore.al",
    orgPhone: "+35542100300",
    orgAddress: "Rruga e Elbasanit, Tiranë",
    contactEmail: "installer@euroashensore.al",
    contactFirstName: "Sara",
    contactLastName: "Doçi",
    contactPhone: "+355692001003",
    loginLabel: "Instalues - Euro Ashensorë",
  },
];

export const DEMO_CERTIFIER_PROFILES: DemoCompanySeedProfile[] = [
  {
    orgName: "OM Certifikim Sh.p.k.",
    nipt: "K22222222B",
    orgEmail: "info@omicert.al",
    orgPhone: "+35542100400",
    contactEmail: "cert@omicert.al",
    contactFirstName: "Eda",
    contactLastName: "Krasniqi",
    contactPhone: "+355692002001",
    loginLabel: "Certifikues - OM Certifikim",
  },
  {
    orgName: "Inspekt OM Sh.p.k.",
    nipt: "M20000001A",
    orgEmail: "kontakt@inspektomi.al",
    orgPhone: "+35542100500",
    contactEmail: "cert@inspektomi.al",
    contactFirstName: "Blerim",
    contactLastName: "Vata",
    contactPhone: "+355692002002",
    loginLabel: "Certifikues - Inspekt OM",
  },
  {
    orgName: "Quality Lift Cert Sh.p.k.",
    nipt: "M20000002B",
    orgEmail: "info@qualitylift.al",
    orgPhone: "+35542100600",
    contactEmail: "cert@qualitylift.al",
    contactFirstName: "Nora",
    contactLastName: "Shehu",
    contactPhone: "+355692002003",
    loginLabel: "Certifikues - Quality Lift",
  },
];

export const DEMO_MAINTENANCE_PROFILES: DemoCompanySeedProfile[] = [
  {
    orgName: "Mirëmbajtje Ashensorësh Sh.p.k.",
    nipt: "K33333333C",
    orgEmail: "info@servisashensore.al",
    orgPhone: "+35542100700",
    contactEmail: "mirembajtje@servisashensore.al",
    contactFirstName: "Florian",
    contactLastName: "Beqiri",
    contactPhone: "+355692003001",
    loginLabel: "Mirëmbajtje - Servis Ashensorë",
  },
  {
    orgName: "Servis Lift 24 Sh.p.k.",
    nipt: "N30000001A",
    orgEmail: "info@servislift24.al",
    orgPhone: "+35542100800",
    contactEmail: "mirembajtje@servislift24.al",
    contactFirstName: "Klodian",
    contactLastName: "Rama",
    contactPhone: "+355692003002",
    loginLabel: "Mirëmbajtje - Servis Lift 24",
  },
];

/** Presetet e formularit të regjistrimit (të njëjta emra si seed-i). */
export const REGISTER_OWNER_PRESETS: Record<
  RegisterOwnerEntityType,
  Pick<DemoOwnerSeedProfile, "firstName" | "lastName" | "fatherName" | "orgName" | "nipt">
> = {
  ADMINISTRATOR: {
    firstName: DEMO_OWNER_ADMINISTRATOR.firstName,
    fatherName: DEMO_OWNER_ADMINISTRATOR.fatherName,
    lastName: DEMO_OWNER_ADMINISTRATOR.lastName,
    orgName: DEMO_OWNER_ADMINISTRATOR.orgName,
    nipt: null,
  },
  CONSTRUCTION_COMPANY: {
    firstName: DEMO_OWNER_CONSTRUCTION.firstName,
    fatherName: DEMO_OWNER_CONSTRUCTION.fatherName,
    lastName: DEMO_OWNER_CONSTRUCTION.lastName,
    orgName: DEMO_OWNER_CONSTRUCTION.orgName,
    nipt: DEMO_OWNER_CONSTRUCTION.nipt,
  },
};
