"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDefaultRedirectForRole } from "@/lib/permissions/routes";
import type { RoleCode } from "@/lib/constants/roles";
import { isDemoToolsEnabled } from "@/lib/demo/demo-data-mode";
import {
  DEMO_LOGIN_CREDENTIALS,
  DEMO_LOGIN_PASSWORD,
  type DemoLoginCredential,
} from "@/lib/demo/demo-login-credentials";

type AccountLevel =
  | "OWNER"
  | "INSTALLER"
  | "CERTIFIER"
  | "MAINTENANCE"
  | "ADMIN"
  | "CHIEF_INSPECTOR"
  | "ISHMT_DIRECTOR"
  | "SECTOR_HEAD"
  | "SECTOR_SPECIALIST"
  | "FIELD_INSPECTOR"
  | "DIRECTORATE";

const ACCOUNT_LEVELS: { value: AccountLevel; label: string }[] = [
  { value: "OWNER", label: "Personi përgjegjës i ashensorit" },
  { value: "INSTALLER", label: "Kompani instaluese" },
  { value: "CERTIFIER", label: "Kompani certifikuese / OMI" },
  { value: "MAINTENANCE", label: "Kompani mirëmbajtëse" },
  { value: "ADMIN", label: "Administrator ISHMT" },
  { value: "CHIEF_INSPECTOR", label: "Kryeinspektor" },
  { value: "ISHMT_DIRECTOR", label: "Drejtor Teknik" },
  { value: "SECTOR_HEAD", label: "Përgjegjës i Sektorit të Produkteve Mekanike" },
  { value: "SECTOR_SPECIALIST", label: "Specialist sektori" },
  { value: "FIELD_INSPECTOR", label: "Inspektor terreni" },
  { value: "DIRECTORATE", label: "Drejtoria e Politikave" },
];

const LEVEL_HINTS: Record<AccountLevel, string> = {
  OWNER: "Personat përgjegjës të ashensorit regjistrohen vetë dhe krijojnë aplikime.",
  MAINTENANCE: "Kompanitë e mirëmbajtjes regjistrohen dhe presin validimin QKB para aktivizimit.",
  INSTALLER: "Kompanitë instaluese regjistrohen dhe presin validimin para aktivizimit.",
  CERTIFIER: "Trupat certifikues / OMI regjistrohen dhe presin validimin para aktivizimit.",
  ADMIN: "Llogari institucionale e ISHMT për administrimin e sistemit.",
  CHIEF_INSPECTOR: "Miratim final i aplikimeve dhe caktim inspektimi në terren.",
  ISHMT_DIRECTOR: "Miratim final dhe mbikëqyrje operacionale; cakton inspektim terreni.",
  SECTOR_HEAD: "Shqyrtim aplikimesh dhe caktim i inspektorit që shkon në objekt.",
  SECTOR_SPECIALIST: "Shqyrtim administrativ i aplikimeve në zyrë.",
  FIELD_INSPECTOR: "Inspektim fizik në objekt - detyrat e caktuara nga shefi/drejtori/kryeinspektori.",
  DIRECTORATE: "Llogari institucionale e Drejtorisë së Politikave (regjistrim kompanish).",
};

/** Përkohësisht — vetëm dev/demo. Kërkon `npm run db:seed:full-demo`. */
const DEMO_PASSWORD = DEMO_LOGIN_PASSWORD;

