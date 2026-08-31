import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { NotificationList } from "@/components/owner/notification-list";
import { NotificationsInboxAutoRead } from "@/components/layout/notifications-inbox-auto-read";
import { getAuthSession } from "@/lib/auth";
import { NotificationService } from "@/lib/services/notification-service";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function IshmtNotificationsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isIshmtStaffRole(session.user.roleCode)) {
    redirect("/unauthorized");
  }

  const notificationsHref = "/ishmt/notifications";
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
        eyebrow="IQMT · Komunikime"
        title="Njoftimet"
        description="Njoftimet dhe alarmet e sistemit të adresuara për ju."
      >
        <SectionCard
          title="Kutia e njoftimeve"
          subtitle="Mesazhet e fundit nga regjistri digjital"
          meta={
            <span className="portal-badge-neutral tabular-nums">{notifications.length} njoftime</span>
          }
          padded
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
            }))} />
          </Suspense>
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
