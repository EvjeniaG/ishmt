"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import Link from "next/link";
import { registerMaintenanceAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Municipality = { id: string; nameSq: string; region: { nameSq: string } };

export function RegisterMaintenanceForm({ municipalities }: { municipalities: Municipality[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await registerMaintenanceAction(new FormData(e.currentTarget));
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push("/auth/login?registered=maintenance");
  }

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Regjistrim kompanie mirëmbajtjeje</CardTitle>
        <CardDescription>
          Kompania do të mbetet në pritje derisa IQMT të verifikojë NIPT-in në QKB
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Emri</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Mbiemri</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationName">Emri i kompanisë</Label>
            <Input id="organizationName" name="organizationName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nipt">NIPT</Label>
            <Input id="nipt" name="nipt" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="municipalityId">Bashkia</Label>
            <select id="municipalityId" name="municipalityId" required className="flex h-10 w-full rounded-md border px-3 text-sm">
              <option value="">Zgjidhni bashkinë</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameSq} ({m.region.nameSq})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Fjalëkalimi</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Konfirmo fjalëkalimin</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Duke u regjistruar..." : "Regjistrohu"}</Button>
          <p className="text-center text-sm">
            <Link href="/auth/login" className="text-primary hover:underline">Kthehu te hyrja</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
