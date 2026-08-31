import { RegisterAccountForm } from "@/components/forms/register-account-form";
import type { RegisterDemoCompanyMode } from "@/lib/demo/register-demo-prefill-service";
import type { RegisterDemoOwnerMode } from "@/lib/demo/register-demo-modes";

type Level = "OWNER" | "COMPANY";

function resolveRegisterInitial(searchLevel?: string): {
  level: Level;
  demoCompanyMode: RegisterDemoCompanyMode;
  demoOwnerMode?: RegisterDemoOwnerMode;
} {
  const normalized = searchLevel?.toLowerCase();

  if (normalized === "administrator" || normalized === "owner") {
    return { level: "OWNER", demoCompanyMode: "install", demoOwnerMode: "administrator" };
  }
  if (normalized === "construction" || normalized === "construction_company") {
    return { level: "OWNER", demoCompanyMode: "install", demoOwnerMode: "construction" };
  }

  if (
    normalized === "install-om" ||
    normalized === "install_om" ||
    normalized === "dual" ||
    normalized === "installom"
  ) {
    return { level: "COMPANY", demoCompanyMode: "installOm" };
  }

  if (
    normalized === "company" ||
    normalized === "installer" ||
    normalized === "certifier" ||
    normalized === "om" ||
    normalized === "maintenance"
  ) {
    if (normalized === "certifier" || normalized === "om") {
      return { level: "COMPANY", demoCompanyMode: "om" };
    }
    if (normalized === "maintenance") {
      return { level: "COMPANY", demoCompanyMode: "maintenance" };
    }
    return { level: "COMPANY", demoCompanyMode: "install" };
  }

  return { level: "OWNER", demoCompanyMode: "install" };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level } = await searchParams;
  const initial = resolveRegisterInitial(level);

  return (
    <main className="flex min-h-full w-full justify-center p-4">
      <div className="my-auto w-full max-w-2xl">
        <RegisterAccountForm
          initialLevel={initial.level}
          initialDemoCompanyMode={initial.demoCompanyMode}
          initialDemoOwnerMode={initial.demoOwnerMode}
        />
      </div>
    </main>
  );
}
