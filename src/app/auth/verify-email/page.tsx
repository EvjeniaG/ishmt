import Link from "next/link";
import { AccountSecurityService } from "@/lib/services/account-security-service";

export const metadata = {
  title: "Verifikimi i email-it - IQMT",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-lg border bg-white p-6 text-center">
          <h1 className="text-xl font-bold">Link i pavlefshëm</h1>
          <p className="mt-2 text-sm text-muted-foreground">Mungon token-i i verifikimit.</p>
          <Link href="/auth/login" className="mt-4 inline-block text-primary hover:underline">
            Kthehu te hyrja
          </Link>
        </div>
      </div>
    );
  }

  try {
    const result = await AccountSecurityService.confirmEmailChange(token);
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-lg border bg-white p-6 text-center">
          <h1 className="text-xl font-bold text-gov-success">Email-i u verifikua</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Adresa <strong>{result.email}</strong> u konfirmua me sukses.
          </p>
          <Link href="/auth/login" className="mt-4 inline-block text-primary hover:underline">
            Hyr në sistem
          </Link>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md rounded-lg border bg-white p-6 text-center">
          <h1 className="text-xl font-bold text-destructive">Verifikimi dështoi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Linku është i pavlefshëm ose i skaduar."}
          </p>
          <Link href="/portal/profile" className="mt-4 inline-block text-primary hover:underline">
            Kthehu te profili
          </Link>
        </div>
      </div>
    );
  }
}
