import Link from "next/link";
import { redirect } from "next/navigation";
import { ApplicationType } from "@prisma/client";
import { ApplicationTypeGuide } from "@/components/applications/application-type-guide";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { Button } from "@/components/ui/button";
import { APPLICATION_TYPE_GUIDE, type ApplicationGuideKey } from "@/lib/constants/application-type-guide";
import { getAuthSession } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";

const HUB_ITEMS: { href: string; guideKey: ApplicationGuideKey }[] = [
  { href: "/portal/applications/new/registration", guideKey: ApplicationType.NEW_REGISTRATION },
  { href: "/portal/applications/new/correction", guideKey: ApplicationType.DATA_CORRECTION },
  { href: "/portal/applications/new/update", guideKey: ApplicationType.DATA_UPDATE },
  { href: "/portal/applications/new/ownership-transfer", guideKey: "OWNERSHIP_TRANSFER" },
  { href: "/portal/applications/new/deregistration", guideKey: ApplicationType.DEREGISTRATION },
  { href: "/portal/applications/new/modernization", guideKey: ApplicationType.MODERNIZATION },
];

export default async function NewApplicationPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_CREATE)) redirect("/unauthorized");

  return (
    <AppShell title="Aplikim i ri">
      <StandardPageLayout
        eyebrow="Portali · Personi përgjegjës i ashensorit"
        title="Zgjidhni llojin e aplikimit"
        description="Zgjidhni procedurën që përputhet me ndryshimin që dëshironi të parashtroni"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {HUB_ITEMS.map(({ href, guideKey }) => {
            const guide = APPLICATION_TYPE_GUIDE[guideKey];
            return (
              <SectionCard key={href} title={guide.title} subtitle={guide.tagline} padded>
                <div className="space-y-4">
                  <ApplicationTypeGuide guideKey={guideKey} compact />
                  <p className="text-xs text-muted-foreground">
                    <strong>Miratimi:</strong> {guide.approvers}
                  </p>
                  <Button asChild>
                    <Link href={href}>Fillo - {guide.shortTitle}</Link>
                  </Button>
                </div>
              </SectionCard>
            );
          })}
        </div>
      </StandardPageLayout>
    </AppShell>
  );
}
