"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDeregistrationApplicationAction, createModernizationApplicationAction, createOwnershipTransferApplicationAction, createTypedApplicationAction } from "@/lib/actions/owner-actions";
import { ApplicationType, ModernizationType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MODERNIZATION_TYPE_LABELS } from "@/lib/constants/lifecycle-labels";

export function DeregistrationApplicationForm({
  elevators,
}: {
  elevators: { id: string; registryNumber: string; address: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await createDeregistrationApplicationAction(new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/portal/applications/${result.applicationId}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-lg gap-3">
      <div className="space-y-1">
        <Label>Ashensori *</Label>
        <select name="elevatorId" required className="flex h-10 w-full rounded-md border px-3 text-sm">
          <option value="">Zgjidhni</option>
          {elevators.map((e) => <option key={e.id} value={e.id}>{e.registryNumber} - {e.address}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Arsyeja *</Label>
        <select name="deregistrationReasonType" required className="flex h-10 w-full rounded-md border px-3 text-sm">
          <option value="PERMANENTLY_DISMANTLED">Ashensori është çmontuar përfundimisht</option>
          <option value="REPLACED_BY_NEW_UNIT">Ashensori zëvendësohet me një njësi tjetër</option>
          <option value="STRUCTURAL_CHANGES">Ndryshime strukturore në objekt</option>
          <option value="OTHER">Tjetër</option>
        </select>
      </div>
      <div className="space-y-1"><Label>Shpjegim i detajuar *</Label><textarea name="deregistrationReason" required placeholder="Përshkruani situatën dhe arsyen e çregjistrimit" className="min-h-20 w-full rounded-md border px-3 py-2 text-sm" /></div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirmed" value="true" required className="mt-1" />
        Konfirmoj se informacioni i paraqitur është i saktë dhe mbaj përgjegjësi për këtë kërkesë.
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">Krijo aplikimin e çregjistrimit</Button>
    </form>
  );
}

export function ModernizationApplicationForm({
  elevators,
}: {
  elevators: { id: string; registryNumber: string; address: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await createModernizationApplicationAction(new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/portal/applications/${result.applicationId}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-lg gap-3">
      <div className="space-y-1">
        <Label>Ashensori *</Label>
        <select name="elevatorId" required className="flex h-10 w-full rounded-md border px-3 text-sm">
          <option value="">Zgjidhni</option>
          {elevators.map((e) => (
            <option key={e.id} value={e.id}>{e.registryNumber} - {e.address}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Lloji i modernizimit *</Label>
        <select name="modernizationType" required className="flex h-10 w-full rounded-md border px-3 text-sm">
          <option value="">Zgjidhni</option>
          {(Object.keys(MODERNIZATION_TYPE_LABELS) as ModernizationType[]).map((key) => (
            <option key={key} value={key}>{MODERNIZATION_TYPE_LABELS[key]}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Përshkrimi i punëve *</Label>
        <textarea name="modernizationNotes" required minLength={10} placeholder="Përshkruani punët e kryera ose të planifikuara (min. 10 karaktere)" className="min-h-20 w-full rounded-md border px-3 py-2 text-sm" />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirmed" value="true" required className="mt-1" />
        Konfirmoj se informacioni i paraqitur është i saktë.
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">Krijo aplikimin e modernizimit</Button>
    </form>
  );
}

export function SimpleTypedApplicationForm({
  type,
  elevators,
  label,
  defaultElevatorId,
  submitLabel = "Krijo aplikimin",
}: {
  type: ApplicationType;
  elevators: { id: string; registryNumber: string; address?: string | null }[];
  label: string;
  defaultElevatorId?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const elevatorId = String(new FormData(e.currentTarget).get("elevatorId") ?? "");
    const result = await createTypedApplicationAction(type, elevatorId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/portal/applications/${result.applicationId}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-lg gap-3">
      <div className="space-y-1">
        <Label>{label} *</Label>
        <select
          name="elevatorId"
          required
          defaultValue={defaultElevatorId ?? ""}
          className="flex h-10 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Zgjidhni</option>
          {elevators.map((e) => (
            <option key={e.id} value={e.id}>
              {e.registryNumber}
              {e.address ? ` - ${e.address}` : ""}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

export function OwnershipTransferApplicationForm({
  elevators,
  defaultElevatorId,
}: {
  elevators: { id: string; registryNumber: string; address?: string }[];
  defaultElevatorId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const elevatorId = String(new FormData(e.currentTarget).get("elevatorId") ?? "");
    const result = await createOwnershipTransferApplicationAction(elevatorId);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/portal/applications/${result.applicationId}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-lg gap-4">
      <div className="space-y-1">
        <Label>Hapi 1 - Zgjidhni ashensorin *</Label>
        <select
          name="elevatorId"
          required
          defaultValue={defaultElevatorId ?? ""}
          className="flex h-10 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Zgjidhni</option>
          {elevators.map((e) => (
            <option key={e.id} value={e.id}>
              {e.registryNumber}
              {e.address ? ` - ${e.address}` : ""}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">Vazhdo - dërgo ftesën te marrësi</Button>
    </form>
  );
}
