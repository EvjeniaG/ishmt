import type { ReactNode } from "react";
import { StandardPageLayout } from "@/components/layout/standard-page-layout";
import { DirectorateNavTabs } from "@/components/directorate/directorate-nav-tabs";
import { DIRECTORATE_EYEBROW, type DirectorateNavTab } from "@/lib/directorate/directorate-nav";

export function DirectoratePageShell({
  title,
  description,
  actions,
  banner,
  tabs,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  banner?: ReactNode;
  tabs?: DirectorateNavTab[];
  children: ReactNode;
}) {
  return (
    <StandardPageLayout
      eyebrow={DIRECTORATE_EYEBROW}
      title={title}
      description={description}
      actions={actions}
      banner={banner}
    >
      {tabs && tabs.length > 0 && <DirectorateNavTabs tabs={tabs} />}
      {children}
    </StandardPageLayout>
  );
}

export function DirectoratePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <StandardPageLayout eyebrow={DIRECTORATE_EYEBROW} title={title} description={description} actions={actions}>
      {null}
    </StandardPageLayout>
  );
}
