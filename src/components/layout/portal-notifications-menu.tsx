"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notification-actions";

export type HeaderNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  href: string | null;
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
  const [readLocally, setReadLocally] = useState<Set<string>>(() => new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const markingAllRef = useRef(false);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  async function markAllUnreadOnPanelOpen() {
    if (markingAllRef.current || unreadCount <= 0) return;
    markingAllRef.current = true;
    const previousCount = unreadCount;
    setUnreadCount(0);
    setReadLocally(new Set(notifications.map((n) => n.id)));
    const result = await markAllNotificationsReadAction();
    markingAllRef.current = false;
    if (!result.success) {
      setUnreadCount(previousCount);
      setReadLocally(new Set());
      return;
    }
    router.refresh();
  }

  function onBellClick() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    void markAllUnreadOnPanelOpen();
  }

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

  async function markReadIfNeeded(notificationId: string, readAt: string | null) {
    if (readAt || readLocally.has(notificationId)) return false;
    setReadLocally((prev) => new Set(prev).add(notificationId));
    setUnreadCount((count) => Math.max(0, count - 1));
    const result = await markNotificationReadAction(notificationId);
    if (!result.success) {
      setReadLocally((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
      setUnreadCount((count) => count + 1);
      return false;
    }
    return true;
  }

  async function onNotificationClick(notification: HeaderNotification) {
    setOpen(false);
    await markReadIfNeeded(notification.id, notification.readAt);
    if (notification.href) router.push(notification.href);
    else router.push(notificationsHref);
    router.refresh();
  }

  async function onViewAllClick() {
    setOpen(false);
    router.push(notificationsHref);
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onBellClick}
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
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void onNotificationClick(n)}
                      className="block w-full px-4 py-3 text-left transition-colors hover:bg-gov-primary/[0.06]"
                    >
                      <NotificationRow
                        notification={n}
                        readLocally={readLocally.has(n.id)}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border/80 bg-gov-surface/40 p-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => void onViewAllClick()}
              className="block w-full rounded-lg px-3 py-2.5 text-center text-sm font-medium text-gov-primary transition-colors hover:bg-gov-primary/[0.06]"
            >
              Shiko të gjitha
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification: n,
  readLocally,
}: {
  notification: HeaderNotification;
  readLocally: boolean;
}) {
  const showUnread = !n.readAt && !readLocally;
  return (
    <>
      <p className="line-clamp-1 text-sm font-medium text-foreground">
        {showUnread && (
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-gov-danger align-middle" aria-hidden />
        )}
        {n.title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{n.body}</p>
      <p className="mt-1 text-[11px] text-muted-foreground/80">
        {new Date(n.createdAt).toLocaleString("sq-AL")}
      </p>
    </>
  );
}
