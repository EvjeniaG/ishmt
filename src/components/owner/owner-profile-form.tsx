"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { updateAccountProfileAction } from "@/lib/actions/account-actions";
import { updateOwnerOrganizationAction } from "@/lib/actions/owner-actions";
import { ProfileSectionHeader } from "@/components/account/profile-section-header";
import { OWNER_BUILDING_ROLE_LABELS } from "@/lib/constants/owner-labels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { OwnerBuildingRole } from "@prisma/client";

type ProfileData = {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    nid: string | null;
  };
  org: {
    name: string;
    nipt: string | null;
    legalForm: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    municipalityId: string | null;
    ownerBuildingRole: OwnerBuildingRole | null;
    representativeName: string | null;
    representativeNid: string | null;
    representativePhone: string | null;
    representativeEmail: string | null;
    municipality: { nameSq: string; region: { nameSq: string } } | null;
  };
};

type Municipality = { id: string; nameSq: string };

const USER_FORM_ID = "owner-user-profile-form";
const ORG_FORM_ID = "owner-org-profile-form";

export function OwnerProfileForm({
  data,
  municipalities,
}: {
  data: ProfileData;
  municipalities: Municipality[];
}) {
  const router = useRouter();
  const userFormRef = useRef<HTMLFormElement>(null);
  const orgFormRef = useRef<HTMLFormElement>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState(false);
  const [orgSuccess, setOrgSuccess] = useState(false);

  async function onSubmitUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingUser(true);
    setUserSuccess(false);
    const result = await updateAccountProfileAction(new FormData(e.currentTarget));
    setSavingUser(false);
    if (!result.success) {
      setUserError(result.error);
      return;
    }
    setUserError(null);
    setUserSuccess(true);
    setIsEditingUser(false);
    router.refresh();
  }

  async function onSubmitOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingOrg(true);
    setOrgSuccess(false);
    const result = await updateOwnerOrganizationAction(new FormData(e.currentTarget));
    setSavingOrg(false);
    if (!result.success) {
      setOrgError(result.error);
      return;
    }
    setOrgError(null);
    setOrgSuccess(true);
    setIsEditingOrg(false);
    router.refresh();
  }

  const fieldClass = (editing: boolean) => (!editing ? "bg-muted" : undefined);
  const selectClass = (editing: boolean) =>
    `flex h-10 w-full rounded-md border px-3 text-sm ${!editing ? "bg-muted" : ""}`;

  return (
    <div className="space-y-6">
      <Card>
        <ProfileSectionHeader
          title="Të dhënat personale"
          isEditing={isEditingUser}
          formId={USER_FORM_ID}
          onEdit={() => {
            setIsEditingUser(true);
            setUserError(null);
            setUserSuccess(false);
          }}
          onCancel={() => {
            userFormRef.current?.reset();
            setIsEditingUser(false);
            setUserError(null);
            setUserSuccess(false);
          }}
          saving={savingUser}
        />
        <CardContent>
          <form ref={userFormRef} id={USER_FORM_ID} onSubmit={onSubmitUser} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Emri *</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={data.user.firstName}
                required
                disabled={!isEditingUser}
                className={fieldClass(isEditingUser)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Mbiemri *</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={data.user.lastName}
                required
                disabled={!isEditingUser}
                className={fieldClass(isEditingUser)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email</Label>
              <Input id="userEmail" value={data.user.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userPhone">Telefon</Label>
              <Input
                id="userPhone"
                name="phone"
                defaultValue={data.user.phone ?? ""}
                disabled={!isEditingUser}
                className={fieldClass(isEditingUser)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nid">NID</Label>
              <Input
                id="nid"
                name="nid"
                defaultValue={data.user.nid ?? ""}
                disabled={!isEditingUser}
                className={fieldClass(isEditingUser)}
              />
            </div>
            {userError && <p className="text-sm text-destructive md:col-span-2">{userError}</p>}
            {userSuccess && (
              <p className="text-sm text-gov-success md:col-span-2">
                U ruajt me sukses. Ndryshimi u regjistrua në audit.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <ProfileSectionHeader
          title="Të dhënat e subjektit përgjegjës"
          isEditing={isEditingOrg}
          formId={ORG_FORM_ID}
          onEdit={() => {
            setIsEditingOrg(true);
            setOrgError(null);
            setOrgSuccess(false);
          }}
          onCancel={() => {
            orgFormRef.current?.reset();
            setIsEditingOrg(false);
            setOrgError(null);
            setOrgSuccess(false);
          }}
          saving={savingOrg}
        />
        <CardContent>
          <form ref={orgFormRef} id={ORG_FORM_ID} onSubmit={onSubmitOrg} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ownerBuildingRole">Lloji i rolit *</Label>
              <select
                id="ownerBuildingRole"
                name="ownerBuildingRole"
                defaultValue={data.org.ownerBuildingRole ?? ""}
                required
                disabled={!isEditingOrg}
                className={selectClass(isEditingOrg)}
              >
                <option value="">- Zgjidhni -</option>
                {(Object.entries(OWNER_BUILDING_ROLE_LABELS) as [OwnerBuildingRole, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ),
                )}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Emri i subjektit *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={data.org.name}
                required
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nipt">NIPT *</Label>
              <Input
                id="nipt"
                name="nipt"
                defaultValue={data.org.nipt ?? ""}
                required
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalForm">Forma ligjore</Label>
              <Input
                id="legalForm"
                name="legalForm"
                defaultValue={data.org.legalForm ?? ""}
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email i subjektit *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={data.org.email ?? ""}
                required
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon *</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={data.org.phone ?? ""}
                required
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Adresa *</Label>
              <Input
                id="address"
                name="address"
                defaultValue={data.org.address ?? ""}
                required
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>
            <div className="space-y-2">
              <Label>Qarku</Label>
              <Input value={data.org.municipality?.region.nameSq ?? "-"} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipalityId">Bashkia *</Label>
              <select
                id="municipalityId"
                name="municipalityId"
                defaultValue={data.org.municipalityId ?? ""}
                required
                disabled={!isEditingOrg}
                className={selectClass(isEditingOrg)}
              >
                <option value="">-</option>
                {municipalities.map((m) => (
                  <option key={m.id} value={m.id}>{m.nameSq}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 border-t pt-4">
              <p className="mb-3 text-sm font-medium text-gov-primary">Përfaqësuesi ligjor</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="representativeName">Emër</Label>
              <Input
                id="representativeName"
                name="representativeName"
                defaultValue={data.org.representativeName ?? ""}
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="representativeNid">NID</Label>
              <Input
                id="representativeNid"
                name="representativeNid"
                defaultValue={data.org.representativeNid ?? ""}
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="representativePhone">Telefon</Label>
              <Input
                id="representativePhone"
                name="representativePhone"
                defaultValue={data.org.representativePhone ?? ""}
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="representativeEmail">Email</Label>
              <Input
                id="representativeEmail"
                name="representativeEmail"
                type="email"
                defaultValue={data.org.representativeEmail ?? ""}
                disabled={!isEditingOrg}
                className={fieldClass(isEditingOrg)}
              />
            </div>

            {orgError && <p className="text-sm text-destructive md:col-span-2">{orgError}</p>}
            {orgSuccess && (
              <p className="text-sm text-gov-success md:col-span-2">
                U ruajt me sukses. Ndryshimi u regjistrua në audit.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
