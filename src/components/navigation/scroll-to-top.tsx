"use client";

import { useLayoutEffect } from "react";
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

/** Rikthen scroll-in në fillim kur ndryshon faqja ose parametrat e URL-së. */
export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  useLayoutEffect(() => {
    scrollAllRootsToTop();
  }, [pathname, searchKey]);

  return null;
}
