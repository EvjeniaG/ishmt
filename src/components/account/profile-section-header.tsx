import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";

export function ProfileSectionHeader({
  title,
  isEditing,
  formId,
  onEdit,
  onCancel,
  saving,
}: {
  title: string;
  isEditing: boolean;
  formId?: string;
  onEdit?: () => void;
  onCancel?: () => void;
  saving?: boolean;
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0">
      <CardTitle>{title}</CardTitle>
      {onEdit && formId && onCancel ? (
        !isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Ndrysho
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
              Anulo
            </Button>
            <Button type="submit" form={formId} size="sm" disabled={saving}>
              {saving ? "Duke ruajtur…" : "Ruaj ndryshimet"}
            </Button>
          </div>
        )
      ) : null}
    </CardHeader>
  );
}
