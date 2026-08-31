import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SubmitNiptForm } from "@/components/forms/submit-nipt-form";
import { SectionCard } from "@/components/shared/institutional";
import { Button } from "@/components/ui/button";
import { requireServiceCapabilityForPage } from "@/lib/auth/page-guards";
import { OrganizationService } from "@/lib/services/organization-service";
import { QkbValidationService } from "@/lib/services/qkb-validation-service";

export default async function QkbSettingsPage() {
  const ctx = await requireServiceCapabilityForPage("maintenance");
  const org = await OrganizationService.getById(ctx.activeOrgId);
  if (!org) redirect("/portal/dashboard");

  const validations = await QkbValidationService.getForOrganization(org.id);

  return (
    <AppShell title="Validimi QKB">
      <StandardPageLayout
        eyebrow="Portali · Mirëmbajtje"
        title="Validimi QKB"
        description="Statusi i validimit të organizatës në QKB"
        actions={
          <Button variant="outline" asChild>
            <Link href="/portal/settings/organization">← Organizata</Link>
          </Button>
        }
      >
        <SectionCard title="Statusi i validimit QKB" padded>
          <div className="text-sm">
            <p>Statusi i organizatës: <strong>{org.status}</strong></p>
            <p>QKB e validuar: <strong>{org.qkbValidated ? "Po" : "Jo"}</strong></p>
            {org.qkbValidatedAt && (
              <p>Data e validimit: {org.qkbValidatedAt.toLocaleString("sq-AL")}</p>
            )}
          </div>
        </SectionCard>

        {!org.qkbValidated && <SubmitNiptForm currentNipt={org.nipt} />}

        {validations.length > 0 && (
          <SectionCard title="Historiku i kërkesave" padded>
            <ul className="space-y-2 text-sm">
              {validations.map((v) => (
                <li key={v.id} className="rounded border p-2">
                  NIPT: {v.nipt} - Statusi: {v.status} -{" "}
                  {v.createdAt.toLocaleString("sq-AL")}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}
      </StandardPageLayout>
    </AppShell>
  );
}
