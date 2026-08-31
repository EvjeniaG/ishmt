import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { OfficialTableFooter, SectionCard } from "@/components/shared/institutional";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { getAuthSession } from "@/lib/auth";
import { BuildingService } from "@/lib/services/building-service";
import { ROLE_CODES } from "@/lib/constants/roles";
import { isIshmtStaffRole } from "@/lib/permissions/routes";
import { BackfillBuildingsButton } from "@/components/ishmt/backfill-buildings-button";

export default async function BuildingsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isIshmtStaffRole(session.user.roleCode)) {
    redirect("/unauthorized");
  }

  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const result = await BuildingService.search({ query: params.q, page });

  return (
    <AppShell title="Ndërtesat">
      <StandardPageLayout
        eyebrow="IQMT · Regjistri"
        title="Ndërtesat"
        description="Entitet ndërtese - grumbullon ashensorët sipas vendndodhjes"
        actions={session.user.roleCode === ROLE_CODES.ADMIN ? <BackfillBuildingsButton /> : undefined}
      >
        <SectionCard title="Kërko" subtitle="Filtro sipas adresës ose emrit të ndërtesës" padded>
          <form method="get" className="flex gap-2">
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Adresa ose emri i ndërtesës…"
              className="flex h-10 flex-1 rounded-md border px-3 text-sm"
            />
            <button type="submit" className="rounded-md bg-gov-primary px-4 py-2 text-sm text-white">
              Kërko
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Regjistri i ndërtesave"
          subtitle="Lista zyrtare e ndërtesave të regjistruara"
          meta={
            <span className="portal-badge-neutral tabular-nums">{result.total} ndërtesa</span>
          }
        >
          {result.items.length === 0 ? (
            <PortalEmptyState>Nuk ka ndërtesa të regjistruara.</PortalEmptyState>
          ) : (
            <>
              <PortalTableWrap>
                <thead>
                  <tr>
                    <th>Adresa</th>
                    <th>Emri</th>
                    <th>Bashkia</th>
                    <th>Ashensorë</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((b) => (
                    <tr key={b.id}>
                      <td>{b.address}</td>
                      <td>{b.name ?? "-"}</td>
                      <td>{b.municipality.nameSq}</td>
                      <td className="tabular-nums">{b._count.elevators}</td>
                      <td>
                        <Link href={`/ishmt/buildings/${b.id}`} className="portal-table-link">
                          Shiko
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </PortalTableWrap>
              <OfficialTableFooter total={result.total} label="ndërtesa" />
            </>
          )}
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
