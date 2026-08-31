import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { MetricCard } from "@/components/shared/metric-card";
import { SectionCard } from "@/components/shared/institutional";
import type { AdminDashboardService } from "@/lib/services/admin-dashboard-service";

type Data = Awaited<ReturnType<typeof AdminDashboardService.getDashboard>>;

export function AdminDashboard({ data }: { data: Data }) {
  const { users, memberships, audit } = data.cards;

  return (
    <StandardPageLayout
      eyebrow="IQMT · Administrator i sistemit"
      title="Paneli i sistemit"
      description="Përdoruesit, audit dhe konfigurimi i sistemit"
    >
      <div className="portal-kpi-grid sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          compact
          label="Përdorues aktivë"
          value={users.value}
          accent={users.accent}
          subtitle={users.subtitle}
        />
        <MetricCard
          compact
          label="Anëtarësi"
          value={memberships.value}
          accent={memberships.accent}
          subtitle={memberships.subtitle}
        />
        <MetricCard
          compact
          label="Audit (24h)"
          value={audit.value}
          accent={audit.accent}
          subtitle={audit.subtitle}
        />
      </div>

      <SectionCard title="Menaxhimi i sistemit" subtitle="Veprimet kryesore të administratorit" padded>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/ishmt/admin/users">Përdoruesit</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/ishmt/admin/audit">Audit log</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/ishmt/admin/config">Konfigurime</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/ishmt/search">Regjistri i ashensorëve</Link>
          </Button>
        </div>
      </SectionCard>
    </StandardPageLayout>
  );
}
