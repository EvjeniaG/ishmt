import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-full w-full justify-center p-4">
      <div className="my-auto w-full max-w-2xl">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          Kthehu te faqja kryesore
        </Link>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
