import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  IshmtGeoMapPageContent,
  parseGeoMapFilters,
} from "@/components/ishmt/ishmt-geo-map-page-content";
import { getAuthSession } from "@/lib/auth";
import { canApproveApplications } from "@/lib/permissions/ishmt-roles";

export default async function ChiefMapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!canApproveApplications(session.user.roleCode)) redirect("/unauthorized");

  const params = await searchParams;
  const filters = parseGeoMapFilters(params);

  return (
    <AppShell title="Harta sipas bashkive">
      <IshmtGeoMapPageContent eyebrow="IQMT · Analiza gjeografike" filters={filters} />
    </AppShell>
  );
}
