"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useState } from "react";
import { KeyRound, Link2, LockOpen, Search, UserCheck, UserX } from "lucide-react";
import {
  adminCreatePasswordResetLinkAction,
  adminResetUserPasswordAction,
  setUserActiveAction,
  unlockUserAction,
} from "@/lib/actions/ishmt-admin-actions";
import { WorkflowStatusChip } from "@/components/applications/application-status-badge";
import { PortalEmptyState, PortalTableWrap } from "@/components/shared/portal-table";
import { Button } from "@/components/ui/button";
import { getRoleLabel } from "@/lib/constants/role-labels";
import { cn } from "@/lib/utils";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  nid: string | null;
  isActive: boolean;
  lockedUntil: Date | null;
  memberships: {
    organization: { name: string; type: string };
    role: { code: string; name: string };
  }[];
};

function UserStatus({ user }: { user: UserRow }) {
  const locked = user.lockedUntil && new Date(user.lockedUntil) > new Date();

  if (!user.isActive) {
    return <WorkflowStatusChip label="Jo aktiv" tone="neutral" />;
  }
  if (locked) {
    return <WorkflowStatusChip label="I bllokuar" tone="danger" />;
  }
  return <WorkflowStatusChip label="Aktiv" tone="done" />;
}

export function UserAdminTable({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [passwordReset, setPasswordReset] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);
  const [resetLink, setResetLink] = useState<{
    email: string;
    resetUrl: string;
    expiresAt: string;
  } | null>(null);

  async function toggleActive(userId: string, isActive: boolean) {
    setError(null);
    const result = await setUserActiveAction(userId, !isActive);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function unlock(userId: string) {
    setError(null);
    const result = await unlockUserAction(userId);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function resetPassword(userId: string, email: string) {
    if (
      !window.confirm(
        `Rivendos fjalëkalimin për ${email}?\n\nDo gjenerohet një fjalëkalim i ri i përkohshëm.`,
      )
    ) {
      return;
    }

    setError(null);
    setPasswordReset(null);
    setResetLink(null);
    setLoadingId(userId);

    const result = await adminResetUserPasswordAction(userId);
    setLoadingId(null);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setPasswordReset(result.data ?? null);
    router.refresh();
  }

  async function createResetLink(userId: string, email: string) {
    if (!window.confirm(`Krijo link rivendosjeje për ${email}?\n\nLinku skadon pas 1 ore.`)) {
      return;
    }

    setError(null);
    setPasswordReset(null);
    setResetLink(null);
    setLoadingId(userId);

    const result = await adminCreatePasswordResetLinkAction(userId);
    setLoadingId(null);

    if (!result.success) {
      setError(result.error);
      return;
    }

    if (result.data) {
      setResetLink({
        email: result.data.email,
        resetUrl: result.data.resetUrl,
        expiresAt: new Date(result.data.expiresAt).toLocaleString("sq-AL"),
      });
    }
  }

  if (users.length === 0) {
    return <PortalEmptyState>Nuk u gjet asnjë përdorues.</PortalEmptyState>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {passwordReset && (
        <div className="portal-institutional-notice portal-institutional-notice-warning">
          <div className="portal-institutional-notice-icon">
            <KeyRound className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="portal-institutional-notice-title">Fjalëkalimi u rivendos - {passwordReset.email}</p>
            <p className="portal-institutional-notice-body mt-1 font-mono text-base">{passwordReset.temporaryPassword}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Jepeni përdoruesit në mënyrë të sigurt. Pas hyrjes, rekomandohet ta ndryshojë nga Profili.
            </p>
            <Button type="button" size="sm" variant="outline" className="mt-3 rounded-lg" onClick={() => setPasswordReset(null)}>
              Mbyll
            </Button>
          </div>
        </div>
      )}

      {resetLink && (
        <div className="portal-institutional-notice portal-institutional-notice-info">
          <div className="portal-institutional-notice-icon">
            <Link2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="portal-institutional-notice-title">Link rivendosjeje - {resetLink.email}</p>
            <p className="portal-institutional-notice-body mt-1 break-all font-mono text-xs">{resetLink.resetUrl}</p>
            <p className="mt-2 text-xs text-muted-foreground">Skadon: {resetLink.expiresAt}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => void navigator.clipboard.writeText(resetLink.resetUrl)}
              >
                Kopjo linkun
              </Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-lg" onClick={() => setResetLink(null)}>
                Mbyll
              </Button>
            </div>
          </div>
        </div>
      )}

      <PortalTableWrap>
        <thead>
          <tr>
            <th className="w-12">#</th>
            <th>Përdoruesi</th>
            <th>NID</th>
            <th>Email</th>
            <th>Roli</th>
            <th>Organizata</th>
            <th>Statusi</th>
            <th className="text-right">Veprime</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, index) => {
            const primaryMembership = u.memberships[0];
            const locked = u.lockedUntil && new Date(u.lockedUntil) > new Date();
            const busy = loadingId === u.id;

            return (
              <tr key={u.id}>
                <td className="portal-table-num text-muted-foreground">{index + 1}</td>
                <td>
                  <span className="font-semibold text-foreground">
                    {u.firstName} {u.lastName}
                  </span>
                </td>
                <td className="portal-table-num whitespace-nowrap font-mono text-xs">{u.nid ?? "-"}</td>
                <td className="max-w-[12rem] truncate text-muted-foreground">{u.email}</td>
                <td>
                  {primaryMembership ? (
                    <span className="text-sm">{getRoleLabel(primaryMembership.role.code)}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                  {u.memberships.length > 1 && (
                    <span className="ml-1 text-xs text-muted-foreground">+{u.memberships.length - 1}</span>
                  )}
                </td>
                <td className="max-w-[10rem] truncate text-muted-foreground">
                  {primaryMembership?.organization.name ?? "-"}
                </td>
                <td>
                  <UserStatus user={u} />
                </td>
                <td className="text-right">
                  <div className="inline-flex flex-wrap justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant={u.isActive ? "outline" : "default"}
                      disabled={busy}
                      className="h-8 rounded-lg px-2.5 text-xs"
                      onClick={() => toggleActive(u.id, u.isActive)}
                    >
                      {u.isActive ? (
                        <>
                          <UserX className="mr-1 h-3.5 w-3.5" />
                          Çaktivizo
                        </>
                      ) : (
                        <>
                          <UserCheck className="mr-1 h-3.5 w-3.5" />
                          Aktivizo
                        </>
                      )}
                    </Button>
                    {locked && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        className="h-8 rounded-lg px-2.5 text-xs"
                        onClick={() => unlock(u.id)}
                      >
                        <LockOpen className="mr-1 h-3.5 w-3.5" />
                        Hap
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !u.isActive}
                      className={cn("h-8 rounded-lg px-2.5 text-xs")}
                      onClick={() => resetPassword(u.id, u.email)}
                    >
                      <KeyRound className="mr-1 h-3.5 w-3.5" />
                      Fjalëkalimi
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy || !u.isActive}
                      className="h-8 rounded-lg px-2.5 text-xs"
                      onClick={() => createResetLink(u.id, u.email)}
                    >
                      <Link2 className="mr-1 h-3.5 w-3.5" />
                      Link
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </PortalTableWrap>
    </div>
  );
}

export function UserAdminSearchForm({ defaultQuery }: { defaultQuery?: string }) {
  return (
    <form method="get" className="flex flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={defaultQuery ?? ""}
          placeholder="Emër, email ose NID…"
          className="flex h-10 w-full rounded-lg border border-border/80 bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gov-primary/30"
        />
      </div>
      <Button type="submit" className="h-10 shrink-0 rounded-lg px-5">
        Kërko
      </Button>
    </form>
  );
}
