"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function scrollAllRootsToTop() {
  document.querySelectorAll<HTMLElement>("[data-scroll-root]").forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

import { isContractsSearchParamsChange, ISHMT_COMPLIANCE_MONITOR_PATH } from "@/lib/ishmt/contract-issue-filters";
export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();
  const navigationRef = useRef<{ pathname: string; search: string } | null>(null);

  useLayoutEffect(() => {
    const prev = navigationRef.current;

    if (prev && prev.pathname === pathname && pathname === ISHMT_COMPLIANCE_MONITOR_PATH) {
      if (isContractsSearchParamsChange(prev.search, searchKey)) {
        navigationRef.current = { pathname, search: searchKey };
        return;
      }
    }

    scrollAllRootsToTop();
    navigationRef.current = { pathname, search: searchKey };
  }, [pathname, searchKey]);

  return null;
}
