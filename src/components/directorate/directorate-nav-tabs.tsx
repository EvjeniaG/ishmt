"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { DirectorateNavTab } from "@/lib/directorate/directorate-nav";

function isTabActive(pathname: string, tab: DirectorateNavTab) {
  if (tab.exact) return pathname === tab.href;
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

export function DirectorateNavTabs({
  tabs,
  className,
}: {
  tabs: DirectorateNavTab[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("portal-tab-scroll", className)} aria-label="Nën-seksione">
      <div className="portal-tab-scroll-inner">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn("portal-tab-pill", active && "portal-tab-pill-active")}
              aria-current={active ? "page" : undefined}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
