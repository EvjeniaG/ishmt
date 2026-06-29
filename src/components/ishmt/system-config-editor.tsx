"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateSystemConfigAction } from "@/lib/actions/ishmt-admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConfigRow = {
  key: string;
  value: unknown;
  description: string | null;
};

export function SystemConfigEditor({ configs }: { configs: ConfigRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function saveJson(key: string, raw: string) {
    setBusy(key);
    setError(null);
    try {
      const value = JSON.parse(raw);
      const result = await updateSystemConfigAction(key, value);
      if (!result.success) setError(result.error);
      else router.refresh();
    } catch {
      setError("JSON i pavlefshëm.");
    } finally {
      setBusy(null);
    }
  }

  async function saveNumber(key: string, raw: string) {
    setBusy(key);
    setError(null);
    const num = parseInt(raw, 10);
    if (Number.isNaN(num)) {
      setError("Vlera duhet të jetë numër.");
      setBusy(null);
      return;
    }
    const result = await updateSystemConfigAction(key, num);
    if (!result.success) setError(result.error);
    else router.refresh();
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {configs.map((config) => (
        <div key={config.key} className="rounded-md border p-4 space-y-2">
          <p className="font-mono text-sm font-medium">{config.key}</p>
          {config.description && (
            <p className="text-xs text-muted-foreground">{config.description}</p>
          )}
          {typeof config.value === "number" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                saveNumber(config.key, String(fd.get("value") ?? ""));
              }}
              className="flex gap-2 items-end"
            >
              <div className="space-y-1 flex-1">
                <Label>Vlera</Label>
                <Input name="value" type="number" defaultValue={config.value} />
              </div>
              <Button type="submit" disabled={busy === config.key}>
                {busy === config.key ? "Duke ruajtur…" : "Ruaj"}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                saveJson(config.key, String(fd.get("value") ?? ""));
              }}
              className="space-y-2"
            >
              <textarea
                name="value"
                defaultValue={JSON.stringify(config.value, null, 2)}
                className="min-h-[120px] w-full rounded-md border p-2 font-mono text-xs"
              />
              <Button type="submit" disabled={busy === config.key}>
                {busy === config.key ? "Duke ruajtur…" : "Ruaj"}
              </Button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
