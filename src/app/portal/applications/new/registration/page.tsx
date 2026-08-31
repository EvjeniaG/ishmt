import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { createApplicationAction } from "@/lib/actions/application-actions";
import { getAuthSession } from "@/lib/auth";
import { OWNER_TERM } from "@/lib/constants/owner-labels";
import { PERMISSIONS } from "@/lib/permissions/codes";
import { roleHasPermission } from "@/lib/permissions/matrix";
import { Button } from "@/components/ui/button";

const STEPS = [
  "Të dhënat e aplikimit",
  "Zgjidhni instaluesin",
  "Të dhënat teknike (instaluesi)",
  "Zgjidhni certifikuesin",
  "Certifikimi (OM)",
  "Parashtrimi te IQMT",
];

async function startRegistration() {
  "use server";
  const result = await createApplicationAction();
  if (!result.success) redirect("/portal/applications");
  redirect(`/portal/applications/${result.applicationId}`);
}

export default async function NewRegistrationPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (!roleHasPermission(session.user.roleCode, PERMISSIONS.APPLICATIONS_CREATE)) redirect("/unauthorized");

  return (
    <AppShell title="Regjistrim i ri ashensori">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="reg-wizard-panel">
          <div className="reg-wizard-stepper-head">
            <h1 className="reg-wizard-stepper-title">Regjistrim i ri ashensori</h1>
            <p className="reg-wizard-stepper-desc">
              Si <strong className="font-medium text-foreground">{OWNER_TERM}</strong>, plotësoni 6 hapa të thjeshtë.
              Ashensori regjistrohet në regjistër vetëm pas miratimit nga IQMT.
            </p>
          </div>
          <div className="reg-wizard-body">
            <ol className="space-y-2">
              {STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gov-primary/10 text-xs font-bold text-gov-primary">
                    {i + 1}
                  </span>
                  <span className="text-foreground">{label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <form action={startRegistration} className="flex flex-wrap gap-3">
          <Button type="submit" className="rounded-lg bg-gov-primary hover:bg-gov-secondary">
            Fillo aplikimin
          </Button>
          <Button asChild variant="outline" className="rounded-lg">
            <Link href="/portal/applications">Kthehu</Link>
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
