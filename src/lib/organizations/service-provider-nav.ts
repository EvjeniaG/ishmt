import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ScrollText,
  TableProperties,
  User,
  Wrench,
} from "lucide-react";
import {
  PERIODIC_INSPECTION_CONTRACTS_LABEL,
  PERIODIC_INSPECTIONS_LABEL,
} from "@/lib/constants/periodic-inspection-labels";
import type { OrgCapabilities } from "@/lib/organizations/org-capabilities";
import { capabilitiesFromOrg, countActiveCapabilities, isLicensedServiceProvider } from "@/lib/organizations/org-capabilities";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: PortalNavItem[];
};

const EXPORT_REPORTS_NAV: PortalNavItem = {
  href: "/portal/raportet",
  label: "Gjenero raport",
  icon: TableProperties,
};

const SERVICE_PROVIDER_FOOTER_NAV: PortalNavItem[] = [
  EXPORT_REPORTS_NAV,
  { href: "/portal/profile", label: "Profili", icon: User },
];

/** Ndërton sidebar për kompanitë shërbim sipas funksioneve të aktivizuara. */
export function buildServiceProviderNav(caps: OrgCapabilities): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: "Kryesore",
      items: [{ href: "/portal/dashboard", label: "Paneli", icon: LayoutDashboard }],
    },
  ];

  if (caps.capInstall) {
    groups.push({
      label: "Instalim",
      items: [{ href: "/portal/applications", label: "Aplikime instalimi", icon: ClipboardList }],
    });
  }

  if (caps.capMaintenance) {
    groups.push({
      label: "Mirëmbajtje",
      items: [
        { href: "/portal/elevators", label: "Ashensorët në mirëmbajtje", icon: Building2 },
        { href: "/portal/sherbimi/contracts", label: "Kontratat e mirëmbajtjes", icon: ClipboardList },
        { href: "/portal/sherbimi/nderhyrje", label: "Ndërhyrjet & defektet", icon: Wrench },
        { href: "/portal/sherbimi/raport-mujor", label: "Kontrollet periodike", icon: FileText },
      ],
    });
  }

  if (caps.capOm) {
    groups.push({
      label: "OM / Certifikim",
      items: [
        { href: "/portal/applications", label: "Aplikime për certifikim", icon: ClipboardList },
        { href: "/portal/omi/kontratat-kontrolli", label: PERIODIC_INSPECTION_CONTRACTS_LABEL, icon: ScrollText },
        { href: "/portal/omi/inspektim-periodik", label: PERIODIC_INSPECTIONS_LABEL, icon: ClipboardCheck },
      ],
    });
  }

  groups.push({ label: "", items: SERVICE_PROVIDER_FOOTER_NAV });
  return groups;
}

const FOOTER_NAV_LABELS = new Set(["Gjenero raport", "Profili"]);

/** Vendos Gjenero raport dhe Profili në fund të navigimit. */
export function partitionFooterNavItems(groups: NavGroup[]): NavGroup[] {
  const footer: PortalNavItem[] = [];
  const seen = new Set<string>();

  const primary = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!FOOTER_NAV_LABELS.has(item.label)) return true;
        const key = `${item.href}:${item.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        footer.push(item);
        return false;
      }),
    }))
    .filter((group) => group.items.length > 0);

  if (footer.length === 0) return primary;
  return [...primary, { label: "", items: footer }];
}

export function resolveOrgCapabilities(org: {
  type: import("@prisma/client").OrgType;
  capInstall?: boolean | null;
  capMaintenance?: boolean | null;
  capOm?: boolean | null;
}): OrgCapabilities | null {
  if (!isLicensedServiceProvider(org)) return null;
  return capabilitiesFromOrg(org);
}

const SHARED_PORTAL_PREFIXES = [
  "/portal/dashboard",
  "/portal/profile",
  "/portal/raportet",
  "/portal/notifications",
  "/portal/settings",
];

/** Kontrollon nëse rruga lejohet për funksionet e kompanisë. */
export function canAccessPathWithCapabilities(pathname: string, caps: OrgCapabilities): boolean {
  if (SHARED_PORTAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  if (pathname.startsWith("/portal/applications")) {
    return caps.capInstall || caps.capOm;
  }

  if (pathname.startsWith("/portal/elevators") || pathname.startsWith("/portal/sherbimi")) {
    return caps.capMaintenance || caps.capOm;
  }

  if (pathname.startsWith("/portal/omi")) {
    return caps.capOm;
  }

  return false;
}

export { countActiveCapabilities } from "@/lib/organizations/org-capabilities";
