import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { ROLE_CODES } from "@/lib/constants/roles";

/** Inspektimi periodik kryhet vetëm nga OMI/certifikuesi. */
export default async function LegacyMaintenanceInspectionRedirect() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (session.user.roleCode === ROLE_CODES.CERTIFIER) {
    redirect("/portal/omi/inspektim-periodik");
  }

  redirect("/portal/dashboard");
}
