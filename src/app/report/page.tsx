import Link from "next/link";
import { CitizenReportForm } from "@/components/public/citizen-report-form";

export const metadata = {
  title: "Raporto një problem - ISHMT",
};

export default async function PublicReportPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Link href="/" className="text-sm font-medium text-primary">
            ISHMT - Regjistri Publik i Ashensorëve
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Raporto një problem</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ndihmoni në sigurinë publike duke raportuar probleme sigurie, ashensorë pa kod QR ose
            ashensorë të dyshuar të paregjistruar.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <CitizenReportForm defaultQrCode={code} />
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Ky shërbim është publik dhe nuk kërkon identifikim. Të dhënat private të ashensorit nuk
          shfaqen këtu.
        </p>
      </main>
    </div>
  );
}
