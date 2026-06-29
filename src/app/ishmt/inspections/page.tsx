import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import {
  canAssignFieldInspections,
  isFieldInspectorRole,
} from "@/lib/permissions/ishmt-roles";
import { isIshmtStaffRole } from "@/lib/permissions/routes";

export default async function IshmtInspectionsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  const role = session.user.roleCode;
  if (!isIshmtStaffRole(role)) redirect("/unauthorized");

  if (canAssignFieldInspections(role)) {
    redirect("/ishmt/field-inspections");
  }
  if (isFieldInspectorRole(role)) {
    redirect("/ishmt/my-field-inspections");
  }

  redirect("/ishmt/search");
}
