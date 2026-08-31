import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import {
  buildReporterContactPrefill,
  loadUserContactPrefill,
} from "@/lib/forms/system-form-prefill";
import { CitizenReportForm } from "@/components/public/citizen-report-form";

export const metadata = {
  title: "Raporto ashensor të par",
};

export default async function UnregisteredElevatorReportPage() {
  const session = await getAuthSession();
  const contactPrefill = session?.user
    ? buildReporterContactPrefill(
        (await loadUserContactPrefill(session.user.id)) ?? {
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          fullName: `${session.user.firstName} ${session.user.lastName}`.trim(),
          email: session.user.email ?? "",
        },
      )
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link href="/" className="text-sm font-medium text-primary">
            IQMT - Regjistri Publik i Ashensorëve
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Raporto ashensor të paregjistruar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Përdorni këtë formular kur dyshoni se një ashensor nuk është r dhe nuk ka kod QR.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <CitizenReportForm defaultReportType="COMPLAINT" contactPrefill={contactPrefill} />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/report" className="text-primary hover:underline">Kthehu te raportimi i përgjithshëm</Link>
        </p>
      </main>
    </div>
  );
}
