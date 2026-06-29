import { RegisterAccountForm } from "@/components/forms/register-account-form";
import { getMunicipalities } from "@/lib/data/municipalities";

type Level = "OWNER" | "INSTALLER" | "CERTIFIER" | "MAINTENANCE";

const VALID_LEVELS: Level[] = ["OWNER", "INSTALLER", "CERTIFIER", "MAINTENANCE"];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const { level } = await searchParams;
  const municipalities = await getMunicipalities();
  const initialLevel = VALID_LEVELS.includes(level as Level) ? (level as Level) : "OWNER";

  return (
    <main className="flex min-h-full w-full justify-center p-4">
      <div className="my-auto w-full max-w-2xl">
        <RegisterAccountForm municipalities={municipalities} initialLevel={initialLevel} />
      </div>
    </main>
  );
}
