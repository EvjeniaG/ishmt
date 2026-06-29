"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsReadAction } from "@/lib/actions/notification-actions";
import { getNotificationHref } from "@/lib/notifications/get-notification-href";

export type HeaderNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  entityType: string | null;
  entityId: string | null;
};

export function PortalNotificationsMenu({
  notificationsHref,
  initialUnreadCount,
  notifications,
}: {
  notificationsHref: string;
  initialUnreadCount: number;
  notifications: HeaderNotification[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

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

  async function toggleOpen() {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen && unreadCount > 0) {
      setUnreadCount(0);
      await markAllNotificationsReadAction();
      router.refresh();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10 transition-colors hover:bg-white/15"
        title="Njoftimet"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Njoftimet"
      >
        <Bell className="h-4 w-4" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gov-danger px-1 text-[10px] font-bold shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-80 overflow-hidden rounded-xl border border-border/80 bg-card text-foreground shadow-portal-lg ring-1 ring-black/5 sm:w-96"
        >
          <div className="border-b border-border/80 bg-gov-surface/60 px-4 py-3">
            <p className="font-semibold text-gov-primary">Njoftimet</p>
            <p className="text-xs text-muted-foreground">4 njoftimet e fundit</p>
          </div>

          <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nuk ka njoftime.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {notifications.map((n) => {
                  const href = getNotificationHref(n.entityType, n.entityId, notificationsHref);
                  return (
                    <li key={n.id}>
                      {href ? (
                        <Link
                          href={href}
                          role="menuitem"
                          onClick={() => setOpen(false)}
                          className="block px-4 py-3 transition-colors hover:bg-gov-primary/[0.06]"
                        >
                          <NotificationRow notification={n} />
                        </Link>
                      ) : (
                        <div role="menuitem" className="px-4 py-3">
                          <NotificationRow notification={n} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border/80 bg-gov-surface/40 p-2">
            <Link
              href={notificationsHref}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-center text-sm font-medium text-gov-primary transition-colors hover:bg-gov-primary/[0.06]"
            >
              Shiko të gjitha
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification: n }: { notification: HeaderNotification }) {
  return (
    <>
      <p className="line-clamp-1 text-sm font-medium text-foreground">{n.title}</p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/80">
        {new Date(n.createdAt).toLocaleString("sq-AL")}
      </p>
    </>
  );
}
