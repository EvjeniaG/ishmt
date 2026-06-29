import { RegisterMaintenanceForm } from "@/components/forms/register-maintenance-form";
import { getMunicipalities } from "@/lib/data/municipalities";

export default async function RegisterMaintenancePage() {
  const municipalities = await getMunicipalities();

  return (
    <main className="flex min-h-full w-full justify-center p-4">
      <div className="my-auto w-full max-w-2xl">
        <RegisterMaintenanceForm municipalities={municipalities} />
      </div>
    </main>
  );
}
