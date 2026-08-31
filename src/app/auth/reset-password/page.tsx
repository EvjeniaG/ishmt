"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@/lib/navigation/use-app-router";
import { Suspense, useState } from "react";
import Link from "next/link";
import { resetPasswordAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("token", token);
    const result = await resetPasswordAction(formData);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push("/auth/login?reset=success");
  }

  if (!token) {
    return <p className="text-destructive">Token i munguar ose i pavlefshëm.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Fjalëkalimi i ri</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Konfirmo fjalëkalimin</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full">Rivendos</Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Fjalëkalim i ri</CardTitle>
          <CardDescription>Vendosni fjalëkalimin e ri</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <ResetPasswordForm />
          </Suspense>
          <p className="mt-4 text-center text-sm">
            <Link href="/auth/login" className="text-primary hover:underline">Kthehu te hyrja</Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
