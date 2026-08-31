"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useRef, useState } from "react";
import { updateStaffContactProfileAction } from "@/lib/actions/account-actions";
import { ProfileSectionHeader } from "@/components/account/profile-section-header";
import { PROFILE_SECTION_TITLES } from "@/lib/registration/profile-sections";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type StaffProfileData = {
  firstName: string;
  lastName: string;
  fatherName: string | null;
  email: string;
  phone: string | null;
  nid: string | null;
};

const FORM_ID = "staff-contact-profile-form";

export function StaffProfileForm({ data }: { data: StaffProfileData }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fieldClass = (editing: boolean) => (!editing ? "bg-muted" : undefined);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    const result = await updateStaffContactProfileAction(new FormData(e.currentTarget));
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
    <Card>
      <ProfileSectionHeader
        title={PROFILE_SECTION_TITLES.personal}
        isEditing={isEditing}
        formId={FORM_ID}
        onEdit={() => {
          setIsEditing(true);
          setError(null);
          setSuccess(false);
        }}
        onCancel={() => {
          formRef.current?.reset();
          setIsEditing(false);
          setError(null);
          setSuccess(false);
        }}
        saving={saving}
      />
      <CardContent>
        <form ref={formRef} id={FORM_ID} onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Emri *</Label>
            <Input
              id="firstName"
              name="firstName"
              defaultValue={data.firstName}
              required
              disabled={!isEditing}
              className={fieldClass(isEditing)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fatherName">Atësia</Label>
            <Input
              id="fatherName"
              name="fatherName"
              defaultValue={data.fatherName ?? ""}
              disabled={!isEditing}
              className={fieldClass(isEditing)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Mbiemri *</Label>
            <Input
              id="lastName"
              name="lastName"
              defaultValue={data.lastName}
              required
              disabled={!isEditing}
              className={fieldClass(isEditing)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nid">Numri Personal *</Label>
            <Input
              id="nid"
              name="nid"
              defaultValue={data.nid ?? ""}
              required={isEditing}
              disabled={!isEditing}
              className={fieldClass(isEditing)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={data.email} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Numri i Telefonit</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={data.phone ?? ""}
              disabled={!isEditing}
              className={fieldClass(isEditing)}
            />
          </div>
          {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
          {success && (
            <p className="text-sm text-gov-success md:col-span-2">
              U ruajt me sukses. Ndryshimi u regjistrua në audit.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
