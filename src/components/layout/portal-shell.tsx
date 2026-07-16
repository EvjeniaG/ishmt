import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { OrgSwitcher } from "@/components/layout/org-switcher";
import { PortalNotificationsMenu } from "@/components/layout/portal-notifications-menu";
import { PortalSearch } from "@/components/layout/portal-search";
import {
  PortalMenuButton,
  PortalNavProvider,
  PortalSidebarLayout,
} from "@/components/layout/portal-nav-provider";
import { PortalUserMenu } from "@/components/layout/portal-user-menu";
import { NotificationService } from "@/lib/services/notification-service";
import { SYSTEM_NAME, OWNER_TERM } from "@/lib/constants/owner-labels";

export async function PortalShell({
  children,
  role,
  roleLabel = OWNER_TERM,
  homeHref = "/portal/dashboard",
  showSearch = true,
  notificationsHref,
  profileHref,
}: {
  children: React.ReactNode;
  /** Përdorni PageHeader në përmbajtje - nuk renderohet më në shell. */
  title?: string;
  breadcrumb?: string;
  role?: string;
  roleLabel?: string;
  homeHref?: string;
  showSearch?: boolean;
  notificationsHref?: string;
  profileHref?: string;
}) {
  const session = await getAuthSession();
  const unreadCount =
    session?.user && notificationsHref
      ? await NotificationService.unreadCount(session.user.id, session.user.roleCode)
      : 0;
  const recentNotifications =
    session?.user && notificationsHref
      ? await NotificationService.listForUser(session.user.id, 4, session.user.roleCode)
      : [];

  const initials = session?.user
    ? `${session.user.firstName?.[0] ?? ""}${session.user.lastName?.[0] ?? ""}`
    : "";

  return (
    <PortalNavProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gov-header">
        <header className="z-40 shrink-0 border-b border-black/20 bg-gradient-to-r from-gov-header via-[#052a4a] to-gov-header text-white shadow-portal-lg print:hidden">
          <div className="pointer-events-none absolute inset-0 bg-header-shine" aria-hidden />
          <div className="relative flex h-16 items-center gap-3 px-4 lg:gap-5 lg:px-6">
            <PortalMenuButton />

            <Link href={homeHref} className="flex shrink-0 items-center gap-3">
              <div className="portal-header-logo">ISHMT</div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight tracking-tight">{SYSTEM_NAME}</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">{roleLabel}</p>
              </div>
            </Link>

            {showSearch && (
              <div className="hidden flex-1 md:flex md:justify-center lg:px-8">
                <PortalSearch />
              </div>
            )}

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {notificationsHref && session?.user && (
                <PortalNotificationsMenu
                  notificationsHref={notificationsHref}
                  initialUnreadCount={unreadCount}
                  notifications={recentNotifications.map((n) => ({
                    id: n.id,
                    title: n.title,
                    body: n.body,
                    createdAt: n.createdAt.toISOString(),
                    readAt: n.readAt?.toISOString() ?? null,
                    entityType: n.entityType,
                    entityId: n.entityId,
                  }))}
                />
              )}

              {session?.user && <OrgSwitcher />}

              {session?.user && (
                <PortalUserMenu
                  firstName={session.user.firstName}
                  lastName={session.user.lastName}
                  initials={initials}
                  roleCode={role ?? session.user.roleCode}
                  roleLabel={roleLabel}
                  orgName={session.user.activeOrgName}
                />
              )}
            </div>
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 overflow-hidden print:block print:overflow-visible">
          <PortalSidebarLayout role={role} />

          <main
            data-scroll-root
            className="portal-canvas min-h-0 flex-1 overflow-y-auto overflow-x-hidden lg:ml-[17.5rem] print:ml-0 print:overflow-visible"
          >
            <div className="portal-canvas-inner">{children}</div>
          </main>
        </div>
      </div>
    </PortalNavProvider>
  );
}
