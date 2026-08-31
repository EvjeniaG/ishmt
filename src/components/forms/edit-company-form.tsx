"use client";

import { OrgStatus } from "@prisma/client";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { updateLicensedCompanyAction } from "@/lib/actions/organization-actions";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Company = {
  id: string;
  name: string;
  nipt: string | null;
  status: OrgStatus;
  email: string | null;
  phone: string | null;
  address: string | null;
  municipalityId: string | null;
};

type Municipality = { id: string; nameSq: string };

export function EditCompanyForm({
  company,
  municipalities,
}: {
  company: Company;
  municipalities: Municipality[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await updateLicensedCompanyAction(company.id, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">Emri</Label>
        <Input id="name" name="name" defaultValue={company.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nipt">NIPT</Label>
        <Input id="nipt" name="nipt" defaultValue={company.nipt ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Statusi</Label>
        <select id="status" name="status" defaultValue={company.status} className="flex h-10 w-full rounded-md border px-3 text-sm">
          {(Object.entries(ORG_STATUS_LABELS) as [OrgStatus, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Për pezullim ose revokim përdorni panelin &quot;Veprime administrative&quot;.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="municipalityId">Bashkia</Label>
        <select id="municipalityId" name="municipalityId" defaultValue={company.municipalityId ?? ""} className="flex h-10 w-full rounded-md border px-3 text-sm">
          <option value="">-</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.id}>{m.nameSq}</option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={company.email ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" name="phone" defaultValue={company.phone ?? ""} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="address">Adresa</Label>
        <Input id="address" name="address" defaultValue={company.address ?? ""} />
      </div>
      {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
      <div className="md:col-span-2">
        <Button type="submit">Ruaj ndryshimet</Button>
      </div>
    </form>
  );
}
