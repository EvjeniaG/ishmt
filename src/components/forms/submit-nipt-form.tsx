"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { submitNiptAction } from "@/lib/actions/qkb-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SubmitNiptForm({ currentNipt }: { currentNipt: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await submitNiptAction(new FormData(e.currentTarget));
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Parashtro NIPT për validim</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nipt">NIPT</Label>
            <Input id="nipt" name="nipt" defaultValue={currentNipt ?? ""} required />
          </div>
          <p className="text-xs text-muted-foreground">
            IQMT do të verifikojë manualisht NIPT-in tuaj në QKB.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit">Parashtro</Button>
        </form>
      </CardContent>
    </Card>
  );
}
