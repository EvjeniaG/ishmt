"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useRef, useState } from "react";
import { updateCompanyContactProfileAction } from "@/lib/actions/account-actions";
import { updateCompanyOrganizationProfileAction } from "@/lib/actions/organization-actions";
import { ProfileSectionHeader } from "@/components/account/profile-section-header";
import { PROFILE_SECTION_TITLES } from "@/lib/registration/profile-sections";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type CompanyProfileData = {
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
  };
  canEditOrg: boolean;
};

const CONTACT_FORM_ID = "company-contact-profile-form";
const ORG_FORM_ID = "company-org-profile-form";

export function CompanyProfileForm({ data }: { data: CompanyProfileData }) {
  const router = useRouter();
  const contactFormRef = useRef<HTMLFormElement>(null);
  const orgFormRef = useRef<HTMLFormElement>(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [orgSuccess, setOrgSuccess] = useState(false);

  const fieldClass = (editing: boolean) => (!editing ? "bg-muted" : undefined);

  async function onSubmitContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingContact(true);
    setContactSuccess(false);
    const result = await updateCompanyContactProfileAction(new FormData(e.currentTarget));
    setSavingContact(false);
    if (!result.success) {
      setContactError(result.error);
      return;
    }
    setContactError(null);
    setContactSuccess(true);
    setIsEditingContact(false);
    router.refresh();
  }

  async function onSubmitOrg(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingOrg(true);
    setOrgSuccess(false);
    const result = await updateCompanyOrganizationProfileAction(new FormData(e.currentTarget));
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

  return (
    <div className="space-y-6">
      <Card>
        <ProfileSectionHeader
          title={PROFILE_SECTION_TITLES.business}
          isEditing={data.canEditOrg ? isEditingOrg : false}
          formId={data.canEditOrg ? ORG_FORM_ID : undefined}
          onEdit={
            data.canEditOrg
              ? () => {
                  setIsEditingOrg(true);
                  setOrgError(null);
                  setOrgSuccess(false);
                }
              : undefined
          }
          onCancel={
            data.canEditOrg
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
          <form ref={orgFormRef} id={ORG_FORM_ID} onSubmit={onSubmitOrg} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nipt">NIPT</Label>
              <Input id="nipt" value={data.org.nipt ?? ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Emri i organizatës *</Label>
              <Input
                id="name"
                name="name"
                defaultValue={data.org.name}
                required={data.canEditOrg && isEditingOrg}
                disabled={!data.canEditOrg || !isEditingOrg}
                className={fieldClass(data.canEditOrg && isEditingOrg)}
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

      <Card>
        <ProfileSectionHeader
          title={PROFILE_SECTION_TITLES.contact}
          isEditing={isEditingContact}
          formId={CONTACT_FORM_ID}
          onEdit={() => {
            setIsEditingContact(true);
            setContactError(null);
            setContactSuccess(false);
          }}
          onCancel={() => {
            contactFormRef.current?.reset();
            setIsEditingContact(false);
            setContactError(null);
            setContactSuccess(false);
          }}
          saving={savingContact}
        />
        <CardContent>
          <form
            ref={contactFormRef}
            id={CONTACT_FORM_ID}
            onSubmit={onSubmitContact}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="firstName">Emri *</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={data.user.firstName}
                required
                disabled={!isEditingContact}
                className={fieldClass(isEditingContact)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Mbiemri *</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={data.user.lastName}
                required
                disabled={!isEditingContact}
                className={fieldClass(isEditingContact)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" value={data.user.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Numri i Telefonit *</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={data.user.phone ?? ""}
                required={isEditingContact}
                disabled={!isEditingContact}
                className={fieldClass(isEditingContact)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="personalNumber">Numri Personal (opsional)</Label>
              <Input
                id="personalNumber"
                name="personalNumber"
                defaultValue={data.user.nid ?? ""}
                disabled={!isEditingContact}
                className={fieldClass(isEditingContact)}
              />
            </div>
            {contactError && <p className="text-sm text-destructive md:col-span-2">{contactError}</p>}
            {contactSuccess && (
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
