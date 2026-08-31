import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CreateCompanyForm } from "@/components/forms/create-company-form";
import { DirectoratePageShell } from "@/components/directorate/directorate-page-header";
import { DIRECTORATE_COMPANY_TABS } from "@/lib/directorate/directorate-nav";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";
import { getMunicipalities } from "@/lib/data/municipalities";

export default async function NewCompanyPage() {
  const session = await getAuthSession();
  if (!session?.user || session.user.roleCode !== ROLE_CODES.DIRECTORATE) {
    redirect("/unauthorized");
  }

  const municipalities = await getMunicipalities();

  return (
    <AppShell title="Shto kompani">
      <DirectoratePageShell
        title="Regjistro kompani të re"
        description="Zgjidhni funksionet, plotësoni të dhënat dhe sistemi gjeneron licencat automatikisht."
        tabs={DIRECTORATE_COMPANY_TABS}
      >
        <CreateCompanyForm municipalities={municipalities} />
      </DirectoratePageShell>
    </AppShell>
  );
}
