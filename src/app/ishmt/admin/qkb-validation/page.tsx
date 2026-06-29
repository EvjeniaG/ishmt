import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState } from "@/components/shared/portal-table";
import { QkbValidationActions } from "@/components/forms/qkb-validation-actions";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";
import { QkbValidationService } from "@/lib/services/qkb-validation-service";

export default async function QkbValidationPage() {
  const session = await getAuthSession();
  if (!session?.user || session.user.roleCode !== ROLE_CODES.ADMIN) {
    redirect("/unauthorized");
  }

  const pending = await QkbValidationService.listPending();

  return (
    <AppShell title="Validimi manual QKB">
      <StandardPageLayout
        eyebrow="ISHMT · Administrim"
        title="Radha e validimit QKB"
        description="Verifikoni manualisht NIPT-in e kompanive të mirëmbajtjes (Faza 1 - pa integrim API)"
      >
        {pending.length === 0 ? (
          <SectionCard title="Kërkesat në pritje" subtitle="Validimi manual i NIPT-it" padded>
            <PortalEmptyState>Nuk ka kërkesa në pritje.</PortalEmptyState>
          </SectionCard>
        ) : (
          pending.map((item) => (
            <SectionCard
              key={item.id}
              title={item.organization.name}
              subtitle={`NIPT: ${item.nipt}`}
              meta={
                <span className="text-xs text-muted-foreground">
                  {item.createdAt.toLocaleString("sq-AL")}
                </span>
              }
              padded
            >
              <div className="space-y-3 text-sm">
                <p>Bashkia: {item.organization.municipality?.nameSq ?? "-"}</p>
                <p>
                  Parashtruar nga: {item.initiatedBy.firstName} {item.initiatedBy.lastName} (
                  {item.initiatedBy.email})
                </p>
                <QkbValidationActions validationId={item.id} />
              </div>
            </SectionCard>
          ))
        )}
      </StandardPageLayout>
    </AppShell>
  );
}
