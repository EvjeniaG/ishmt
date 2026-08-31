/** Kompani shërbimi me 3 funksione - demo i portalit (i ndarë nga pool-i i regjistrimit OM). */
export const SERVICE_PROVIDER_DEMO = {
  nipt: "K63333333K",
  email: "demo.kompani@ishmtt.test",
  password: "Ishmt2026",
  firstName: "Bledar",
  lastName: "Shehu",
  phone: "+355692001001",
  orgName: "Kompani Shërbimi Demo Sh.p.k.",
  omLicenseNumber: "OM-SP-DEMO-001",
  installLicenseNumber: "INST-SP-DEMO-001",
  maintenanceLicenseNumber: "MB-SP-DEMO-001",
} as const;

export const SERVICE_PROVIDER_DEMO_APP_PREFIX = "APP-SP-DEMO";
export const SERVICE_PROVIDER_DEMO_CONTRACT_PREFIX = "KM-SP-DEMO";

export type ServiceProviderDemoPage = {
  href: string;
  label: string;
  group: string;
  description: string;
};

/** Udhëzues vizual - çdo faqe e sidebar-it të kompanisë shërbimi. */
export const SERVICE_PROVIDER_DEMO_PAGES: ServiceProviderDemoPage[] = [
  {
    group: "Kryesore",
    href: "/portal/dashboard",
    label: "Paneli",
    description: "Përmbledhje KPI për instalim, mirëmbajtje dhe OM.",
  },
  {
    group: "Kryesore",
    href: "/portal/raportet",
    label: "Gjenero raport",
    description: "Eksport raportesh operacionale.",
  },
  {
    group: "Kryesore",
    href: "/portal/profile",
    label: "Profili",
    description: "Të dhënat e përdoruesit dhe organizatës.",
  },
  {
    group: "Instalim",
    href: "/portal/applications",
    label: "Aplikime instalimi",
    description: "Aplikime të deleguara, ftesa, të dhëna teknike.",
  },
  {
    group: "Mirëmbajtje",
    href: "/portal/elevators",
    label: "Ashensorët në mirëmbajtje",
    description: "Lista e ashensorëve me kontratë aktive mirëmbajtjeje.",
  },
  {
    group: "Mirëmbajtje",
    href: "/portal/sherbimi/contracts",
    label: "Kontratat e mirëmbajtjes",
    description: "Kontrata aktive, në pritje dhe historiku.",
  },
  {
    group: "Mirëmbajtje",
    href: "/portal/sherbimi/nderhyrje",
    label: "Ndërhyrjet & defektet",
    description: "Regjistrim ndërhyrjesh dhe historiku.",
  },
  {
    group: "Mirëmbajtje",
    href: "/portal/sherbimi/raport-mujor",
    label: "Kontrollet periodike",
    description: "Kontrolle periodike mujore dhe historiku.",
  },
  {
    group: "OM / Certifikim",
    href: "/portal/applications",
    label: "Aplikime për certifikim",
    description: "Aplikime në fazën e certifikimit OM.",
  },
  {
    group: "OM / Certifikim",
    href: "/portal/omi/kontratat-kontrolli",
    label: "Kontratat e kontrollit periodik",
    description: "Kontrata OM për kontrollin periodik.",
  },
  {
    group: "OM / Certifikim",
    href: "/portal/omi/inspektim-periodik",
    label: "Kontrollet periodike",
    description: "Regjistrim dhe historiku kontrollesh periodike OM.",
  },
];
