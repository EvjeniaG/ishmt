import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { hasServiceCapability } from "@/lib/organizations/org-capabilities";

/** Inspektimi periodik kryhet vetëm nga OM/certifikuesi. */
export default async function LegacyMaintenanceInspectionRedirect() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");

  if (hasServiceCapability(session.user, "om")) {
    redirect("/portal/omi/inspektim-periodik");
  }

  redirect("/portal/dashboard");
}
