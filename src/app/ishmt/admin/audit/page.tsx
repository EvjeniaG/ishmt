import Link from "next/link";
import { redirect } from "next/navigation";
import { AuditAction } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { OfficialTableFooter, SectionCard } from "@/components/shared/institutional";
import { PortalTableWrap } from "@/components/shared/portal-table";
import { getAuthSession } from "@/lib/auth";
import { requireAuditSystemAccess } from "@/lib/actions/ishmt-admin-actions";
import { AuditQueryService } from "@/lib/services/audit-query-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function AuditViewerPage({
  searchParams,
}: {
  searchParams: Promise<{
    entityType?: string;
    action?: string;
    page?: string;
  }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.ADMIN) redirect("/unauthorized");

  await requireAuditSystemAccess();
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10) || 1;
  const entityTypes = await AuditQueryService.getDistinctEntityTypes();

  const result = await AuditQueryService.list({
    entityType: params.entityType,
    action: params.action as AuditAction | undefined,
    page,
    pageSize: 50,
  });

  return (
    <AppShell title="Audit Log">
      <StandardPageLayout
        eyebrow="IQMT · Administrim"
        title="Audit Log - Sistemi"
        description="Gjurmë e plotë e veprimeve në regjistër"
      >
        <SectionCard title="Filtro" subtitle="Kufizo regjistrat sipas entitetit ose veprimit" padded>
          <form method="get" className="flex flex-wrap gap-3">
            <select name="entityType" defaultValue={params.entityType ?? ""} className="flex h-10 rounded-md border px-3 text-sm">
              <option value="">Të gjitha entitetet</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select name="action" defaultValue={params.action ?? ""} className="flex h-10 rounded-md border px-3 text-sm">
              <option value="">Të gjitha veprimet</option>
              {Object.values(AuditAction).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button type="submit" className="rounded-md bg-gov-primary px-4 py-2 text-sm text-white">
              Filtro
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Regjistri i auditimit"
          subtitle="Veprimet e regjistruara në sistem"
          meta={
            <span className="portal-badge-neutral tabular-nums">{result.total} regjistrime</span>
          }
        >
          <PortalTableWrap>
            <thead>
              <tr>
                <th>Koha</th>
                <th>Veprimi</th>
                <th>Entiteti</th>
                <th>Aktori</th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap">{log.createdAt.toLocaleString("sq-AL")}</td>
                  <td>{log.action}</td>
                  <td>{log.entityType} / {log.entityId.slice(0, 8)}…</td>
                  <td>
                    {log.actor
                      ? `${log.actor.firstName} ${log.actor.lastName}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </PortalTableWrap>
          {result.total > result.pageSize && (
            <div className="mt-4 flex gap-4 px-5 sm:px-6">
              {page > 1 && (
                <Link
                  href={`/ishmt/admin/audit?${new URLSearchParams({
                    ...(params.entityType ? { entityType: params.entityType } : {}),
                    ...(params.action ? { action: params.action } : {}),
                    page: String(page - 1),
                  }).toString()}`}
                  className="text-sm text-gov-primary hover:underline"
                >
                  ← Mëparshme
                </Link>
              )}
              {page * result.pageSize < result.total && (
                <Link
                  href={`/ishmt/admin/audit?${new URLSearchParams({
                    ...(params.entityType ? { entityType: params.entityType } : {}),
                    ...(params.action ? { action: params.action } : {}),
                    page: String(page + 1),
                  }).toString()}`}
                  className="text-sm text-gov-primary hover:underline"
                >
                  Tjetër →
                </Link>
              )}
            </div>
          )}
          <OfficialTableFooter total={result.total} />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
