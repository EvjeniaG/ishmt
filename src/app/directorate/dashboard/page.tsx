import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DirectorateDashboard } from "@/components/directorate/directorate-dashboard";
import { getAuthSession } from "@/lib/auth";
import { DirectorateDashboardService } from "@/lib/services/directorate-dashboard-service";
import { ROLE_CODES } from "@/lib/constants/roles";

export default async function DirectorateDashboardPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect("/auth/login");
  if (session.user.roleCode !== ROLE_CODES.DIRECTORATE) redirect("/unauthorized");

  const data = await DirectorateDashboardService.getOverview();

  return (
    <AppShell title="Paneli">
      <DirectorateDashboard data={data} />
    </AppShell>
  );
}
