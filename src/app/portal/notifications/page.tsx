import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { NotificationList } from "@/components/owner/notification-list";
import { getAuthSession } from "@/lib/auth";
import { portalEyebrowForRole } from "@/lib/constants/portal-labels";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { NotificationService } from "@/lib/services/notification-service";

export default async function NotificationsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.NOTIFICATIONS_VIEW_OWN)) redirect("/unauthorized");

  const notifications = await NotificationService.listForUser(session.user.id);
  const unreadCount = await NotificationService.unreadCount(session.user.id);

  return (
    <AppShell title="Njoftimet">
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
          <NotificationList notifications={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            createdAt: n.createdAt.toISOString(),
            readAt: n.readAt?.toISOString() ?? null,
            entityType: n.entityType,
            entityId: n.entityId,
          }))} />
        </Suspense>
      </StandardPageLayout>
    </AppShell>
  );
}
