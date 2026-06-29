"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Download,
  Eye,
  FileText,
  Trash2,
} from "lucide-react";
import {
  DocumentPreviewPanel,
  type ApplicationDocumentRow,
} from "@/components/applications/application-documents";
import type { ApplicationDocumentSpec } from "@/lib/documents/application-document-checklist";
import { cn } from "@/lib/utils";

type ChecklistItem = ApplicationDocumentSpec & { uploaded: boolean };

function formatFileSize(bytes: string): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Lista e dokumenteve sipas checklist-it - me parashikim, shkarkim dhe (opsional) fshirje. */
export function ApplicationDocumentChecklistView({
  title = "Dokumentet e kërkuara",
  checklist,
  documents,
  canDelete = false,
}: {
  title?: string;
  checklist: ChecklistItem[];
  documents: ApplicationDocumentRow[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const docByPurpose = useMemo(() => {
    const map = new Map<string, ApplicationDocumentRow>();
    for (const doc of documents) {
      if (doc.purpose && !map.has(doc.purpose)) {
        map.set(doc.purpose, doc);
      }
    }
    return map;
  }, [documents]);

  const previewDocs = useMemo(
    () =>
      checklist
        .map((item) => docByPurpose.get(item.purpose))
        .filter((d): d is ApplicationDocumentRow => Boolean(d)),
    [checklist, docByPurpose],
  );

  const previewIndex = previewId ? previewDocs.findIndex((d) => d.id === previewId) : -1;
  const previewDoc = previewIndex >= 0 ? previewDocs[previewIndex] : null;

  const required = checklist.filter((i) => i.required);
  const requiredDone = required.filter((i) => i.uploaded).length;

  async function onDelete(doc: ApplicationDocumentRow) {
    if (!window.confirm(`Hiq dokumentin "${doc.originalFilename}"?`)) return;
    setDeletingId(doc.id);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        setError(result.error ?? "Heqja e dokumentit dështoi");
        return;
      }
      if (previewId === doc.id) setPreviewId(null);
      router.refresh();
    } catch {
      setError("Heqja e dokumentit dështoi");
    } finally {
      setDeletingId(null);
    }
  }

  if (checklist.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {required.length > 0 && (
          <span className="text-xs font-medium text-muted-foreground">
            {requiredDone}/{required.length} të detyrueshme
          </span>
        )}
      </div>

      <div className={cn("grid gap-4", previewDoc && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]")}>
        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-background text-sm">
          {checklist.map((item) => {
            const doc = docByPurpose.get(item.purpose);
            const isActive = previewDoc?.id === doc?.id;
            return (
              <li
                key={item.purpose}
                className={cn(
                  "px-4 py-3",
                  isActive && "bg-gov-primary/[0.05]",
                  !doc && item.required && "bg-amber-50/30",
                )}
              >
                <div className="flex gap-3">
                  {doc ? (
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
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-snug text-foreground">
                      {item.label}
                      {item.required && <span className="text-amber-600"> *</span>}
                    </p>
                    {doc ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="truncate text-xs text-muted-foreground" title={doc.originalFilename}>
                          {doc.originalFilename}
                          {formatFileSize(doc.fileSize) ? ` · ${formatFileSize(doc.fileSize)}` : ""}
                        </span>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setPreviewId(doc.id)}
                            className="rounded-md p-1.5 text-gov-primary hover:bg-gov-primary/10"
                            title="Shiko"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <a
                            href={`/api/documents/${doc.id}/download`}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Shkarko"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => void onDelete(doc)}
                              disabled={deletingId === doc.id}
                              className="rounded-md p-1.5 text-destructive hover:bg-red-50 disabled:opacity-50"
                              title="Hiq"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.reason}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {previewDoc && previewIndex >= 0 && (
          <DocumentPreviewPanel
            doc={previewDoc}
            index={previewIndex}
            total={previewDocs.length}
            onPrevious={() => {
              if (previewIndex > 0) setPreviewId(previewDocs[previewIndex - 1]!.id);
            }}
            onNext={() => {
              if (previewIndex < previewDocs.length - 1) setPreviewId(previewDocs[previewIndex + 1]!.id);
            }}
            onClose={() => setPreviewId(null)}
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
