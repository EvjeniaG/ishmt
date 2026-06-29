"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLicensedCompanyAction } from "@/lib/actions/organization-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Municipality = { id: string; nameSq: string; region: { nameSq: string } };

export function CreateCompanyForm({ municipalities }: { municipalities: Municipality[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await createLicensedCompanyAction(new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push("/directorate/companies");
    router.refresh();
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Shto kompani të licencuar</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">Lloji</Label>
            <select id="type" name="type" required className="flex h-10 w-full rounded-md border px-3 text-sm">
              <option value="INSTALLER">Kompani instalimi</option>
              <option value="CERTIFIER">Kompani certifikimi / OMI</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Emri</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nipt">NIPT</Label>
            <Input id="nipt" name="nipt" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="municipalityId">Bashkia</Label>
            <select id="municipalityId" name="municipalityId" className="flex h-10 w-full rounded-md border px-3 text-sm">
              <option value="">-</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>{m.nameSq}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email kompanie</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresa</Label>
            <Input id="address" name="address" />
          </div>
          <hr />
          <p className="text-sm font-medium">Administratori i parë i organizatës (opsional)</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminFirstName">Emri</Label>
              <Input id="adminFirstName" name="adminFirstName" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminLastName">Mbiemri</Label>
              <Input id="adminLastName" name="adminLastName" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adminEmail">Email administratori</Label>
            <Input id="adminEmail" name="adminEmail" type="email" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit">Krijo kompaninë</Button>
        </form>
      </CardContent>
    </Card>
  );
}
