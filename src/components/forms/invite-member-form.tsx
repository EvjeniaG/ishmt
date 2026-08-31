"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { inviteMemberAction } from "@/lib/actions/organization-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RoleCode } from "@/lib/constants/roles";

export function InviteMemberForm({ roleCode }: { roleCode: RoleCode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccess(false);
    const result = await inviteMemberAction(new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError(null);
    setSuccess(true);
    router.refresh();
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Fto anëtar të ri</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Emri</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Mbiemri</Label>
            <Input id="lastName" name="lastName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <p className="text-xs text-muted-foreground">
            Roli i caktuar: {roleCode}. Në dev, fjalëkalimi i përkohshëm shfaqet në konsol.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">Ftesa u dërgua me sukses.</p>}
          <Button type="submit">Fto</Button>
        </form>
      </CardContent>
    </Card>
  );
}
