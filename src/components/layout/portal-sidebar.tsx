"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Bell,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  Map,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  TableProperties,
  User,
  Users,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { ROLE_CODES } from "@/lib/constants/roles";
import { getProfilePathForRole } from "@/lib/permissions/nav-paths";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  items: PortalNavItem[];
};

const EXPORT_REPORTS_NAV: PortalNavItem = {
  href: "/portal/raportet",
  label: "Gjenero raport",
  icon: TableProperties,
};

const ISHMT_DIGEST_NAV: PortalNavItem = {
  href: "/ishmt/compliance-digest",
  label: "Përmbledhje ditore",
  icon: CalendarClock,
};

const ISHMT_NOTIFICATIONS_NAV: PortalNavItem = {
  href: "/ishmt/notifications",
  label: "Njoftimet",
  icon: Bell,
};

const OWNER_NAV: NavGroup[] = [
  {
    label: "Kryesore",
    items: [
      { href: "/portal/dashboard", label: "Paneli", icon: LayoutDashboard },
      { href: "/portal/applications", label: "Aplikimet e mia", icon: ClipboardList },
      { href: "/portal/elevators", label: "Ashensorët e mi", icon: Building2 },
      { href: "/portal/maintenance", label: "Kontratat e mirëmbajtjes", icon: ScrollText },
      { href: "/portal/notifications", label: "Njoftimet", icon: Clock3 },
      EXPORT_REPORTS_NAV,
      { href: "/portal/profile", label: "Profili", icon: User },
    ],
  },
];

const INSTALLER_NAV: NavGroup[] = [
  {
    label: "Instalues",
    items: [
      { href: "/portal/dashboard", label: "Paneli", icon: LayoutDashboard },
      { href: "/portal/applications", label: "Aplikime të caktuara", icon: ClipboardList },
      EXPORT_REPORTS_NAV,
      { href: "/portal/profile", label: "Profili", icon: User },
    ],
  },
];

const CERTIFIER_NAV: NavGroup[] = [
  {
    label: "Certifikues / OMI",
    items: [
      { href: "/portal/dashboard", label: "Paneli", icon: LayoutDashboard },
      { href: "/portal/applications", label: "Aplikime për certifikim", icon: ClipboardList },
      { href: "/portal/omi/kontratat", label: "Kontratat aktive", icon: ScrollText },
      { href: "/portal/omi/inspektim-periodik", label: "Inspektimet periodike", icon: ClipboardCheck },
      EXPORT_REPORTS_NAV,
      { href: "/portal/profile", label: "Profili", icon: User },
    ],
  },
];

const MAINTENANCE_NAV: NavGroup[] = [
  {
    label: "Mirëmbajtje",
    items: [
      { href: "/portal/dashboard", label: "Paneli", icon: LayoutDashboard },
      { href: "/portal/elevators", label: "Ashensorët në mirëmbajtje", icon: Building2 },
      { href: "/portal/sherbimi/contracts", label: "Kontratat", icon: ClipboardList },
      { href: "/portal/sherbimi/nderhyrje", label: "Ndërhyrjet & defektet", icon: Wrench },
      { href: "/portal/sherbimi/raport-mujor", label: "Kontrollet periodike", icon: FileText },
      EXPORT_REPORTS_NAV,
      { href: "/portal/profile", label: "Profili", icon: User },
    ],
  },
];

const FIELD_INSPECTOR_NAV: NavGroup[] = [
  {
    label: "Inspektor",
    items: [
      { href: "/ishmt/my-application-reviews", label: "Shqyrtimi i aplikimeve", icon: ClipboardList },
      { href: "/ishmt/my-field-inspections", label: "Detyrat e mia në terren", icon: ClipboardCheck },
      { href: "/ishmt/search", label: "Kërko ashensor", icon: Search },
      ISHMT_NOTIFICATIONS_NAV,
      EXPORT_REPORTS_NAV,
      { href: getProfilePathForRole(ROLE_CODES.FIELD_INSPECTOR), label: "Profili", icon: User },
    ],
  },
];


const SECTOR_HEAD_NAV: NavGroup[] = [
  {
    label: "Përgjegjës sektori",
    items: [
      { href: "/ishmt/dashboard", label: "Paneli", icon: LayoutDashboard },
      ISHMT_DIGEST_NAV,
      { href: "/ishmt/review", label: "Shqyrtimi i aplikimeve", icon: ClipboardList },
      { href: "/ishmt/field-inspections", label: "Cakto inspektim terreni", icon: ShieldCheck },
      { href: "/ishmt/reports", label: "Raportimet e qytetarëve", icon: FileText },
      { href: "/ishmt/search", label: "Regjistri i ashensorëve", icon: Search },
      ISHMT_NOTIFICATIONS_NAV,
      EXPORT_REPORTS_NAV,
      { href: getProfilePathForRole(ROLE_CODES.SECTOR_HEAD), label: "Profili", icon: User },
    ],
  },
];

const ISHMT_DIRECTOR_NAV: NavGroup[] = [
  {
    label: "Drejtor i Drejtorisë",
    items: [
      { href: "/ishmt/director/dashboard", label: "Paneli", icon: LayoutDashboard },
      { href: "/ishmt/director/review", label: "Shqyrtimi i aplikimeve", icon: ClipboardList },
      ISHMT_DIGEST_NAV,
      { href: "/ishmt/field-inspections", label: "Cakto inspektim terreni", icon: ShieldCheck },
      { href: "/ishmt/search", label: "Regjistri i ashensorëve", icon: Building2 },
      { href: "/ishmt/director/map", label: "Harta sipas bashkive", icon: Map },
      EXPORT_REPORTS_NAV,
      { href: getProfilePathForRole(ROLE_CODES.ISHMT_DIRECTOR), label: "Profili", icon: User },
    ],
  },
];

