import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { NotificationList } from "@/components/owner/notification-list";
import { getAuthSession } from "@/lib/auth";
import { NotificationService } from "@/lib/services/notification-service";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function IshmtNotificationsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isIshmtStaffRole(session.user.roleCode)) {
    redirect("/unauthorized");
  }

  const notifications = await NotificationService.listForUser(session.user.id);

  return (
    <AppShell title="Njoftimet">
      <StandardPageLayout
        eyebrow="ISHMT · Komunikime"
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
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
