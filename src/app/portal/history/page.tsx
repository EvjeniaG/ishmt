import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { PortalEmptyState, PortalList, PortalListItem } from "@/components/shared/portal-table";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function OwnerHistoryPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.OWNER) redirect("/unauthorized");

  const logs = await OwnerPortalService.listHistory(session.user.activeOrgId);

  return (
    <AppShell>
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Historiku"
        description="Regjistri i aktiviteteve në llogarinë tuaj"
      >
        <SectionCard
          title="Aktivitete"
          meta={
            <span className="portal-badge-neutral tabular-nums">{logs.length} regjistrime</span>
          }
          padded
        >
          {logs.length === 0 ? (
            <PortalEmptyState>Nuk ka aktivitete të regjistruara.</PortalEmptyState>
          ) : (
            <PortalList>
              {logs.map((log) => (
                <PortalListItem key={log.id}>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-gov-primary">{log.action}</p>
                    <p className="text-muted-foreground">
                      {log.entityType} · {log.entityId.slice(0, 8)}…
                    </p>
                    {log.actor && (
                      <p className="text-xs text-muted-foreground">
                        {log.actor.firstName} {log.actor.lastName}
                      </p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("sq-AL")}
                  </time>
                </PortalListItem>
              ))}
            </PortalList>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
