import { OrgType } from "@prisma/client";
import type { DefaultSession } from "next-auth";
import type { RoleCode } from "@/lib/constants/roles";
import type { PermissionCode } from "@/lib/permissions/codes";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      activeOrgId: string;
      activeOrgType: OrgType;
      activeOrgName: string;
      roleCode: RoleCode;
      permissions: PermissionCode[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    firstName: string;
    lastName: string;
    activeOrgId: string;
    activeOrgType: OrgType;
    activeOrgName: string;
    roleCode: RoleCode;
    permissions: PermissionCode[];
  }
}
