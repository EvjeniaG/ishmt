"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyMinorContactChangeAction } from "@/lib/actions/lifecycle-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MinorContactForm({
  elevatorId,
  defaults,
}: {
  elevatorId: string;
  defaults: { phone?: string | null; email?: string | null; address?: string | null };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const result = await applyMinorContactChangeAction(elevatorId, {
      phone: String(fd.get("phone") || "") || undefined,
      email: String(fd.get("email") || "") || undefined,
      address: String(fd.get("address") || "") || undefined,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-0">
      <p className="text-xs text-muted-foreground">
        Ndryshim dytësor - pa nevojë për miratim ISHMT (telefon, email, adresë kontakti).
      </p>
      <div className="space-y-1">
        <Label>Telefon</Label>
        <Input name="phone" defaultValue={defaults.phone ?? ""} />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input name="email" type="email" defaultValue={defaults.email ?? ""} />
      </div>
      <div className="space-y-1">
        <Label>Adresa e kontaktit</Label>
        <Input name="address" defaultValue={defaults.address ?? ""} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Duke ruajtur…" : "Përditëso kontaktin"}
      </Button>
    </form>
  );
}
