"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { registerAccountAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Municipality = { id: string; nameSq: string; region: { nameSq: string } };

type Level = "OWNER" | "INSTALLER" | "CERTIFIER" | "MAINTENANCE";

// Public registration is limited to external roles. ISHMT institutional accounts
// (Inspektor, Kryeinspektor, Administrator, Drejtori) are created internally by an admin.
const LEVELS: { value: Level; label: string }[] = [
  { value: "OWNER", label: "Personi përgjegjës i ashensorit" },
  { value: "INSTALLER", label: "Kompani instaluese" },
  { value: "CERTIFIER", label: "Trup certifikues / OMI" },
  { value: "MAINTENANCE", label: "Kompani mirëmbajtjeje" },
];

const COMPANY_LEVELS: Level[] = ["INSTALLER", "CERTIFIER", "MAINTENANCE"];

const inputClass = "h-9 text-sm";
const labelClass = "text-xs";

export function RegisterAccountForm({
  municipalities,
  initialLevel = "OWNER",
}: {
  municipalities: Municipality[];
  initialLevel?: Level;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<Level>(initialLevel);

  const isCompany = COMPANY_LEVELS.includes(level);
  const showOrg = isCompany || level === "OWNER";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await registerAccountAction(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push(`/auth/login?registered=${level.toLowerCase()}`);
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="py-4">
        <CardTitle className="text-lg">Plotësoni të dhënat tuaja</CardTitle>
        <CardDescription className="text-xs">
          Emri juaj i përdoruesit do të jetë Numri juaj Personal. Zgjidhni nivelin e aksesit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div className="space-y-1">
            <Label htmlFor="level" className={labelClass}>
              Niveli i aksesit *
            </Label>
            <select
              id="level"
              name="level"
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
              className="flex h-9 w-full rounded-md border px-3 text-sm"
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {isCompany ? (
            <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
              Kompanitë / bizneset hyjnë në sistem me <strong>NIPT</strong>. Plotësoni të dhënat e
              biznesit dhe personin e kontaktit.
            </div>
          ) : (
            <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
              Individët hyjnë në sistem me <strong>Numrin Personal</strong>.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {isCompany ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="nipt" className={labelClass}>NIPT * (përdoret për hyrje)</Label>
                  <Input id="nipt" name="nipt" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="organizationName" className={labelClass}>Emri i organizatës *</Label>
                  <Input id="organizationName" name="organizationName" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="firstName" className={labelClass}>Personi i kontaktit - Emri *</Label>
                  <Input id="firstName" name="firstName" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className={labelClass}>Personi i kontaktit - Mbiemri *</Label>
                  <Input id="lastName" name="lastName" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className={labelClass}>Email *</Label>
                  <Input id="email" name="email" type="email" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className={labelClass}>Numri i Telefonit</Label>
                  <Input id="phone" name="phone" className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="personalNumber" className={labelClass}>
                    Numri Personal i kontaktit (opsional)
                  </Label>
                  <Input id="personalNumber" name="personalNumber" className={inputClass} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="municipalityId" className={labelClass}>Bashkia *</Label>
                  <select
                    id="municipalityId"
                    name="municipalityId"
                    required
                    className="flex h-9 w-full rounded-md border px-3 text-sm"
                  >
                    <option value="">Zgjidhni</option>
                    {municipalities.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nameSq} ({m.region.nameSq})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="personalNumber" className={labelClass}>Numri Personal * (përdoret për hyrje)</Label>
                  <Input id="personalNumber" name="personalNumber" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="idCardNumber" className={labelClass}>Numri i Kartës së Identitetit *</Label>
                  <Input id="idCardNumber" name="idCardNumber" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="firstName" className={labelClass}>Emri *</Label>
                  <Input id="firstName" name="firstName" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fatherName" className={labelClass}>Atësia *</Label>
                  <Input id="fatherName" name="fatherName" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName" className={labelClass}>Mbiemri *</Label>
                  <Input id="lastName" name="lastName" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="motherName" className={labelClass}>Mëmësia *</Label>
                  <Input id="motherName" name="motherName" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="birthDate" className={labelClass}>Data e Lindjes *</Label>
                  <Input id="birthDate" name="birthDate" type="date" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email" className={labelClass}>Email *</Label>
                  <Input id="email" name="email" type="email" required className={inputClass} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className={labelClass}>Numri i Telefonit</Label>
                  <Input id="phone" name="phone" className={inputClass} />
                </div>

                {level === "OWNER" && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="organizationName" className={labelClass}>Emri i organizatës (opsionale)</Label>
                      <Input id="organizationName" name="organizationName" className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="nipt" className={labelClass}>NIPT (person juridik)</Label>
                      <Input id="nipt" name="nipt" className={inputClass} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="municipalityId" className={labelClass}>Bashkia *</Label>
                      <select
                        id="municipalityId"
                        name="municipalityId"
                        required
                        className="flex h-9 w-full rounded-md border px-3 text-sm"
                      >
                        <option value="">Zgjidhni</option>
                        {municipalities.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nameSq} ({m.region.nameSq})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="space-y-1">
              <Label htmlFor="password" className={labelClass}>Password *</Label>
              <Input id="password" name="password" type="password" required className={inputClass} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className={labelClass}>Confirm Password *</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required className={inputClass} />
            </div>
          </div>

          {!showOrg && (
            <p className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
              Llogaria institucionale do të lidhet me organizatën përkatëse ekzistuese.
            </p>
          )}

          <div className="rounded-md border bg-muted/30 p-2 text-[11px] text-muted-foreground">
            Fjalëkalimi: të paktën 8 karaktere, një numër, një gërmë kapitale dhe një jo-kapitale.
          </div>

          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" name="acceptTerms" value="true" required className="mt-0.5" />
            E lexova dhe bie dakord me termat dhe kushtet
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex items-center justify-between">
            <Link href="/auth/login" className="text-xs text-primary hover:underline">
              Kthehu Prapa
            </Link>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Duke u regjistruar..." : "Regjistrohu"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
