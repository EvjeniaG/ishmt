"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { assignInstallerAction } from "@/lib/actions/application-actions";
import { assignCertifierAction, updateBasicApplicationDataAction } from "@/lib/actions/owner-actions";
import { RegistrationSelect, RegistrationStepActions } from "@/components/registration/registration-wizard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BUILDING_TYPES = [
  { value: "CO_OWNERSHIP_BUILDING", label: "Ndërtesë në bashkëpronësi" },
  { value: "WORKPLACE", label: "Vend pune" },
  { value: "RESIDENTIAL", label: "Mjedise shtëpiake" },
  { value: "PUBLIC_BUILDING", label: "Ndërtesë publike" },
  { value: "SHOPPING_CENTER", label: "Qendër tregtare" },
  { value: "OTHER", label: "Tjetër" },
];

const USAGE_PURPOSES = [
  { value: "ELECTRIC_PASSENGER", label: "Transport njerëzish - elektrik" },
  { value: "HYDRAULIC_PASSENGER", label: "Transport njerëzish - hidraulik" },
  { value: "PASSENGER_AND_FREIGHT", label: "Transport njerëzish dhe mallrash" },
  { value: "PASSENGER_AND_BED", label: "Transport njerëzish dhe shtrat" },
  { value: "PASSENGER_AND_MOTOR_DEVICE", label: "Transport njerëzish dhe pajisje motorike" },
  { value: "OTHER", label: "Tjetër" },
];

export function OwnerBasicDataForm({
  applicationId,
  municipalities,
  defaults,
}: {
  applicationId: string;
  municipalities: { id: string; nameSq: string }[];
  defaults?: Record<string, string | null | undefined>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await updateBasicApplicationDataAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="space-y-1"><Label>Emri i godinës</Label><Input name="buildingName" defaultValue={defaults?.buildingName ?? ""} /></div>
      <div className="space-y-1"><Label>Adresa e plotë e godinës *</Label><textarea name="buildingAddress" required defaultValue={defaults?.buildingAddress ?? ""} className="min-h-20 w-full rounded-md border px-3 py-2 text-sm" /></div>
      <div className="space-y-1">
        <Label>Bashkia *</Label>
        <select name="municipalityId" required defaultValue={defaults?.municipalityId ?? ""} className="flex h-10 w-full rounded-md border px-3 text-sm">
          <option value="">Zgjidhni</option>
          {municipalities.map((m) => <option key={m.id} value={m.id}>{m.nameSq}</option>)}
        </select>
      </div>
      <div className="space-y-1"><Label>Hyrja</Label><Input name="entrance" defaultValue={defaults?.entrance ?? ""} /></div>
      <div className="space-y-1"><Label>Pozicioni / kati</Label><Input name="floorLocation" defaultValue={defaults?.floorLocation ?? ""} /></div>
      <div className="space-y-1">
        <Label>Tipi i godinës *</Label>
        <select name="buildingType" required defaultValue={defaults?.buildingType ?? ""} className="flex h-10 w-full rounded-md border px-3 text-sm">
          <option value="">Zgjidhni</option>
          {BUILDING_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Qëllimi i përdorimit *</Label>
        <select name="usagePurpose" required defaultValue={defaults?.usagePurpose ?? ""} className="flex h-10 w-full rounded-md border px-3 text-sm">
          <option value="">Zgjidhni</option>
          {USAGE_PURPOSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="space-y-1"><Label>Personi / subjekti përgjegjës *</Label><Input name="responsibleEntityName" required defaultValue={defaults?.responsibleEntityName ?? ""} /></div>
      <div className="space-y-1"><Label>NIPT / NID i përgjegjësit *</Label><Input name="responsibleEntityIdentifier" required defaultValue={defaults?.responsibleEntityIdentifier ?? ""} /></div>
      <div className="space-y-1"><Label>Email kontakti *</Label><Input name="responsibleEntityEmail" type="email" required defaultValue={defaults?.responsibleEntityEmail ?? ""} /></div>
      <div className="space-y-1"><Label>Telefon kontakti *</Label><Input name="responsibleEntityPhone" required defaultValue={defaults?.responsibleEntityPhone ?? ""} /></div>
      <div className="space-y-1"><Label>Shënime</Label><textarea name="notes" defaultValue={defaults?.notes ?? ""} className="min-h-16 w-full rounded-md border px-3 py-2 text-sm" /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">Ruaj të dhënat bazë</Button>
    </form>
  );
}

export function AssignCertifierForm({
  applicationId,
  certifiers,
}: {
  applicationId: string;
  certifiers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await assignCertifierAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader><CardTitle>Cakto kompaninë certifikuese / OMI</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          <select name="certifierOrgId" required className="flex h-10 w-full rounded-md border px-3 text-sm">
            <option value="">Zgjidhni</option>
            {certifiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit">Dërgo ftesë tek kompania certifikuese</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function AssignCertifierFormWrapper({
  applicationId,
  certifiers,
}: {
  applicationId: string;
  certifiers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await assignCertifierAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Kompania certifikuese (OMI) *</Label>
        <RegistrationSelect name="certifierOrgId" required defaultValue="">
          <option value="">Zgjidhni nga lista</option>
          {certifiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </RegistrationSelect>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <RegistrationStepActions hint="Pas dërgimit, certifikuesi merr njoftim për të plotësuar certifikimin.">
        <Button type="submit" className="rounded-lg bg-gov-primary hover:bg-gov-secondary">
          Dërgo ftesën →
        </Button>
      </RegistrationStepActions>
    </form>
  );
}

export function AssignInstallerFormWrapper({
  applicationId,
  installers,
}: {
  applicationId: string;
  installers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await assignInstallerAction(applicationId, new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Kompania instaluese *</Label>
        <RegistrationSelect name="installerOrgId" required defaultValue="">
          <option value="">Zgjidhni nga lista</option>
          {installers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </RegistrationSelect>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <RegistrationStepActions hint="Instaluesi plotëson të dhënat teknike pasi të pranojë ftesën.">
        <Button type="submit" className="rounded-lg bg-gov-primary hover:bg-gov-secondary">
          Dërgo ftesën →
        </Button>
      </RegistrationStepActions>
    </form>
  );
}