const DEMO_CREDENTIALS = DEMO_LOGIN_CREDENTIALS;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<AccountLevel>("OWNER");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const showDemoCredentials = isDemoToolsEnabled();

  function applyDemoCredential(cred: DemoLoginCredential) {
    setIdentifier(cred.identifier);
    setPassword(DEMO_PASSWORD);
    setLevel(cred.level as AccountLevel);
    setError(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      level: formData.get("level"),
      totpCode: formData.get("totpCode") || undefined,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "ACCOUNT_LOCKED") {
        setError("Llogaria është e bllokuar. Provoni përsëri pas 30 minutash.");
      } else if (result.error === "LEVEL_MISMATCH") {
        setError("Niveli i aksesit i zgjedhur nuk përputhet me llogarinë tuaj.");
      } else if (result.error === "2FA_REQUIRED") {
        setNeedsTwoFactor(true);
        setError("Shkruani kodin 6-shifror nga aplikacioni autentifikues.");
      } else if (result.error === "2FA_INVALID") {
        setNeedsTwoFactor(true);
        setError("Kodi i verifikimit dyfaktorësh është i gabuar.");
      } else {
        setError("Numri Personal/NIPT ose fjalëkalimi i gabuar.");
        setNeedsTwoFactor(false);
      }
      return;
    }

    router.push(
      callbackUrl ?? getDefaultRedirectForRole(String(formData.get("level")) as RoleCode),
    );
    router.refresh();
  }

  return (
    <Card className={`mx-auto w-full ${showDemoCredentials ? "max-w-2xl" : "max-w-md"}`}>
      <CardHeader>
        <CardTitle>Mirëseerdhët</CardTitle>
        <CardDescription>
          ISHMT - Regjistri Digjital i Ashensorëve. Hyni në sistem me Numrin Personal ose NIPT-in
          tuaj.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Emri i Përdoruesit (Numri Personal / NIPT)</Label>
            <Input
              id="identifier"
              name="identifier"
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={needsTwoFactor}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Fjalëkalimi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={needsTwoFactor}
            />
          </div>
          {needsTwoFactor && (
            <div className="space-y-2">
              <Label htmlFor="totpCode">Kodi i verifikimit (2FA)</Label>
              <Input
                id="totpCode"
                name="totpCode"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="level">Niveli i aksesit</Label>
            <select
              id="level"
              name="level"
              value={level}
              onChange={(e) => setLevel(e.target.value as AccountLevel)}
              className="flex h-10 w-full rounded-md border px-3 text-sm"
              disabled={needsTwoFactor}
            >
              {ACCOUNT_LEVELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{LEVEL_HINTS[level]}</p>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required className="mt-1" />
            E lexova dhe bie dakord me termat dhe kushtet
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Duke u identifikuar..." : needsTwoFactor ? "Verifiko & hyr" : "Hyr në sistem"}
          </Button>
          {needsTwoFactor && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setNeedsTwoFactor(false);
                setTotpCode("");
                setError(null);
              }}
            >
              Kthehu mbrapa
            </Button>
          )}
        </form>

        {showDemoCredentials && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm">
            <p className="font-semibold text-amber-950">Kredenciale demo (përkohësisht)</p>
            <p className="mt-1 text-xs text-amber-900/80">
              Fjalëkalimi për të gjithë: <code className="rounded bg-white/70 px-1">{DEMO_PASSWORD}</code>
              {" · "}
              Kërkon <code className="rounded bg-white/70 px-1">npm run db:seed:demo</code>
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-amber-200/80 text-amber-900/70">
                    <th className="py-1.5 pr-2 font-medium">Roli</th>
                    <th className="py-1.5 pr-2 font-medium">NID / NIPT</th>
                    <th className="py-1.5 pr-2 font-medium">Niveli</th>
                    <th className="py-1.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_CREDENTIALS.map((cred) => (
                    <tr key={cred.identifier} className="border-b border-amber-100/80 last:border-0">
                      <td className="py-1.5 pr-2">{cred.role}</td>
                      <td className="py-1.5 pr-2 font-mono">{cred.identifier}</td>
                      <td className="py-1.5 pr-2 text-amber-900/80">{cred.level}</td>
                      <td className="py-1.5 text-right">
                        <button
                          type="button"
                          onClick={() => applyDemoCredential(cred)}
                          className="text-primary hover:underline"
                        >
                          Plotëso
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-3 border-t pt-4 text-sm">
          <Link href="/auth/forgot-password" className="text-primary hover:underline">
            Keni harruar fjalëkalimin?
          </Link>
          <div className="rounded-md bg-muted/30 p-3">
            <p className="font-medium text-foreground">Regjistrohu</p>
            <p className="mt-1 text-muted-foreground">
              Për një regjistrim të ri ose hyrje për herë të parë në sistem:
            </p>
            <Link
              href={`/auth/register?level=${level}`}
              className="mt-1 inline-block text-primary hover:underline"
            >
              Regjistrohuni këtu
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
