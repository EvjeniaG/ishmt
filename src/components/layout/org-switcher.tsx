"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getUserMembershipsAction, switchOrganizationAction } from "@/lib/actions/session-actions";

type MembershipOption = {
  organizationId: string;
  organizationName: string;
  roleCode: string;
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
  }, [session?.user?.activeOrgId]);

  if (!session?.user || memberships.length <= 1) return null;

  return (
    <select
      className="hidden h-10 max-w-[180px] truncate rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/15 focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 sm:block"
      value={session.user.activeOrgId}
      disabled={pending}
      onChange={(e) => {
        const orgId = e.target.value;
        startTransition(async () => {
          const result = await switchOrganizationAction(orgId);
          if (result.success) {
            await update({ activeOrgId: orgId });
            router.refresh();
          }
        });
      }}
    >
      {memberships.map((m) => (
        <option key={m.organizationId} value={m.organizationId}>
          {m.organizationName} ({m.roleCode})
        </option>
      ))}
    </select>
  );
}
