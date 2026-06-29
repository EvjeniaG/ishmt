"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateAccountProfileAction } from "@/lib/actions/account-actions";
import { ProfileSectionHeader } from "@/components/account/profile-section-header";
import { getRoleLabel } from "@/lib/constants/role-labels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  firstName: string;
  lastName: string;
  email: string;
  roleCode: string;
  orgName: string;
  phone?: string | null;
  nid?: string | null;
  lastLoginAt?: Date | null;
  hideOrgFields?: boolean;
};

const FORM_ID = "account-profile-form";

export function AccountProfileForm({
  firstName,
  lastName,
  email,
  roleCode,
  orgName,
  phone,
  nid,
  lastLoginAt,
  hideOrgFields = false,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleCancel() {
    formRef.current?.reset();
    setIsEditing(false);
    setError(null);
    setSuccess(false);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    const result = await updateAccountProfileAction(new FormData(e.currentTarget));
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError(null);
    setSuccess(true);
    setIsEditing(false);
    router.refresh();
  }

  return (
    <Card className="portal-surface">
      <ProfileSectionHeader
        title="Të dhënat personale"
        isEditing={isEditing}
        formId={FORM_ID}
        onEdit={() => {
          setIsEditing(true);
          setError(null);
          setSuccess(false);
        }}
        onCancel={handleCancel}
        saving={saving}
      />
      <CardContent>
        <form ref={formRef} id={FORM_ID} onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Emri *</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={firstName}
              required
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Mbiemri *</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={lastName}
              required
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={phone ?? ""}
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : undefined}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nid">NID</Label>
            <Input
              id="nid"
              name="nid"
              defaultValue={nid ?? ""}
              disabled={!isEditing}
              className={!isEditing ? "bg-muted" : undefined}
            />
          </div>
          {!hideOrgFields && (
            <>
              <div className="space-y-2">
                <Label>Roli</Label>
                <Input value={getRoleLabel(roleCode)} disabled className="bg-muted" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Organizata</Label>
                <Input value={orgName} disabled className="bg-muted" />
              </div>
            </>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label>Hyrja e fundit</Label>
            <Input
              value={lastLoginAt ? new Date(lastLoginAt).toLocaleString("sq-AL") : "-"}
              disabled
              className="bg-muted"
            />
          </div>
          {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
          {success && (
            <p className="text-sm text-gov-success sm:col-span-2">
              U ruajt me sukses. Ndryshimi u regjistrua në audit.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
