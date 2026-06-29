"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PortalSidebar } from "@/components/layout/portal-sidebar";

type PortalNavContextValue = {
  open: boolean;
  toggle: () => void;
  close: () => void;
};

const PortalNavContext = createContext<PortalNavContextValue | null>(null);

export function PortalNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <PortalNavContext.Provider value={{ open, toggle, close }}>{children}</PortalNavContext.Provider>
  );
}

export function usePortalNav() {
  const ctx = useContext(PortalNavContext);
  if (!ctx) throw new Error("usePortalNav must be used within PortalNavProvider");
  return ctx;
}

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

export function PortalSidebarLayout({ role }: { role?: string }) {
  const { open, close } = usePortalNav();

  return (
    <>
      <div className="hidden lg:absolute lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-[17.5rem] print:hidden">
        <PortalSidebar role={role} className="h-full" />
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
        <PortalSidebar role={role} onNavigate={close} className="h-full max-h-screen shadow-xl" />
      </div>
    </>
  );
}
