import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES, type RoleCode } from "@/lib/constants/roles";
import {
  canAssignFieldInspections,
  isFieldInspectorRole,
} from "@/lib/permissions/ishmt-roles";
import { getDashboardPathForRole } from "@/lib/permissions/nav-paths";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function IshmtDocumentsRedirect() {
  const session = await getAuthSession();
  const role = session?.user?.roleCode as RoleCode | undefined;

  if (role === ROLE_CODES.ADMIN) {
    redirect("/ishmt/admin/audit");
  }
  if (role && canAssignFieldInspections(role)) {
    redirect("/ishmt/field-inspections");
  }
  if (role && isFieldInspectorRole(role)) {
    redirect("/ishmt/my-field-inspections");
  }
  if (role && isIshmtStaffRole(role)) {
    redirect("/ishmt/review");
  }
  redirect(getDashboardPathForRole(ROLE_CODES.OWNER));
}
