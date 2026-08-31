"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { approveQkbAction, rejectQkbAction } from "@/lib/actions/qkb-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function QkbValidationActions({ validationId }: { validationId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onApprove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await approveQkbAction(validationId, new FormData(e.currentTarget));
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function onReject(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await rejectQkbAction(validationId, new FormData(e.currentTarget));
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={onApprove} className="space-y-2 rounded border p-4">
        <p className="font-medium text-green-700">Aprovo</p>
        <div className="space-y-2">
          <Label htmlFor={`verified-${validationId}`}>Emri i verifikuar (QKB)</Label>
          <Input id={`verified-${validationId}`} name="verifiedCompanyName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`notes-${validationId}`}>Shënime</Label>
          <Input id={`notes-${validationId}`} name="notes" />
        </div>
        <Button type="submit" size="sm">Aprovo validimin</Button>
      </form>

      <form onSubmit={onReject} className="space-y-2 rounded border p-4">
        <p className="font-medium text-destructive">Refuzo</p>
        <div className="space-y-2">
          <Label htmlFor={`reason-${validationId}`}>Arsyeja</Label>
          <Input id={`reason-${validationId}`} name="reason" required />
        </div>
        <Button type="submit" variant="destructive" size="sm">Refuzo</Button>
      </form>

      {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
    </div>
  );
}
