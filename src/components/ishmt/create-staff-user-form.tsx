"use client";

import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { useRouter } from "@/lib/navigation/use-app-router";
import { adminCreateStaffUserAction } from "@/lib/actions/ishmt-admin-actions";
import { rolesForAdminStaffOrg, type StaffOrgOption } from "@/lib/admin/staff-user-options";
import { getRoleLabel } from "@/lib/constants/role-labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateStaffUserForm({ organizations }: { organizations: StaffOrgOption[] }) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? "");
  const [roleCode, setRoleCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    email: string;
    nid: string;
    temporaryPassword: string;
    organizationName: string;
    roleCode: string;
  } | null>(null);

  const selectedOrg = organizations.find((org) => org.id === organizationId) ?? organizations[0];
  const roleOptions = useMemo(
    () => (selectedOrg ? rolesForAdminStaffOrg(selectedOrg.type) : []),
    [selectedOrg],
  );

  const effectiveRole = roleCode && roleOptions.includes(roleCode as (typeof roleOptions)[number])
    ? roleCode
    : roleOptions[0] ?? "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreated(null);

    const form = new FormData(e.currentTarget);
    const result = await adminCreateStaffUserAction({
      organizationId,
      roleCode: effectiveRole,
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      nid: String(form.get("nid") ?? ""),
      phone: String(form.get("phone") ?? "") || undefined,
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.data) {
      setCreated(result.data);
      e.currentTarget.reset();
      setOrganizationId(organizations[0]?.id ?? "");
      setRoleCode("");
      router.refresh();
    }
  }

  if (organizations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nuk u gjet organizata IQMT ose Drejtoria e Politikave. Ekzekutoni seed-in e sistemit.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {created && (
        <div className="portal-institutional-notice portal-institutional-notice-warning">
          <div className="portal-institutional-notice-icon">
            <UserPlus className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="portal-institutional-notice-title">
              Përdoruesi u krijua — {created.organizationName} · {getRoleLabel(created.roleCode)}
            </p>
            <p className="portal-institutional-notice-body mt-1 text-sm">
              Email: <span className="font-mono">{created.email}</span>
              {" · "}
              NID: <span className="font-mono">{created.nid}</span>
            </p>
            <p className="portal-institutional-notice-body mt-2 font-mono text-base">
              {created.temporaryPassword}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Jepeni kredencialet në mënyrë të sigurt. Hyrja bëhet me Numrin Personal (NID) dhe fjalëkalimin e përkohshëm.
            </p>
            <Button type="button" size="sm" variant="outline" className="mt-3 rounded-lg" onClick={() => setCreated(null)}>
              Mbyll
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="staff-org">Organizata</Label>
          <select
            id="staff-org"
            value={organizationId}
            onChange={(e) => {
              setOrganizationId(e.target.value);
              setRoleCode("");
            }}
            className="flex h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary/30"
            required
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="staff-role">Roli / aksesi</Label>
          <select
            id="staff-role"
            value={effectiveRole}
            onChange={(e) => setRoleCode(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-border/80 bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary/30"
            required
          >
            {roleOptions.map((code) => (
              <option key={code} value={code}>
                {getRoleLabel(code)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="staff-firstName">Emri</Label>
          <Input id="staff-firstName" name="firstName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-lastName">Mbiemri</Label>
          <Input id="staff-lastName" name="lastName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-nid">Numri Personal (NID)</Label>
          <Input id="staff-nid" name="nid" required placeholder="p.sh. I90101001A" className="font-mono uppercase" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input id="staff-email" name="email" type="email" required placeholder="emri@ishmt.gov.al" />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="staff-phone">Telefon (opsional)</Label>
          <Input id="staff-phone" name="phone" placeholder="+35569..." />
        </div>

        {error && (
          <p className="lg:col-span-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="lg:col-span-2">
          <Button type="submit" disabled={loading || !effectiveRole} className="rounded-lg">
            <UserPlus className="mr-1.5 h-4 w-4" aria-hidden />
            {loading ? "Duke krijuar…" : "Shto përdorues"}
          </Button>
        </div>
      </form>
    </div>
  );
}
