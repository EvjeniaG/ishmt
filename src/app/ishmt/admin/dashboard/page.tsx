import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminDashboard } from "@/components/ishmt/admin-dashboard";
import { getAuthSession } from "@/lib/auth";
import { requireAuthForPage } from "@/lib/auth/page-guards";
import { AdminDashboardService } from "@/lib/services/admin-dashboard-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function AdminSystemDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.ADMIN) redirect("/unauthorized");

  const ctx = await requireAuthForPage();
  const data = await AdminDashboardService.getDashboard(ctx);

  return (
    <AppShell title="Administrator i sistemit">
      <AdminDashboard data={data} />
    </AppShell>
  );
}
