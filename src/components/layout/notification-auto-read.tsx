"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "@/lib/navigation/use-app-router";
import { markNotificationsReadForPathAction } from "@/lib/actions/notification-actions";

/** Marks unread notifications as read when the user opens their linked page. */
export function NotificationAutoRead() {
  const pathname = usePathname();
  const router = useRouter();
  const lastMarkedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastMarkedPath.current) return;

    let cancelled = false;

    void markNotificationsReadForPathAction(pathname).then((result) => {
      if (cancelled) return;
      lastMarkedPath.current = pathname;
      if (result.success && result.marked > 0) {
        router.refresh();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
