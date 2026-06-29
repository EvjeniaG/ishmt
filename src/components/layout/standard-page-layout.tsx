import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";

export function StandardPageLayout({
  eyebrow,
  title,
  description,
  actions,
  banner,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
      />
      {banner}
      {children}
    </div>
  );
}
