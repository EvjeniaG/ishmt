"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { markNotificationReadAction } from "@/lib/actions/notification-actions";
import { getNotificationHref } from "@/lib/notifications/get-notification-href";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function NotificationList({
  notifications,
  notificationsHref = "/portal/notifications",
}: {
  notifications: {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    readAt: string | null;
    entityType: string | null;
    entityId: string | null;
  }[];
  notificationsHref?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const unreadOnly = params.get("unread") === "1";

  const filtered = unreadOnly
    ? notifications.filter((n) => !n.readAt)
    : notifications;

  function setUnreadFilter(on: boolean) {
    const next = new URLSearchParams(params.toString());
    if (on) next.set("unread", "1");
    else next.delete("unread");
    router.push(`${notificationsHref}?${next.toString()}`);
  }

  if (filtered.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 text-sm">
          <Button
            size="sm"
            variant={unreadOnly ? "outline" : "default"}
            onClick={() => setUnreadFilter(false)}
          >
            Të gjitha
          </Button>
          <Button
            size="sm"
            variant={unreadOnly ? "default" : "outline"}
            onClick={() => setUnreadFilter(true)}
          >
            Të palexuara
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Nuk ka njoftime{unreadOnly ? " të palexuara" : ""}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm">
        <Button
          size="sm"
          variant={unreadOnly ? "outline" : "default"}
          onClick={() => setUnreadFilter(false)}
        >
          Të gjitha
        </Button>
        <Button
          size="sm"
          variant={unreadOnly ? "default" : "outline"}
          onClick={() => setUnreadFilter(true)}
        >
          Të palexuara
        </Button>
      </div>
      {filtered.map((n) => (
        <Card key={n.id} className={`portal-surface ${n.readAt ? "opacity-80" : "border-l-4 border-l-gov-primary"}`}>
          <CardContent className="flex items-start justify-between gap-4 px-4 py-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{n.title}</p>
                {!n.readAt && (
                  <span className="rounded bg-gov-primary/10 px-2 py-0.5 text-xs text-gov-primary">E re</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString("sq-AL")}</p>
              {(() => {
                const href = getNotificationHref(n.entityType, n.entityId, notificationsHref);
                if (!href) return null;
                return (
                  <Link href={href} className="mt-2 inline-flex text-sm text-gov-primary hover:underline">
                    Shiko detajin →
                  </Link>
                );
              })()}
            </div>
            {!n.readAt && (
              <Button size="sm" variant="outline" onClick={() => markNotificationReadAction(n.id)}>
                Shëno si lexuar
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
