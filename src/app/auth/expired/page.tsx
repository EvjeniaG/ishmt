"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function SessionExpiredPage() {
  useEffect(() => {
    void signOut({ callbackUrl: "/auth/login" });
  }, []);

  return (
    <main className="flex min-h-full w-full justify-center p-4">
      <div className="my-auto max-w-md text-center">
        <h1 className="text-xl font-semibold">Sesioni juaj ka skaduar</h1>
        <p className="mt-2 text-muted-foreground">
          Po ju ridrejtojmë te faqja e hyrjes për t&apos;u identifikuar përsëri…
        </p>
      </div>
    </main>
  );
}
