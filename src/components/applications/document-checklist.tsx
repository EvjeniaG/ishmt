import { CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApplicationDocumentSpec } from "@/lib/documents/application-document-checklist";

type ChecklistItem = ApplicationDocumentSpec & { uploaded: boolean };

export function DocumentChecklistPanel({
  items,
  title = "Dokumentet e kërkuara",
}: {
  items: ChecklistItem[];
  title?: string;
}) {
  if (items.length === 0) return null;

  const required = items.filter((i) => i.required);
  const requiredDone = required.filter((i) => i.uploaded).length;

  return (
    <div className="workflow-doc-panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {required.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            {requiredDone}/{required.length} të detyrueshme
          </span>
        )}
      </div>
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            key={item.purpose}
            className={cn(
              "workflow-doc-item",
              item.uploaded && "workflow-doc-item-done",
              !item.uploaded && item.required && "workflow-doc-item-missing",
            )}
          >
            {item.uploaded ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gov-success" aria-hidden />
            ) : (
              <CircleAlert
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  item.required ? "text-amber-600" : "text-muted-foreground",
                )}
                aria-hidden
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium leading-snug text-foreground">
                {item.label}
                {item.required && <span className="text-amber-600"> *</span>}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {item.uploaded ? "Ngarkuar" : item.reason}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Pamje e thjeshtë read-only (p.sh. dokumentet e instaluesit). */
export function DocumentChecklist({
  items,
  title,
}: {
  items: ChecklistItem[];
  title?: string;
}) {
  return <DocumentChecklistPanel items={items} title={title} />;
}
