import { PageHeader } from "@/components/layout/page-header";

export function DirectoratePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <PageHeader
      eyebrow="Drejtoria e licencimit"
      title={title}
      description={description}
      actions={actions}
    />
  );
}