const INSPECTOR_NAV: NavGroup[] = [];

const CHIEF_INSPECTOR_NAV: NavGroup[] = [
  {
    label: "Kryeinspektor",
    items: [
      { href: "/ishmt/chief/dashboard", label: "Paneli", icon: LayoutDashboard },
      { href: "/ishmt/chief/inbox", label: "Aplikime të reja", icon: ClipboardList },
      ISHMT_DIGEST_NAV,
      { href: "/ishmt/chief/approvals", label: "Miratimet & vendimet", icon: ClipboardCheck },
      { href: "/ishmt/field-inspections", label: "Cakto inspektim terreni", icon: ShieldCheck },
      { href: "/ishmt/search", label: "Regjistri i ashensorëve", icon: Building2 },
      { href: "/ishmt/chief/map", label: "Harta sipas bashkive", icon: Map },
      EXPORT_REPORTS_NAV,
      { href: getProfilePathForRole(ROLE_CODES.CHIEF_INSPECTOR), label: "Profili", icon: User },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    label: "Administrator i sistemit",
    items: [
      { href: "/ishmt/admin/dashboard", label: "Paneli", icon: LayoutDashboard },
      ISHMT_DIGEST_NAV,
      { href: "/ishmt/admin/users", label: "Përdoruesit", icon: Users },
      { href: "/ishmt/admin/audit", label: "Audit log", icon: ScrollText },
      { href: "/ishmt/admin/config", label: "Konfigurime", icon: Settings },
      { href: "/ishmt/search", label: "Regjistri ashensorëve", icon: Search },
      EXPORT_REPORTS_NAV,
      { href: getProfilePathForRole(ROLE_CODES.ADMIN), label: "Profili", icon: User },
    ],
  },
];

const DIRECTORATE_NAV: NavGroup[] = [
  {
    label: "Drejtoria e Politikave",
    items: [
      { href: "/directorate/dashboard", label: "Paneli", icon: LayoutDashboard },
      { href: "/directorate/companies", label: "Regjistri i plotë i kompanive", icon: Building2 },
      { href: "/directorate/companies/new", label: "Rregjistro një komp. të re", icon: FileText },
      { href: "/directorate/activity", label: "Aktiviteti i kompanive", icon: ClipboardList },
      EXPORT_REPORTS_NAV,
      { href: getProfilePathForRole(ROLE_CODES.DIRECTORATE), label: "Profili", icon: User },
    ],
  },
];

const NAV_BY_ROLE: Record<string, NavGroup[]> = {
  [ROLE_CODES.OWNER]: OWNER_NAV,
  [ROLE_CODES.INSTALLER]: INSTALLER_NAV,
  [ROLE_CODES.CERTIFIER]: CERTIFIER_NAV,
  [ROLE_CODES.MAINTENANCE]: MAINTENANCE_NAV,
  [ROLE_CODES.FIELD_INSPECTOR]: FIELD_INSPECTOR_NAV,
  [ROLE_CODES.SECTOR_HEAD]: SECTOR_HEAD_NAV,
  [ROLE_CODES.ISHMT_DIRECTOR]: ISHMT_DIRECTOR_NAV,
  [ROLE_CODES.INSPECTOR]: INSPECTOR_NAV,
  [ROLE_CODES.CHIEF_INSPECTOR]: CHIEF_INSPECTOR_NAV,
  [ROLE_CODES.ADMIN]: ADMIN_NAV,
  [ROLE_CODES.DIRECTORATE]: DIRECTORATE_NAV,
};

function flattenGroups(groups: NavGroup[]): PortalNavItem[] {
  return groups.flatMap((g) => g.items);
}

export function PortalSidebar({
  role,
  items,
  onNavigate,
  className,
}: {
  role?: string;
  items?: PortalNavItem[];
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const groups = items ? [{ label: "", items }] : NAV_BY_ROLE[role ?? ""] ?? OWNER_NAV;

  function isActive(href: string) {
    const path = href.split("?")[0];
    if (path.endsWith("/dashboard")) return pathname === path;
    if (path === "/directorate/companies") return pathname === path;
    if (path === "/directorate/activity") return pathname === path || pathname.startsWith("/directorate/activity");
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  return (
    <aside
      className={`flex h-full w-[17.5rem] shrink-0 flex-col overflow-hidden border-r border-border/80 bg-card shadow-portal ${className ?? ""}`}
    >
      <div className="border-b border-border/80 bg-gov-surface/50 px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Navigimi</p>
      </div>
      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-3">
        {groups.map((group) => (
          <div key={group.label || "default"}>
            {group.label && (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    onClick={onNavigate}
                    className={`portal-nav-item ${active ? "portal-nav-item-active" : "portal-nav-item-idle"}`}
                  >
                    <span
                      className={`portal-nav-icon-wrap ${
                        active ? "portal-nav-icon-wrap-active" : "portal-nav-icon-wrap-idle"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2 : 1.75} />
                    </span>
                    <span className="leading-snug">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-border/80 bg-gov-surface/40 p-3">
        <SignOutButton className="w-full justify-start rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-red-50 hover:text-gov-danger" />
      </div>
    </aside>
  );
}

export { flattenGroups, NAV_BY_ROLE };
