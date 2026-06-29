"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { registerOwnerAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Municipality = { id: string; nameSq: string; region: { nameSq: string } };

export function RegisterOwnerForm({ municipalities }: { municipalities: Municipality[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await registerOwnerAction(new FormData(e.currentTarget));
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push("/auth/login?registered=owner");
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Ju lutemi, plotësoni të dhënat tuaja personale</CardTitle>
        <CardDescription>
          Emri juaj i përdoruesit do të jetë Numri juaj Personal, dhe fjalëkalimi do të jetë ai që
          vendosni në këtë formë.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="personalNumber">Numri Personal *</Label>
              <Input id="personalNumber" name="personalNumber" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idCardNumber">Numri i Kartës së Identitetit *</Label>
              <Input id="idCardNumber" name="idCardNumber" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Emri *</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fatherName">Atësia *</Label>
              <Input id="fatherName" name="fatherName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Mbiemri *</Label>
              <Input id="lastName" name="lastName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="motherName">Mëmësia *</Label>
              <Input id="motherName" name="motherName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data e Lindjes *</Label>
              <Input id="birthDate" name="birthDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipalityId">Zyra Tatimore / Bashkia *</Label>
              <select
                id="municipalityId"
                name="municipalityId"
                required
                className="flex h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="">Zgjidhni</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nameSq} ({m.region.nameSq})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Adresa e Postës Elektronike (e-mail) *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Numri i Telefonit</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nipt">NIPT (për person juridik)</Label>
              <Input id="nipt" name="nipt" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organizationName">Emri i organizatës / ndërtesës</Label>
              <Input id="organizationName" name="organizationName" placeholder="Opsionale" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              Fjalëkalimi duhet të plotësojë kushtet më poshtë:
            </p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5">
              <li>Duhet të jetë të paktën 8 karaktere i gjatë.</li>
              <li>Duhet të përmbajë të paktën një numër.</li>
              <li>Duhet të përmbajë të paktën një gërmë kapitale dhe një jo-kapitale.</li>
            </ol>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="acceptTerms" value="true" required className="mt-1" />
            E lexova dhe bie dakord me termat dhe kushtet
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between">
            <Link href="/auth/login" className="text-sm text-primary hover:underline">
              Kthehu Prapa
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Duke u regjistruar..." : "Regjistrohu"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
