import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { SectionCard } from "@/components/shared/institutional";
import { SystemConfigEditor } from "@/components/ishmt/system-config-editor";
import { getAuthSession } from "@/lib/auth";
import { SystemConfigService } from "@/lib/services/system-config-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function SystemConfigPage() {
  const session = await getAuthSession();
  if (!session?.user || session.user.roleCode !== ROLE_CODES.ADMIN) {
    redirect("/unauthorized");
  }

  const configs = await SystemConfigService.getAll();

  return (
    <AppShell title="Konfigurimi i sistemit">
      <StandardPageLayout
        eyebrow="IQMT · Administrim"
        title="Konfigurimi i sistemit"
        description="Formate numrash, rregulla përputhshmërie, sesion dhe siguri"
      >
        <SectionCard
          title="Parametrat"
          subtitle="Konfigurimet operative të regjistrit digjital"
          padded
        >
          <SystemConfigEditor configs={configs} />
        </SectionCard>
      </StandardPageLayout>
    </AppShell>
  );
}
