"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ProfileSectionHeader } from "@/components/account/profile-section-header";
import {
  beginTwoFactorSetupAction,
  changePasswordAction,
  disableTwoFactorAction,
  enableTwoFactorAction,
  requestEmailChangeAction,
} from "@/lib/actions/account-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type SecurityState = {
  email: string;
  emailVerified: boolean;
  pendingEmail: string | null;
  twoFactorEnabled: boolean;
  hasPendingTwoFactorSetup: boolean;
};

const PASSWORD_FORM = "security-password-form";
const EMAIL_FORM = "security-email-form";
const TWO_FA_ENABLE_FORM = "security-2fa-enable-form";
const TWO_FA_DISABLE_FORM = "security-2fa-disable-form";

export function AccountSecurityPanel({ security }: { security: SecurityState }) {
  const router = useRouter();
  const passwordFormRef = useRef<HTMLFormElement>(null);
  const emailFormRef = useRef<HTMLFormElement>(null);
  const twoFaEnableFormRef = useRef<HTMLFormElement>(null);
  const twoFaDisableFormRef = useRef<HTMLFormElement>(null);

  const [editingPassword, setEditingPassword] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingTwoFa, setEditingTwoFa] = useState(false);

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [twoFaSaving, setTwoFaSaving] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);
  const [twoFaSuccess, setTwoFaSuccess] = useState(false);

  const [setupOtpauthUrl, setSetupOtpauthUrl] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [twoFaStep, setTwoFaStep] = useState<"idle" | "setup" | "confirm">("idle");

  useEffect(() => {
    if (!setupOtpauthUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(setupOtpauthUrl).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [setupOtpauthUrl]);

  async function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordSuccess(false);
    const result = await changePasswordAction(new FormData(e.currentTarget));
    setPasswordSaving(false);
    if (!result.success) {
      setPasswordError(result.error);
      return;
    }
    setPasswordError(null);
    setPasswordSuccess(true);
    setEditingPassword(false);
    passwordFormRef.current?.reset();
    router.refresh();
  }

  async function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailSuccess(null);
    const result = await requestEmailChangeAction(new FormData(e.currentTarget));
    setEmailSaving(false);
    if (!result.success) {
      setEmailError(result.error);
      return;
    }
    setEmailError(null);
    setEmailSuccess(result.message);
    setEditingEmail(false);
    emailFormRef.current?.reset();
    router.refresh();
  }

  async function startTwoFactorSetup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTwoFaSaving(true);
    setTwoFaError(null);
    const result = await beginTwoFactorSetupAction(new FormData(e.currentTarget));
    setTwoFaSaving(false);
    if (!result.success) {
      setTwoFaError(result.error);
      return;
    }
    setSetupOtpauthUrl(result.otpauthUrl);
    setSetupSecret(result.secret);
    setTwoFaStep("confirm");
  }

  async function onEnableTwoFactor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTwoFaSaving(true);
    setTwoFaSuccess(false);
    const result = await enableTwoFactorAction(new FormData(e.currentTarget));
    setTwoFaSaving(false);
    if (!result.success) {
      setTwoFaError(result.error);
      return;
    }
    setTwoFaError(null);
    setTwoFaSuccess(true);
    setEditingTwoFa(false);
    setTwoFaStep("idle");
    setSetupOtpauthUrl(null);
    setSetupSecret(null);
    twoFaEnableFormRef.current?.reset();
    router.refresh();
  }

  async function onDisableTwoFactor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTwoFaSaving(true);
    setTwoFaSuccess(false);
    const result = await disableTwoFactorAction(new FormData(e.currentTarget));
    setTwoFaSaving(false);
    if (!result.success) {
      setTwoFaError(result.error);
      return;
    }
    setTwoFaError(null);
    setTwoFaSuccess(true);
    setEditingTwoFa(false);
    twoFaDisableFormRef.current?.reset();
    router.refresh();
  }

  function resetTwoFaEdit() {
    setEditingTwoFa(false);
    setTwoFaStep("idle");
    setSetupOtpauthUrl(null);
    setSetupSecret(null);
    setTwoFaError(null);
    setTwoFaSuccess(false);
    twoFaEnableFormRef.current?.reset();
    twoFaDisableFormRef.current?.reset();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Siguria e llogarisë</h2>
        <p className="text-sm text-muted-foreground">
          Ndryshoni fjalëkalimin, email-in ose aktivizoni verifikimin dyfaktorësh (2FA).
        </p>
      </div>

      <Card className="portal-surface">
        <ProfileSectionHeader
          title="Fjalëkalimi"
          isEditing={editingPassword}
          formId={PASSWORD_FORM}
          onEdit={() => {
            setEditingPassword(true);
            setPasswordError(null);
            setPasswordSuccess(false);
          }}
          onCancel={() => {
            passwordFormRef.current?.reset();
            setEditingPassword(false);
            setPasswordError(null);
            setPasswordSuccess(false);
          }}
          saving={passwordSaving}
        />
        <CardContent>
          {!editingPassword ? (
            <p className="text-sm text-muted-foreground">
              Përdorni një fjalëkalim të fortë (min. 8 karaktere, shkronja të mëdha/të vogla dhe numër).
            </p>
          ) : (
            <form ref={passwordFormRef} id={PASSWORD_FORM} onSubmit={onPasswordSubmit} className="grid gap-4 sm:max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Fjalëkalimi aktual *</Label>
                <Input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Fjalëkalimi i ri *</Label>
                <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Përsërit fjalëkalimin e ri *</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
              </div>
            </form>
          )}
          {passwordError && <p className="mt-3 text-sm text-destructive">{passwordError}</p>}
          {passwordSuccess && <p className="mt-3 text-sm text-gov-success">Fjalëkalimi u ndryshua me sukses.</p>}
        </CardContent>
      </Card>

      <Card className="portal-surface">
        <ProfileSectionHeader
          title="Email-i"
          isEditing={editingEmail}
          formId={EMAIL_FORM}
          onEdit={() => {
            setEditingEmail(true);
            setEmailError(null);
            setEmailSuccess(null);
          }}
          onCancel={() => {
            emailFormRef.current?.reset();
            setEditingEmail(false);
            setEmailError(null);
            setEmailSuccess(null);
          }}
          saving={emailSaving}
        />
        <CardContent className="space-y-3">
          <div className="text-sm">
            <p>
              <span className="text-muted-foreground">Email aktual: </span>
              <span className="font-medium">{security.email}</span>
            </p>
            <p className="mt-1">
              <span className="text-muted-foreground">Statusi: </span>
              <span className={security.emailVerified ? "text-gov-success" : "text-gov-warning"}>
                {security.emailVerified ? "I verifikuar" : "Jo i verifikuar"}
              </span>
            </p>
            {security.pendingEmail && (
              <p className="mt-1 text-gov-warning">
                Në pritje verifikimi: <strong>{security.pendingEmail}</strong>
              </p>
            )}
          </div>
          {editingEmail && (
            <form ref={emailFormRef} id={EMAIL_FORM} onSubmit={onEmailSubmit} className="grid gap-4 sm:max-w-md">
              <div className="space-y-2">
                <Label htmlFor="newEmail">Email i ri *</Label>
                <Input id="newEmail" name="newEmail" type="email" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emailCurrentPassword">Fjalëkalimi aktual *</Label>
                <Input id="emailCurrentPassword" name="currentPassword" type="password" required autoComplete="current-password" />
              </div>
              <p className="text-xs text-muted-foreground">
                Do të dërgohet link verifikimi te email i ri. Ndryshimi zbatohet vetëm pas konfirmimit.
              </p>
            </form>
          )}
          {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          {emailSuccess && <p className="text-sm text-gov-success">{emailSuccess}</p>}
        </CardContent>
      </Card>

      <Card className="portal-surface">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Verifikimi dyfaktorësh (2FA)</h3>
              <p className="text-sm text-muted-foreground">
                {security.twoFactorEnabled
                  ? "Aktiv - kërkohet kod nga aplikacioni autentifikues gjatë hyrjes."
                  : "Joaktiv - rekomandohet për llogaritë IQMT dhe kompanive."}
              </p>
            </div>
            {!editingTwoFa ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingTwoFa(true);
                  setTwoFaStep(security.twoFactorEnabled ? "idle" : "setup");
                  setTwoFaError(null);
                  setTwoFaSuccess(false);
                }}
              >
                {security.twoFactorEnabled ? "Ndrysho" : "Aktivizo"}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={resetTwoFaEdit} disabled={twoFaSaving}>
                  Anulo
                </Button>
                {security.twoFactorEnabled && (
                  <Button type="submit" form={TWO_FA_DISABLE_FORM} size="sm" disabled={twoFaSaving}>
                    {twoFaSaving ? "Duke ruajtur…" : "Çaktivizo 2FA"}
                  </Button>
                )}
                {twoFaStep === "confirm" && (
                  <Button type="submit" form={TWO_FA_ENABLE_FORM} size="sm" disabled={twoFaSaving}>
                    {twoFaSaving ? "Duke ruajtur…" : "Ruaj ndryshimet"}
                  </Button>
                )}
              </div>
            )}
          </div>

          {editingTwoFa && !security.twoFactorEnabled && twoFaStep === "setup" && (
            <form onSubmit={startTwoFactorSetup} className="grid max-w-md gap-4">
              <div className="space-y-2">
                <Label htmlFor="twoFaSetupPassword">Fjalëkalimi aktual *</Label>
                <Input id="twoFaSetupPassword" name="currentPassword" type="password" required autoComplete="current-password" />
              </div>
              <Button type="submit" disabled={twoFaSaving}>
                {twoFaSaving ? "Duke përgatitur…" : "Vazhdo me konfigurimin"}
              </Button>
            </form>
          )}

          {editingTwoFa && !security.twoFactorEnabled && twoFaStep === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Skanoni QR me Google Authenticator, Microsoft Authenticator ose aplikacion të ngjashëm.
              </p>
              {qrDataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="QR kod për 2FA" className="h-40 w-40 rounded-lg border bg-white p-2" />
              )}
              {setupSecret && (
                <p className="text-xs text-muted-foreground">
                  Kod manual: <code className="rounded bg-muted px-1">{setupSecret}</code>
                </p>
              )}
              <form ref={twoFaEnableFormRef} id={TWO_FA_ENABLE_FORM} onSubmit={onEnableTwoFactor} className="grid max-w-md gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twoFaEnableCode">Kodi 6-shifror *</Label>
                  <Input id="twoFaEnableCode" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twoFaEnablePassword">Fjalëkalimi aktual *</Label>
                  <Input id="twoFaEnablePassword" name="currentPassword" type="password" required autoComplete="current-password" />
                </div>
              </form>
            </div>
          )}

          {editingTwoFa && security.twoFactorEnabled && (
            <form ref={twoFaDisableFormRef} id={TWO_FA_DISABLE_FORM} onSubmit={onDisableTwoFactor} className="grid max-w-md gap-4">
              <div className="space-y-2">
                <Label htmlFor="twoFaDisableCode">Kodi 6-shifror *</Label>
                <Input id="twoFaDisableCode" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="twoFaDisablePassword">Fjalëkalimi aktual *</Label>
                <Input id="twoFaDisablePassword" name="currentPassword" type="password" required autoComplete="current-password" />
              </div>
            </form>
          )}

          {twoFaError && <p className="mt-3 text-sm text-destructive">{twoFaError}</p>}
          {twoFaSuccess && <p className="mt-3 text-sm text-gov-success">Cilësimet e 2FA u përditësuan.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
