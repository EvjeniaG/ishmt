"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useRef, useState } from "react";
import { ORG_STATUS_LABELS } from "@/lib/constants/org-status";
import { ProfileSectionHeader } from "@/components/account/profile-section-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { OWNER_BUILDING_ROLE_LABELS } from "@/lib/constants/owner-labels";
import { updateOwnerOrganizationAction } from "@/lib/actions/owner-actions";
import type { OwnerBuildingRole, OrgStatus } from "@prisma/client";

type Org = {
  name: string;
  nipt: string | null;
  legalForm: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  municipalityId: string | null;
  status: string;
  qkbValidated: boolean;
  representativeName?: string | null;
  representativeNid?: string | null;
  representativePhone?: string | null;
  representativeEmail?: string | null;
  ownerBuildingRole?: string | null;
  type: string;
};

type Municipality = { id: string; nameSq: string };

const FORM_ID = "company-org-profile-form";

export function EditOwnOrgForm({ org, municipalities }: { org: Org; municipalities: Municipality[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const isOwner = org.type === "OWNER";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    const result = isOwner
      ? await updateOwnerOrganizationAction(new FormData(e.currentTarget))
      : await import("@/lib/actions/organization-actions").then((m) =>
          m.updateOwnOrganizationAction(new FormData(e.currentTarget)),
        );

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

  const fieldClass = !isEditing ? "bg-muted" : undefined;
  const selectClass = `flex h-10 w-full rounded-md border px-3 text-sm ${!isEditing ? "bg-muted" : ""}`;

  return (
    <Card className="max-w-2xl">
      <ProfileSectionHeader
        title="Profili i organizatës"
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
        <p className="mb-4 text-sm text-muted-foreground">
          Statusi: {ORG_STATUS_LABELS[org.status as OrgStatus] ?? org.status}
          {org.type === "MAINTENANCE" && ` · QKB: ${org.qkbValidated ? "Validuar" : "Jo validuar"}`}
          {isOwner && " · Personi përgjegjës i ashensorit nuk kërkon validim QKB"}
        </p>
        <form ref={formRef} id={FORM_ID} onSubmit={onSubmit} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Emri / emri i organizatës *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={org.name}
              required
              disabled={!isEditing}
              className={fieldClass}
            />
          </div>
          {isOwner && (
            <>
              <div className="space-y-2">
                <Label htmlFor="nipt">NIPT / NID *</Label>
                <Input
                  id="nipt"
                  name="nipt"
                  defaultValue={org.nipt ?? ""}
                  required
                  disabled={!isEditing}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalForm">Forma ligjore</Label>
                <Input
                  id="legalForm"
                  name="legalForm"
                  defaultValue={org.legalForm ?? ""}
                  disabled={!isEditing}
                  className={fieldClass}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="municipalityId">Bashkia *</Label>
            <select
              id="municipalityId"
              name="municipalityId"
              defaultValue={org.municipalityId ?? ""}
              required={isOwner}
              disabled={!isEditing}
              className={selectClass}
            >
              <option value="">-</option>
              {municipalities.map((m) => (
                <option key={m.id} value={m.id}>{m.nameSq}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={org.email ?? ""}
              required={isOwner}
              disabled={!isEditing}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon *</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={org.phone ?? ""}
              required={isOwner}
              disabled={!isEditing}
              className={fieldClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresa *</Label>
            <Input
              id="address"
              name="address"
              defaultValue={org.address ?? ""}
              required={isOwner}
              disabled={!isEditing}
              className={fieldClass}
            />
          </div>
          {isOwner && (
            <>
              <div className="space-y-2">
                <Label htmlFor="representativeName">Emri i përfaqësuesit</Label>
                <Input
                  id="representativeName"
                  name="representativeName"
                  defaultValue={org.representativeName ?? ""}
                  disabled={!isEditing}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="representativeNid">NID i përfaqësuesit</Label>
                <Input
                  id="representativeNid"
                  name="representativeNid"
                  defaultValue={org.representativeNid ?? ""}
                  disabled={!isEditing}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="representativePhone">Telefoni i përfaqësuesit</Label>
                <Input
                  id="representativePhone"
                  name="representativePhone"
                  defaultValue={org.representativePhone ?? ""}
                  disabled={!isEditing}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="representativeEmail">Email i përfaqësuesit</Label>
                <Input
                  id="representativeEmail"
                  name="representativeEmail"
                  type="email"
                  defaultValue={org.representativeEmail ?? ""}
                  disabled={!isEditing}
                  className={fieldClass}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ownerBuildingRole">Roli në ndërtesë</Label>
                <select
                  id="ownerBuildingRole"
                  name="ownerBuildingRole"
                  defaultValue={org.ownerBuildingRole ?? ""}
                  disabled={!isEditing}
                  className={selectClass}
                >
                  <option value="">-</option>
                  {(Object.entries(OWNER_BUILDING_ROLE_LABELS) as [OwnerBuildingRole, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ),
                  )}
                </select>
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-gov-success">U ruajt me sukses. Ndryshimi u regjistrua në audit.</p>}
        </form>
      </CardContent>
    </Card>
  );
}
