"use client";

import { useMemo } from "react";
import { useRouter as useNextRouter, type AppRouterInstance } from "next/navigation";
import { scrollPageToTopAfterUpdate } from "@/lib/navigation/scroll-page-to-top";

type NavigateOptions = Parameters<AppRouterInstance["push"]>[1];

function shouldScroll(options?: NavigateOptions) {
  return options?.scroll !== false;
}

/** Drop-in useRouter that scrolls to top after push/replace/refresh (unless scroll: false). */
export function useRouter(): AppRouterInstance {
  const router = useNextRouter();

  return useMemo(() => {
    const wrapped: AppRouterInstance = {
      ...router,
      push(href, options) {
        const result = router.push(href, options);
        if (shouldScroll(options)) scrollPageToTopAfterUpdate();
        return result;
      },
      replace(href, options) {
        const result = router.replace(href, options);
        if (shouldScroll(options)) scrollPageToTopAfterUpdate();
        return result;
      },
      refresh() {
        router.refresh();
        scrollPageToTopAfterUpdate();
      },
    };
    return wrapped;
  }, [router]);
}
