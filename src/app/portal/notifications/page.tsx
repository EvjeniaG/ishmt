import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { NotificationList } from "@/components/owner/notification-list";
import { NotificationsInboxAutoRead } from "@/components/layout/notifications-inbox-auto-read";
import { getAuthSession } from "@/lib/auth";
import { portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { NotificationService } from "@/lib/services/notification-service";

export default async function NotificationsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.NOTIFICATIONS_VIEW_OWN)) redirect("/unauthorized");

  const notificationsHref = "/portal/notifications";
  const [notifications, unreadCount] = await Promise.all([
    NotificationService.listForDisplay(session.user.id, {
      roleCode: session.user.roleCode,
      notificationsHref,
    }),
    NotificationService.unreadCount(session.user.id, session.user.roleCode),
  ]);

  return (
    <AppShell title="Njoftimet">
      <NotificationsInboxAutoRead hasUnread={unreadCount > 0} />
      <StandardPageLayout
        eyebrow={portalEyebrowForRole(session.user.roleCode)}
        title="Njoftimet"
        description={
          unreadCount > 0
            ? `Aplikime, afate dhe ngjarje të lidhura me organizatën tuaj · ${unreadCount} të palexuara`
            : "Aplikime, afate dhe ngjarje të lidhura me organizatën tuaj"
        }
      >
        <Suspense fallback={<p className="text-sm text-muted-foreground">Duke ngarkuar…</p>}>
          <NotificationList
            notificationsHref={notificationsHref}
            notifications={notifications.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              createdAt: n.createdAt,
              readAt: n.readAt,
              href: n.href,
            }))}
          />
        </Suspense>
      </StandardPageLayout>
    </AppShell>
  );
}
