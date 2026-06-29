import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { CreateCompanyForm } from "@/components/forms/create-company-form";
import { DirectoratePageHeader } from "@/components/directorate/directorate-page-header";
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
      <div className="space-y-6">
        <DirectoratePageHeader
          title="Shto kompani"
          description="Regjistroni një kompani të re instaluese ose certifikuese në regjistër."
        />
        <CreateCompanyForm municipalities={municipalities} />
      </div>
    </AppShell>
  );
}
