"use client";

import { useState } from "react";
import { submitCitizenReportAction } from "@/lib/actions/citizen-report-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REPORT_TYPES = [
  { value: "SAFETY_ISSUE", label: "Problem sigurie te një ashensor" },
  { value: "NO_QR", label: "Ashensor pa kod QR" },
  { value: "COMPLAINT", label: "Ashensor i dyshuar i paregjistruar / ankesë" },
] as const;

export function CitizenReportForm({
  defaultQrCode,
  defaultReportType,
}: {
  defaultQrCode?: string;
  defaultReportType?: (typeof REPORT_TYPES)[number]["value"];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportNumber, setReportNumber] = useState<string | null>(null);
  const [type, setType] = useState<string>(defaultReportType ?? REPORT_TYPES[0].value);

  const requiresLocation = type === "NO_QR" || type === "COMPLAINT";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await submitCitizenReportAction(new FormData(e.currentTarget));
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setReportNumber(result.reportNumber);
  }

  if (reportNumber) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gov-success">Raporti u dërgua</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Faleminderit. Raporti u regjistrua me numrin më poshtë. Ruajeni për referencë.
        </p>
        <p className="mt-3 text-xl font-bold tracking-wide">{reportNumber}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          ISHMT do ta shqyrtojë raportin tuaj. Nuk kërkohet asnjë veprim tjetër.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <Label htmlFor="type">Lloji i raportimit</Label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex h-10 w-full rounded-md border px-3 text-sm"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="qrCode">Kodi QR (nëse ekziston)</Label>
        <Input id="qrCode" name="qrCode" defaultValue={defaultQrCode} placeholder="P.sh. ABC123" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="locationAddress">
          Vendndodhja {requiresLocation ? "(e detyrueshme)" : "(opsionale)"}
        </Label>
        <Input
          id="locationAddress"
          name="locationAddress"
          placeholder="Adresa, ndërtesa, qyteti"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Përshkrimi i problemit</Label>
        <textarea
          id="description"
          name="description"
          required
          minLength={10}
          rows={5}
          className="flex w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Përshkruani problemin sa më qartë…"
        />
      </div>

      <fieldset className="space-y-3 rounded-md border border-dashed p-4">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Kontakti juaj (opsional)
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="reporterName">Emri</Label>
            <Input id="reporterName" name="reporterName" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reporterEmail">Email</Label>
            <Input id="reporterEmail" name="reporterEmail" type="email" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="reporterPhone">Telefoni</Label>
            <Input id="reporterPhone" name="reporterPhone" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {"Kontakti ndihmon ISHMT-në t'ju kontaktojë për sqarime. Mund të raportoni edhe në mënyrë anonime."}
        </p>
      </fieldset>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={submitting} className="bg-gov-primary hover:bg-gov-secondary">
        {submitting ? "Duke dërguar…" : "Dërgo raportin"}
      </Button>
    </form>
  );
}
