"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type RevokeHandler = (reason: string) => Promise<{ success: boolean; error?: string }>;

export function RevokeDelegationForm({
  label,
  hint,
  onRevoke,
  confirmLabel = "Tërhiq ftesën",
}: {
  label: string;
  hint?: string;
  onRevoke: RevokeHandler;
  confirmLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await onRevoke(reason);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Tërheqja dështoi.");
      return;
    }
    setOpen(false);
    setReason("");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="mt-4 border-t border-border/60 pt-4">
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {confirmLabel}
        </Button>
        {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-border/60 pt-4">
      <div className="space-y-1.5">
        <Label htmlFor="revoke-reason">{label} *</Label>
        <textarea
          id="revoke-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="min-h-[88px] w-full rounded-md border px-3 py-2 text-sm"
          placeholder="P.sh. kompania nuk përgjigjet, vonesë e gjatë, duhet kompani tjetër…"
          required
          minLength={10}
        />
        <p className="text-xs text-muted-foreground">
          Arsyeja ruhet në historikun e aplikimit dhe njoftohet kompania e ftuar.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" size="sm" disabled={loading}>
          {loading ? "Duke tërhequr…" : "Konfirmo tërheqjen"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(null);
          }}
        >
          Anulo
        </Button>
      </div>
    </form>
  );
}
