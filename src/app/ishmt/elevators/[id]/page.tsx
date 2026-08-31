import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { ComplianceIndicatorBadge } from "@/components/shared/compliance-indicator-badge";
import { SectionCard } from "@/components/shared/institutional";
import { ElevatorDossierTimeline } from "@/components/elevators/elevator-dossier-timeline";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { IshmtSearchService } from "@/lib/services/ishmt-search-service";
import { ElevatorTimelineService } from "@/lib/services/elevator-timeline-service";
import { labelElevatorStatus } from "@/lib/constants/display-labels";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function IshmtElevatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!isIshmtStaffRole(session.user.roleCode)) {
    redirect("/unauthorized");
  }

  const ctx = await requireAuthForPage();
  let elevator;
  try {
    elevator = await IshmtSearchService.getElevatorDetail(ctx, id);
  } catch {
    notFound();
  }

  const timeline = await ElevatorTimelineService.buildTimeline(id);

  return (
    <AppShell title={elevator.registryNumber}>
      <StandardPageLayout
        eyebrow="IQMT · Regjistri"
        title={elevator.registryNumber}
        description={`${elevator.buildingAddress} · ${elevator.municipality.nameSq} · ${labelElevatorStatus(elevator.status)}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <ComplianceIndicatorBadge
              indicator={elevator.compliance.indicator}
              label={elevator.compliance.label}
              variant="header"
            />
            <Link
              href="/ishmt/search"
              className="text-sm text-gov-primary hover:underline"
            >
              ← Kthehu te regjistri
            </Link>
            <Link
              href={`/portal/elevators/${elevator.id}`}
              className="rounded-md bg-gov-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Hap dosjen e plotë digjitale
            </Link>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          Të dhënat bazë, teknike, certifikata, QR, dokumente dhe historiku janë në dosjen e plotë digjitale.
          Këtu shfaqet vetëm kronologjia e shqyrtimit IQMT.
        </p>

        <SectionCard
          title="Historiku"
          subtitle="Hapat e procesit sipas workflow-it, nga fillimi deri te veprimet e fundit"
          padded
        >
          <ElevatorDossierTimeline
            events={timeline}
            applicationHref={(applicationId) => `/ishmt/review/${applicationId}`}
          />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
