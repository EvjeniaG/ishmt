"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/lib/navigation/use-app-router";
import { markAllNotificationsReadAction } from "@/lib/actions/notification-actions";

/** Shënon njoftimet si të lexuara kur përdoruesi hap faqen e njoftimeve. */
export function NotificationsInboxAutoRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  const marked = useRef(false);

  useEffect(() => {
    if (!hasUnread || marked.current) return;
    marked.current = true;

    void markAllNotificationsReadAction().then((result) => {
      if (result.success) router.refresh();
    });
  }, [hasUnread, router]);

  return null;
}
