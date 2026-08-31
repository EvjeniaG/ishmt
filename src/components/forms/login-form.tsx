"use client";

import { getSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TermsAcceptanceLabel } from "@/components/forms/terms-acceptance-label";
import {
  loadPostRegisterCredentials,
  type PostRegisterCredentials,
} from "@/lib/auth/post-register-credentials";
import { getDefaultRedirectForRole } from "@/lib/permissions/routes";
import type { RoleCode } from "@/lib/constants/roles";
import { isDemoToolsEnabled } from "@/lib/demo/demo-data-mode";
import {
  DEMO_LOGIN_CREDENTIALS,
  DEMO_LOGIN_PASSWORD,
  type DemoLoginCredential,
} from "@/lib/demo/demo-login-credentials";

/** Përkohësisht - vetëm dev/demo. */
const DEMO_PASSWORD = DEMO_LOGIN_PASSWORD;

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const registered = searchParams.get("registered");
  const identifierFromUrl = searchParams.get("identifier");

  const [registeredCredentials, setRegisteredCredentials] = useState<PostRegisterCredentials | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);

  useEffect(() => {
    if (!registered) return;

    const stored = loadPostRegisterCredentials();
    const cred: PostRegisterCredentials | null =
      stored ??
      (identifierFromUrl
        ? {
            identifier: identifierFromUrl,
            password: "",
            accountType: registered === "company" ? "company" : "owner",
          }
        : null);

    if (!cred) return;

    setRegisteredCredentials(cred);
    setIdentifier(cred.identifier.trim().toUpperCase());
    if (cred.password) {
      setPassword(cred.password);
      if (termsRef.current) {
        termsRef.current.checked = true;
      }
    }
  }, [registered, identifierFromUrl]);

  const showDemoCredentials = isDemoToolsEnabled();

  function applyDemoCredential(cred: DemoLoginCredential) {
    const loginId = cred.identifier.trim().toUpperCase();

    setSelectedDemoId(loginId);
    setIdentifier(loginId);
    setPassword(DEMO_PASSWORD);
    setRegisteredCredentials(null);
    setError(null);
    setNeedsTwoFactor(false);
    setTotpCode("");

    if (termsRef.current) {
      termsRef.current.checked = true;
    }

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    formRef.current?.querySelector<HTMLInputElement>("#identifier")?.focus();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      totpCode: formData.get("totpCode") || undefined,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "ACCOUNT_LOCKED") {
        setError("Llogaria është e bllokuar. Provoni përsëri pas 30 minutash.");
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

    const session = await getSession();
    const roleCode = (session?.user?.roleCode ?? "OWNER") as RoleCode;
    const destination = callbackUrl ?? getDefaultRedirectForRole(roleCode);
    window.location.assign(destination);
  }

  const identifierLabel = "NID/NIPT";

  return (
    <Card className={`mx-auto w-full ${showDemoCredentials ? "max-w-2xl" : "max-w-md"}`}>
      <CardHeader>
        <CardTitle>Mirëseerdhët</CardTitle>
        <CardDescription>
          Hyni në sistem me Numrin Personal ose NIPT-in tuaj dhe fjalëkalimin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {registeredCredentials && (
          <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
            <p className="font-semibold">
              {registeredCredentials.accountType === "company"
                ? "Regjistrimi i kompanisë u krye me sukses!"
                : "Regjistrimi u krye me sukses!"}
            </p>
            <p className="mt-1 text-emerald-900/90">
              Përdorni kredencialet më poshtë për të hyrë. Fushat janë plotësuar automatikisht.
            </p>
            <dl className="mt-3 space-y-2 rounded-md border border-emerald-200/80 bg-white/70 px-3 py-2.5 text-xs">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="font-medium text-emerald-950/80">
                  {registeredCredentials.accountType === "company" ? "NIPT" : "Numri Personal"}
                </dt>
                <dd className="font-mono font-semibold text-emerald-950">
                  {registeredCredentials.identifier}
                </dd>
              </div>
              {registeredCredentials.password ? (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <dt className="font-medium text-emerald-950/80">Fjalëkalimi</dt>
                  <dd className="font-mono font-semibold text-emerald-950">
                    {registeredCredentials.password}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        )}

        <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">{identifierLabel}</Label>
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
          <label className="flex items-start gap-2 text-sm">
            <input ref={termsRef} type="checkbox" required className="mt-1" />
            <TermsAcceptanceLabel />
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
              Klikoni «Plotëso» për të mbushur automatikisht fushat e hyrjes.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[24rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-amber-200/80 text-amber-900/70">
                    <th className="py-1.5 pr-2 font-medium">Llogaria</th>
                    <th className="py-1.5 pr-2 font-medium">NID / NIPT</th>
                    <th className="py-1.5 pr-2 font-medium">Fjalëkalimi</th>
                    <th className="py-1.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_LOGIN_CREDENTIALS.map((cred) => {
                    const loginId = cred.identifier.trim().toUpperCase();
                    const isSelected = selectedDemoId === loginId;

                    return (
                    <tr
                      key={cred.identifier}
                      className={`border-b border-amber-100/80 last:border-0 ${isSelected ? "bg-amber-100/60" : ""}`}
                    >
                      <td className="py-1.5 pr-2">{cred.role}</td>
                      <td className="py-1.5 pr-2 font-mono">{loginId}</td>
                      <td className="py-1.5 pr-2 font-mono">{DEMO_PASSWORD}</td>
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
                    );
                  })}
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
            <Link href="/auth/register" className="mt-1 inline-block text-primary hover:underline">
              Regjistrohuni këtu
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
