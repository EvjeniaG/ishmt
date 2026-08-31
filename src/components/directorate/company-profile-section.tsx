"use client";

import { OrgStatus } from "@prisma/client";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useMemo, useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { updateLicensedCompanyAction } from "@/lib/actions/organization-actions";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";
import { DataSheet } from "@/components/shared/institutional";
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
  municipality?: { nameSq: string } | null;
};

type Municipality = { id: string; nameSq: string };

export function CompanyProfileSection({
  company,
  municipalities,
}: {
  company: Company;
  municipalities: Municipality[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const municipalityName =
    company.municipality?.nameSq ??
    municipalities.find((m) => m.id === company.municipalityId)?.nameSq ??
    "-";

  const snapshot = useMemo(
    () => ({
      name: company.name,
      nipt: company.nipt ?? "",
      email: company.email ?? "",
      phone: company.phone ?? "",
      address: company.address ?? "",
      municipalityId: company.municipalityId ?? "",
    }),
    [company],
  );

  const [values, setValues] = useState(snapshot);

  useEffect(() => {
    if (!editing) setValues(snapshot);
  }, [snapshot, editing]);

  function cancelEdit() {
    setValues(snapshot);
    setEditing(false);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("status", company.status);
    const result = await updateLicensedCompanyAction(company.id, fd);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <DataSheet
          columns={2}
          items={[
            { label: "Emri", value: company.name },
            { label: "NIPT", value: company.nipt ?? "-", mono: true },
            { label: "Statusi", value: ORG_STATUS_LABELS[company.status] ?? company.status },
            { label: "Bashkia", value: municipalityName },
            { label: "Email", value: company.email ?? "-" },
            { label: "Telefon", value: company.phone ?? "-" },
            { label: "Adresa", value: company.address ?? "-" },
          ]}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Ndrysho të dhënat kontaktuese
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Ndryshoni vetëm të dhënat kontaktuese. Statusi dhe licencat menaxhohen veçmas.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Emri</Label>
          <Input
            id="name"
            name="name"
            value={values.name}
            onChange={(e) => setValues((current) => ({ ...current, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nipt">NIPT</Label>
          <Input
            id="nipt"
            name="nipt"
            value={values.nipt}
            onChange={(e) => setValues((current) => ({ ...current, nipt: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="municipalityId">Bashkia</Label>
          <select
            id="municipalityId"
            name="municipalityId"
            className="flex h-10 w-full rounded-md border px-3 text-sm"
            value={values.municipalityId}
            onChange={(e) => setValues((current) => ({ ...current, municipalityId: e.target.value }))}
          >
            <option value="">-</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>{m.nameSq}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={(e) => setValues((current) => ({ ...current, email: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            name="phone"
            value={values.phone}
            onChange={(e) => setValues((current) => ({ ...current, phone: e.target.value }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Adresa</Label>
          <Input
            id="address"
            name="address"
            value={values.address}
            onChange={(e) => setValues((current) => ({ ...current, address: e.target.value }))}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Duke ruajtur…" : "Ruaj ndryshimet"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={cancelEdit}>
          Anulo
        </Button>
      </div>
    </form>
  );
}
