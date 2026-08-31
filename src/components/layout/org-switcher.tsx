"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "@/lib/navigation/use-app-router";
import { useEffect, useState, useTransition } from "react";
import { getUserMembershipsAction, switchMembershipAction } from "@/lib/actions/session-actions";

type MembershipOption = {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  roleCode: string;
  roleLabel: string;
};

export function OrgSwitcher() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [memberships, setMemberships] = useState<MembershipOption[]>([]);

  useEffect(() => {
    getUserMembershipsAction().then((result) => {
      if (result.success) setMemberships(result.memberships);
    });
  }, [session?.user?.activeMembershipId]);

  if (!session?.user) return null;

  const orgIds = new Set(memberships.map((m) => m.organizationId));
  const sameOrgMultiRole = orgIds.size === 1 && memberships.length > 1;
  if (memberships.length <= 1 || sameOrgMultiRole) return null;

  const activeMembershipId =
    session.user.activeMembershipId ??
    memberships.find((m) => m.organizationId === session.user.activeOrgId)?.membershipId ??
    memberships[0]?.membershipId;

  return (
    <select
      className="hidden h-10 max-w-[220px] truncate rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 sm:block"
      value={activeMembershipId}
      disabled={pending}
      onChange={(e) => {
        const membershipId = e.target.value;
        startTransition(async () => {
          const result = await switchMembershipAction(membershipId);
          if (result.success) {
            const selected = memberships.find((m) => m.membershipId === membershipId);
            await update({
              activeMembershipId: membershipId,
              activeOrgId: selected?.organizationId,
            });
            router.refresh();
          }
        });
      }}
    >
      {memberships.map((m) => (
        <option key={m.membershipId} value={m.membershipId}>
          {m.organizationName} · {m.roleLabel}
        </option>
      ))}
    </select>
  );
}
