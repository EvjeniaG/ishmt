import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import {
  buildReporterContactPrefill,
  loadUserContactPrefill,
} from "@/lib/forms/system-form-prefill";
import { CitizenReportForm } from "@/components/public/citizen-report-form";

export const metadata = {
  title: "Raporto një problem - IQMT",
};

export default async function PublicReportPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
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
          <h1 className="mt-1 text-2xl font-bold">Raporto një problem</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ndihmoni në sigurinë publike duke raportuar probleme sigurie, ashensorë pa kod QR ose
            ashensorë të dyshuar të paregjistruar.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <CitizenReportForm defaultQrCode={code} contactPrefill={contactPrefill} />
      </main>
    </div>
  );
}
