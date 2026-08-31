"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeft, PanelLeftClose, X } from "lucide-react";
import { PortalSidebar } from "@/components/layout/portal-sidebar";
import type { OrgCapabilities } from "@/lib/organizations/org-capabilities";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "portal-sidebar-collapsed";

type PortalNavContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
  desktopCollapsed: boolean;
  toggleDesktop: () => void;
};

const PortalNavContext = createContext<PortalNavContextValue | null>(null);

export function PortalNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  const toggleDesktop = useCallback(() => {
    setDesktopCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    try {
      setDesktopCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <PortalNavContext.Provider value={{ open, toggle, close, desktopCollapsed, toggleDesktop }}>
      {children}
    </PortalNavContext.Provider>
  );
}

export function usePortalNav() {
  const ctx = useContext(PortalNavContext);
  if (!ctx) throw new Error("usePortalNav must be used within PortalNavProvider");
  return ctx;
}

/** Menu mobil (telefon/tablet). */
export function PortalMenuButton() {
  const { open, toggle } = usePortalNav();

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10 transition-colors hover:bg-white/15 lg:hidden"
      aria-expanded={open}
      aria-label={open ? "Mbyll menunë" : "Hap menunë e navigimit"}
    >
      {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </button>
  );
}

/** Palos/hap sidebar-in në desktop (header). */
export function PortalDesktopSidebarToggle() {
  const { desktopCollapsed, toggleDesktop } = usePortalNav();

  return (
    <button
      type="button"
      onClick={toggleDesktop}
      className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10 transition-colors hover:bg-white/15 lg:flex"
      aria-label={desktopCollapsed ? "Hap navigimin" : "Mbyll navigimin"}
      aria-expanded={!desktopCollapsed}
    >
      {desktopCollapsed ? (
        <PanelLeft className="h-5 w-5" aria-hidden />
      ) : (
        <PanelLeftClose className="h-5 w-5" aria-hidden />
      )}
    </button>
  );
}

export function PortalMain({ children }: { children: ReactNode }) {
  const { desktopCollapsed } = usePortalNav();
  const pathname = usePathname();
  const isIshmtCanvas = pathname.startsWith("/ishmt");

  return (
    <main
      data-scroll-root
      className={cn(
        "portal-canvas min-h-0 flex-1 overflow-y-auto overflow-x-hidden print:ml-0 print:overflow-visible transition-[margin] duration-300 ease-out",
        isIshmtCanvas && "ishmt-canvas",
        !desktopCollapsed && "lg:ml-[17.5rem]",
      )}
    >
      <div className="portal-canvas-inner">{children}</div>
    </main>
  );
}

export function PortalSidebarLayout({
  role,
  orgCapabilities,
}: {
  role?: string;
  orgCapabilities?: OrgCapabilities | null;
}) {
  const { open, close, desktopCollapsed } = usePortalNav();

  return (
    <>
      <div
        className={cn(
          "hidden lg:block lg:absolute lg:inset-y-0 lg:left-0 lg:z-30 lg:w-[17.5rem] print:hidden transition-transform duration-300 ease-out",
          desktopCollapsed ? "-translate-x-full" : "translate-x-0",
        )}
        aria-hidden={desktopCollapsed}
      >
        <PortalSidebar
          role={role}
          orgCapabilities={orgCapabilities}
          className="h-full"
        />
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 top-16 z-[1050] bg-gov-header/60 backdrop-blur-sm print:hidden lg:hidden"
          aria-label="Mbyll menunë"
          onClick={close}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 top-16 z-[1100] flex transform transition-transform duration-300 ease-out print:hidden lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <PortalSidebar
          role={role}
          orgCapabilities={orgCapabilities}
          onNavigate={close}
          className="h-full max-h-screen shadow-xl"
        />
      </div>
    </>
  );
}
