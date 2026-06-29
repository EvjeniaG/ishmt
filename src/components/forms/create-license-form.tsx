"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLicenseAction } from "@/lib/actions/organization-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateLicenseForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await createLicenseAction(organizationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const today = new Date().toISOString().split("T")[0];
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 2);
  const expiryDefault = nextYear.toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shto licencë</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">Numri i licencës</Label>
            <Input id="licenseNumber" name="licenseNumber" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="licenseType">Lloji</Label>
            <Input id="licenseType" name="licenseType" defaultValue="INSTALLATION" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issuedDate">Data e lëshimit</Label>
            <Input id="issuedDate" name="issuedDate" type="date" defaultValue={today} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Data e skadimit</Label>
            <Input id="expiryDate" name="expiryDate" type="date" defaultValue={expiryDefault} required />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="scope">Shtrirja / fushëveprimi</Label>
            <Input id="scope" name="scope" />
          </div>
          {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
          <Button type="submit" className="md:col-span-2">Shto licencën</Button>
        </form>
      </CardContent>
    </Card>
  );
}
