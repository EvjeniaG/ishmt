"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation/use-app-router";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions/notification-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type NotificationListItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  href: string | null;
};

export function NotificationList({
  notifications,
  notificationsHref = "/portal/notifications",
}: {
  notifications: NotificationListItem[];
  notificationsHref?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const unreadOnly = params.get("unread") === "1";
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const filtered = unreadOnly ? notifications.filter((n) => !n.readAt) : notifications;

  function setUnreadFilter(on: boolean) {
    const next = new URLSearchParams(params.toString());
    if (on) next.set("unread", "1");
    else next.delete("unread");
    router.push(`${notificationsHref}?${next.toString()}`);
  }

  async function markOneRead(id: string) {
    await markNotificationReadAction(id);
    router.refresh();
  }

  async function markAllRead() {
    await markAllNotificationsReadAction();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={unreadOnly ? "outline" : "default"} onClick={() => setUnreadFilter(false)}>
          Të gjitha
        </Button>
        <Button size="sm" variant={unreadOnly ? "default" : "outline"} onClick={() => setUnreadFilter(true)}>
          Të palexuara
        </Button>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => void markAllRead()}>
            Shëno të gjitha si lexuar
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nuk ka njoftime{unreadOnly ? " të palexuara" : ""}.</p>
      ) : (
        filtered.map((n) => (
          <Card
            key={n.id}
            className={`portal-surface ${n.readAt ? "opacity-80" : "border-l-4 border-l-gov-primary"}`}
          >
            <CardContent className="flex items-start justify-between gap-4 px-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{n.title}</p>
                  {!n.readAt && (
                    <span className="rounded bg-gov-primary/10 px-2 py-0.5 text-xs text-gov-primary">E re</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("sq-AL")}
                </p>
                {n.href ? (
                  <Link
                    href={n.href}
                    onClick={() => {
                      if (!n.readAt) void markOneRead(n.id);
                    }}
                    className="mt-2 inline-flex text-sm font-medium text-gov-primary hover:underline"
                  >
                    Hap detajin →
                  </Link>
                ) : null}
              </div>
              {!n.readAt && (
                <Button size="sm" variant="outline" onClick={() => void markOneRead(n.id)}>
                  Shëno si lexuar
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
