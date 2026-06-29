import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { getAuthSession } from "@/lib/auth";
import { OwnerPortalService } from "@/lib/services/owner-portal-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function PortalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.OWNER) redirect("/unauthorized");

  const { q = "" } = await searchParams;
  const results = q ? await OwnerPortalService.globalSearch(session.user.activeOrgId, q) : null;

  return (
    <AppShell title="Kërkim global">
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Kërkim global"
        description={q ? `Rezultate për «${q}»` : "Shkruani një term kërkimi në header"}
      >
        {results && (
          <>
            <SectionCard title={`Ashensorë (${results.elevators.length})`} padded>
              {results.elevators.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nuk u gjet ashensor.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {results.elevators.map((elv) => (
                    <div key={elv.id} className="rounded border p-3">
                      <Link href={`/portal/elevators/${elv.id}`} className="font-medium text-gov-primary hover:underline">
                        {elv.registryNumber}
                      </Link>
                      <p>{elv.buildingAddress} · {elv.municipality.nameSq}</p>
                      <p className="text-muted-foreground">Serial: {elv.technicalData?.serialNumber ?? "-"}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title={`Aplikime (${results.applications.length})`} padded>
              {results.applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nuk u gjet aplikim.</p>
              ) : (
                <div className="space-y-2 text-sm">
                  {results.applications.map((app) => (
                    <div key={app.id} className="rounded border p-3">
                      <Link href={`/portal/applications/${app.id}`} className="font-medium text-gov-primary hover:underline">
                        {app.applicationNumber}
                      </Link>
                      <p>{app.data?.buildingAddress ?? "-"}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}
      </StandardPageLayout>
    </AppShell>
  );
}
