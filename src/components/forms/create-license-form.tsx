"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { createLicenseAction } from "@/lib/actions/organization-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ActiveLicenseType = "INSTALLATION" | "CERTIFICATION";

export function CreateLicenseForm({
  organizationId,
  activeLicenseTypes = [],
}: {
  organizationId: string;
  activeLicenseTypes?: ActiveLicenseType[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [licenseType, setLicenseType] = useState<ActiveLicenseType>(
    activeLicenseTypes.includes("INSTALLATION") ? "CERTIFICATION" : "INSTALLATION",
  );

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

  const canIssueInstall = !activeLicenseTypes.includes("INSTALLATION");
  const canIssueOm = !activeLicenseTypes.includes("CERTIFICATION");

  if (!canIssueInstall && !canIssueOm) {
    return (
      <p className="text-sm text-muted-foreground">
        Kompania ka licenca aktive për instalim dhe OM. Për ndryshime, revokoni ose rinovoni licencën ekzistuese.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="licenseType">Lloji i licencës</Label>
        <select
          id="licenseType"
          name="licenseType"
          className="flex h-10 w-full rounded-md border px-3 text-sm"
          value={licenseType}
          onChange={(e) => setLicenseType(e.target.value as ActiveLicenseType)}
          required
        >
          {canIssueInstall && <option value="INSTALLATION">Instalim</option>}
          {canIssueOm && <option value="CERTIFICATION">OM (kontroll periodik)</option>}
        </select>
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
        <Label htmlFor="scope">Shtrirja / fushëveprimi (opsional)</Label>
        <Input id="scope" name="scope" />
      </div>
      {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
      <Button type="submit" className="md:col-span-2">
        Gjenero licencën
      </Button>
    </form>
  );
}
