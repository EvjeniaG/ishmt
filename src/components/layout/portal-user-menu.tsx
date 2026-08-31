"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { ROLE_CODES } from "@/lib/constants/roles";
import {
  getDashboardPathForRole,
  getNotificationsPathForRole,
  getProfilePathForRole,
} from "@/lib/permissions/nav-paths";
import type { RoleCode } from "@/lib/constants/roles";

type MenuItem = { href: string; label: string };

function menuForRole(roleCode: RoleCode): MenuItem[] {
  const dashboard = getDashboardPathForRole(roleCode);
  const profile = getProfilePathForRole(roleCode);
  const notifications = getNotificationsPathForRole(roleCode);

  switch (roleCode) {
    case ROLE_CODES.OWNER:
      return [
        { href: dashboard, label: "Paneli kryesor" },
        { href: profile, label: "Profili" },
        { href: notifications, label: "Njoftimet" },
        { href: "/portal/history", label: "Historiku" },
      ];
    case ROLE_CODES.INSTALLER:
    case ROLE_CODES.CERTIFIER:
    case ROLE_CODES.MAINTENANCE:
      return [
        { href: dashboard, label: "Paneli" },
        { href: profile, label: "Profili" },
        { href: "/portal/documents", label: "Dokumentet" },
        { href: notifications, label: "Njoftimet" },
        { href: "/portal/settings/members", label: "Anëtarët" },
      ];
    case ROLE_CODES.FIELD_INSPECTOR:
      return [
        { href: dashboard, label: "Detyrat e mia" },
        { href: "/ishmt/my-citizen-reports", label: "Raportime nga qytetarët" },
        { href: "/ishmt/my-application-reviews", label: "Shqyrtim aplikimesh" },
        { href: "/ishmt/search", label: "Kërko ashensor" },
        { href: "/portal/raportet", label: "Gjenero raport" },
        { href: profile, label: "Profili" },
        { href: notifications, label: "Njoftimet" },
      ];
    case ROLE_CODES.SECTOR_HEAD:
      return [
        { href: dashboard, label: "Paneli" },
        { href: profile, label: "Profili" },
        { href: notifications, label: "Njoftimet" },
        { href: "/ishmt/review", label: "Shqyrtim aplikimesh" },
        { href: "/ishmt/field-inspections", label: "Cakto inspektim terreni" },
        { href: "/ishmt/reports", label: "Raportimet e qytetarëve" },
      ];
    case ROLE_CODES.ISHMT_DIRECTOR:
      return [
        { href: dashboard, label: "Paneli" },
        { href: "/ishmt/director/review", label: "Shqyrtimi i aplikimeve" },
        { href: "/ishmt/reports", label: "Raportimet e qytetarëve" },
        { href: "/ishmt/search", label: "Regjistri i ashensorëve" },
        { href: "/ishmt/director/map", label: "Harta sipas bashkive" },
        { href: "/ishmt/field-inspections", label: "Cakto inspektim terreni" },
        { href: profile, label: "Profili" },
        { href: notifications, label: "Njoftimet" },
      ];
    case ROLE_CODES.CHIEF_INSPECTOR:
      return [
        { href: dashboard, label: "Paneli" },
        { href: profile, label: "Profili" },
        { href: notifications, label: "Njoftimet" },
        { href: "/ishmt/chief/applications", label: "Aplikime" },
        { href: "/ishmt/reports", label: "Raportimet e qytetarëve" },
        { href: "/ishmt/field-inspections", label: "Cakto inspektim terreni" },
        { href: "/ishmt/search", label: "Regjistri i ashensorëve" },
      ];
    case ROLE_CODES.ADMIN:
      return [
        { href: dashboard, label: "Paneli" },
        { href: profile, label: "Profili" },
        { href: notifications, label: "Njoftimet" },
        { href: "/ishmt/admin/users", label: "Përdoruesit" },
        { href: "/ishmt/admin/config", label: "Konfigurime" },
      ];
    case ROLE_CODES.DIRECTORATE:
      return [
        { href: dashboard, label: "Paneli" },
        { href: "/directorate/companies", label: "Regjistri i kompanive" },
        { href: "/directorate/companies/new", label: "Shto kompani" },
        { href: "/directorate/licenses", label: "Licencat" },
        { href: "/directorate/activity", label: "Aktiviteti" },
        { href: notifications, label: "Njoftimet" },
        { href: profile, label: "Profili" },
      ];
    default:
      return [
        { href: dashboard, label: "Paneli" },
        { href: "/portal/raportet", label: "Gjenero raport" },
      ];
  }
}

export function PortalUserMenu({
  firstName,
  lastName,
  initials,
  roleCode,
  roleLabel,
  orgName,
}: {
  firstName: string;
  lastName: string;
  initials: string;
  roleCode: string;
  roleLabel: string;
  orgName?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const items = menuForRole((roleCode as RoleCode) || ROLE_CODES.OWNER);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="portal-header-chip"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menyja e llogarisë"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-xs font-bold">
          {initials}
        </span>
        <span className="hidden max-w-[120px] truncate font-medium sm:inline">
          {firstName} {lastName}
        </span>
        <ChevronDown
          className={`hidden h-4 w-4 shrink-0 text-white/70 transition-transform sm:block ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-64 overflow-hidden rounded-xl border border-border/80 bg-card text-foreground shadow-portal-lg ring-1 ring-black/5"
        >
          <div className="border-b border-border/80 bg-gov-surface/60 px-4 py-3">
            <p className="truncate font-semibold text-gov-primary">
              {firstName} {lastName}
            </p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {roleLabel}
            </p>
            {orgName && (
              <p className="mt-1 truncate text-xs text-muted-foreground">{orgName}</p>
            )}
          </div>

          <div className="py-1.5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-gov-primary/[0.06] hover:text-gov-primary"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="border-t border-border/80 py-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-gov-danger transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.75} />
              Dil nga llogaria
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
