"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { scrollPageToTopAfterUpdate } from "@/lib/navigation/scroll-page-to-top";
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

    scrollPageToTopAfterUpdate();
    navigationRef.current = { pathname, search: searchKey };
  }, [pathname, searchKey]);

  return null;
}
