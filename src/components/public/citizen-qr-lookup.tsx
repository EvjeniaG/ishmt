"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CitizenQrLookup({ id = "citizen-qr-code" }: { id?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Shkruani kodin QR ose skanoni etiketën e ashensorit.");
      return;
    }
    setError(null);
    router.push(`/q/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Kodi QR i ashensorit
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={id}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="P.sh. ABC123XYZ"
          className="h-11 font-mono uppercase tracking-wide"
          autoComplete="off"
        />
        <Button type="submit" className="h-11 shrink-0 bg-gov-primary hover:bg-gov-secondary">
          <Search className="mr-2 h-4 w-4" aria-hidden />
          Shiko statusin
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Skanoni kodin QR në ashensor me telefonin, ose shkruani kodin manualisht. Nuk kërkohet
        llogari.
      </p>
    </form>
  );
}
