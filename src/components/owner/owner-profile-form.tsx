"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useRef, useState } from "react";
import { updateOwnerContactProfileAction } from "@/lib/actions/account-actions";
import { updateOwnerOrganizationAction } from "@/lib/actions/owner-actions";
import { ProfileSectionHeader } from "@/components/account/profile-section-header";
import { PROFILE_SECTION_TITLES } from "@/lib/registration/profile-sections";
import {
  ownerRequiresNipt,
  ownerSubjectNameRequired,
} from "@/lib/registration/owner-entity-role";
import { OWNER_BUILDING_ROLE_LABELS } from "@/lib/constants/owner-labels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { OwnerBuildingRole } from "@prisma/client";

type ProfileData = {
  user: {
    firstName: string;
    lastName: string;
    fatherName: string | null;
    email: string;
    phone: string | null;
    nid: string | null;
    birthDate: Date | string | null;
  };
  org: {
    name: string;
    nipt: string | null;
    ownerBuildingRole: OwnerBuildingRole | null;
  };
};

const USER_FORM_ID = "owner-user-profile-form";
const ORG_FORM_ID = "owner-org-profile-form";

function formatBirthDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function OwnerProfileForm({ data }: { data: ProfileData }) {
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

  const ownerRole = data.org.ownerBuildingRole;
  const showSubjectName = ownerSubjectNameRequired(ownerRole ?? undefined);
  const showNipt = ownerRequiresNipt(ownerRole ?? undefined);
  const roleLabel = ownerRole ? OWNER_BUILDING_ROLE_LABELS[ownerRole] : "-";
  const canEditOrg = showSubjectName || showNipt;

  async function onSubmitUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingUser(true);
    setUserSuccess(false);
    const result = await updateOwnerContactProfileAction(new FormData(e.currentTarget));
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
    const fd = new FormData(e.currentTarget);
    if (ownerRole) {
      fd.set("ownerBuildingRole", ownerRole);
    }
    const result = await updateOwnerOrganizationAction(fd);
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

  return (
    <div className="space-y-6">
      <Card>
        <ProfileSectionHeader
          title={PROFILE_SECTION_TITLES.ownerSubject}
          isEditing={canEditOrg ? isEditingOrg : false}
          formId={canEditOrg ? ORG_FORM_ID : undefined}
          onEdit={
            canEditOrg
              ? () => {
                  setIsEditingOrg(true);
                  setOrgError(null);
                  setOrgSuccess(false);
                }
              : undefined
          }
          onCancel={
            canEditOrg
              ? () => {
                  orgFormRef.current?.reset();
                  setIsEditingOrg(false);
                  setOrgError(null);
                  setOrgSuccess(false);
                }
              : undefined
          }
          saving={savingOrg}
        />
        <CardContent>
          {canEditOrg ? (
            <form ref={orgFormRef} id={ORG_FORM_ID} onSubmit={onSubmitOrg} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Lloji i subjektit</Label>
                <Input value={roleLabel} disabled className="bg-muted" />
              </div>
              {showSubjectName && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Emri i subjektit *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={data.org.name}
                    required={isEditingOrg}
                    disabled={!isEditingOrg}
                    className={fieldClass(isEditingOrg)}
                  />
                </div>
              )}
              {showNipt && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nipt">NIPT *</Label>
                  <Input
                    id="nipt"
                    name="nipt"
                    defaultValue={data.org.nipt ?? ""}
                    required={isEditingOrg}
                    disabled={!isEditingOrg}
                    className={fieldClass(isEditingOrg)}
                  />
                </div>
              )}
              {orgError && <p className="text-sm text-destructive md:col-span-2">{orgError}</p>}
              {orgSuccess && (
                <p className="text-sm text-gov-success md:col-span-2">
                  U ruajt me sukses. Ndryshimi u regjistrua në audit.
                </p>
              )}
            </form>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Lloji i subjektit</Label>
                <Input value={roleLabel} disabled className="bg-muted" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <ProfileSectionHeader
          title={PROFILE_SECTION_TITLES.ownerContact}
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
              <Label htmlFor="fatherName">Atësia *</Label>
              <Input
                id="fatherName"
                name="fatherName"
                defaultValue={data.user.fatherName ?? ""}
                required={isEditingUser}
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
              <Label htmlFor="personalNumber">Numri Personal *</Label>
              <Input
                id="personalNumber"
                name="personalNumber"
                defaultValue={data.user.nid ?? ""}
                required={isEditingUser}
                disabled={!isEditingUser}
                className={fieldClass(isEditingUser)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data e Lindjes *</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={formatBirthDate(data.user.birthDate)}
                required={isEditingUser}
                disabled={!isEditingUser}
                className={fieldClass(isEditingUser)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email *</Label>
              <Input id="userEmail" value={data.user.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="userPhone">Numri i Telefonit *</Label>
              <Input
                id="userPhone"
                name="phone"
                defaultValue={data.user.phone ?? ""}
                required={isEditingUser}
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
    </div>
  );
}
