import { OrgType } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import type { RoleCode } from "@/lib/constants/roles";
import type { PermissionCode } from "@/lib/permissions/codes";
import type { OrgCapabilities } from "@/lib/organizations/org-capabilities";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      activeMembershipId: string;
      activeOrgId: string;
      activeOrgType: OrgType;
      activeOrgName: string;
      roleCode: RoleCode;
      permissions: PermissionCode[];
      orgCapabilities: OrgCapabilities | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    firstName: string;
    lastName: string;
    activeMembershipId: string;
    activeOrgId: string;
    activeOrgType: OrgType;
    activeOrgName: string;
    roleCode: RoleCode;
    permissions: PermissionCode[];
    orgCapabilities: OrgCapabilities | null;
  }
}
