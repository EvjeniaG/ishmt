"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { acceptInvitationAction } from "@/lib/actions/invitation-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function AcceptInvitationForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("token", token);
    const result = await acceptInvitationAction(formData);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (!token) {
    return <p className="text-sm text-red-600">Lidhja e ftesës është e pavlefshme.</p>;
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">Ftesa u pranua me sukses.</p>
        <Button asChild>
          <Link href="/auth/login">Hyni në sistem</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Për përdorues të rinj, vendosni fjalëkalimin për llogarinë tuaj.
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">Fjalëkalimi</Label>
        <Input id="password" name="password" type="password" required minLength={12} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">Prano ftesën</Button>
    </form>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Pranimi i ftesës</CardTitle>
          <CardDescription>Bashkohuni me organizatën tuaj në Regjistrin IQMT</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-sm">Duke ngarkuar...</p>}>
            <AcceptInvitationForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
