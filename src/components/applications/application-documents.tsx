"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  FileText,
  Eye,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { DocumentChecklistPanel } from "@/components/applications/document-checklist";
import type { ApplicationDocumentSpec } from "@/lib/documents/application-document-checklist";
import { cn } from "@/lib/utils";

export type ApplicationDocumentRow = {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: string;
  classification: string;
  storagePending: boolean;
  uploadedAt: string;
  uploadedBy: string | null;
  purpose?: string;
};

type DocumentRow = ApplicationDocumentRow;

function isPdfDoc(doc: DocumentRow): boolean {
  return doc.mimeType === "application/pdf" || doc.originalFilename.toLowerCase().endsWith(".pdf");
}

function isImageDoc(doc: DocumentRow): boolean {
  return doc.mimeType.startsWith("image/");
}

function formatFileSize(bytes: string): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentPreviewPanel({
  doc,
  index,
  total,
  onPrevious,
  onNext,
  onClose,
}: {
  doc: ApplicationDocumentRow;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const previewUrl = `/api/documents/${doc.id}/preview`;
  const canInlinePreview = isPdfDoc(doc) || isImageDoc(doc);

  return (
    <div className="flex min-h-[22rem] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-gov-primary" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm font-medium" title={doc.originalFilename}>
          {doc.originalFilename}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onPrevious}
            disabled={index <= 0}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
            aria-label="Dokumenti i mëparshëm"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
            {index + 1} / {total}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={index >= total - 1}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
            aria-label="Dokumenti tjetër"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <a
            href={`/api/documents/${doc.id}/download`}
            className="ml-1 rounded-lg p-1.5 text-gov-primary hover:bg-gov-primary/10"
            title="Shkarko"
            aria-label="Shkarko dokumentin"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Mbyll parashikimin"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative min-h-[20rem] flex-1 bg-muted/10 lg:min-h-[24rem]">
        {canInlinePreview ? (
          isPdfDoc(doc) ? (
            <iframe
              key={doc.id}
              src={previewUrl}
              title={doc.originalFilename}
              className="h-full min-h-[20rem] w-full border-0 lg:min-h-[24rem]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={doc.id}
              src={previewUrl}
              alt={doc.originalFilename}
              className="mx-auto max-h-[28rem] w-full object-contain p-4"
            />
          )
        ) : (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
            <FileText className="h-10 w-10 opacity-40" aria-hidden />
            <p>Ky lloj skedari nuk shfaqet drejtpërdrejt në faqe.</p>
            <a
              href={`/api/documents/${doc.id}/download`}
              className="inline-flex items-center gap-1 text-gov-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              Shkarko për ta hapur
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function ApplicationDocuments({
  applicationId,
  documents,
  canUpload,
  canDelete,
  embedded = false,
  checklist = [],
  showChecklistSummary = true,
}: {
  applicationId: string;
  documents: ApplicationDocumentRow[];
  canUpload: boolean;
  /** Heqja e skedarëve - veçmas nga ngarkimi. */
  canDelete?: boolean;
  embedded?: boolean;
  checklist?: (ApplicationDocumentSpec & { uploaded: boolean })[];
  showChecklistSummary?: boolean;
}) {
  const allowDelete = canDelete ?? canUpload;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedPurpose, setSelectedPurpose] = useState(checklist[0]?.purpose ?? "OTHER");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const selectedSpec = checklist.find((item) => item.purpose === selectedPurpose);
  const previewIndex = previewId ? documents.findIndex((d) => d.id === previewId) : -1;
  const previewDoc = previewIndex >= 0 ? documents[previewIndex] : null;
  const previewOpen = previewDoc !== null;

  function openPreview(docId: string) {
    setPreviewId(docId);
  }

  function closePreview() {
    setPreviewId(null);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("entityType", "application");
    formData.set("entityId", applicationId);
    if (selectedSpec) {
      formData.set("purpose", selectedSpec.purpose);
      formData.set("classification", selectedSpec.classification);
    } else {
      formData.set("purpose", selectedPurpose === "OTHER" ? "" : selectedPurpose);
      formData.set("classification", "APPLICATION");
    }

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error ?? "Ngarkimi dështoi");
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Ngarkimi dështoi");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(doc: ApplicationDocumentRow, e: React.MouseEvent) {
    e.stopPropagation();
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

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void uploadFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  const content = (
    <div className="space-y-5">
      {showChecklistSummary && checklist.length > 0 && <DocumentChecklistPanel items={checklist} />}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-2 text-sm text-muted-foreground">Ende nuk ka dokumente të ngarkuara.</p>
        </div>
      ) : (
        <div className={cn("grid gap-4", previewOpen && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]")}>
          <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
            <p className="border-b bg-muted/30 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
              Skedarët e ngarkuar ({documents.length})
            </p>
            <ul className="max-h-[28rem] divide-y divide-border/60 overflow-y-auto text-sm">
              {documents.map((doc) => {
                const isActive = previewOpen && doc.id === previewId;
                const sizeLabel = formatFileSize(doc.fileSize);
                return (
                  <li key={doc.id}>
                    <div
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 transition-colors",
                        isActive ? "bg-gov-primary/[0.06]" : "hover:bg-muted/30",
                      )}
                    >
                      <FileText
                        className={cn("h-4 w-4 shrink-0", isActive ? "text-gov-primary" : "text-muted-foreground")}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate font-medium", isActive && "text-gov-primary")}>
                          {doc.originalFilename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {doc.classification}
                          {sizeLabel ? ` · ${sizeLabel}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openPreview(doc.id)}
                          className="rounded-lg p-1.5 text-gov-primary hover:bg-gov-primary/10"
                          title="Shiko"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Shkarko"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {allowDelete && (
                          <button
                            type="button"
                            onClick={(e) => void onDelete(doc, e)}
                            disabled={deletingId === doc.id}
                            className="rounded-lg p-1.5 text-destructive hover:bg-red-50 disabled:opacity-50"
                            title="Hiq"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {previewOpen && previewDoc && previewIndex >= 0 && (
            <DocumentPreviewPanel
              doc={previewDoc}
              index={previewIndex}
              total={documents.length}
              onPrevious={() => {
                if (previewIndex > 0) setPreviewId(documents[previewIndex - 1]!.id);
              }}
              onNext={() => {
                if (previewIndex < documents.length - 1) setPreviewId(documents[previewIndex + 1]!.id);
              }}
              onClose={closePreview}
            />
          )}
        </div>
      )}

      {canUpload && (
        <div className="space-y-4 border-t border-border/60 pt-5">
          {checklist.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Lloji i dokumentit</Label>
              <select
                value={selectedPurpose}
                onChange={(event) => setSelectedPurpose(event.target.value)}
                disabled={uploading}
                className="flex h-11 w-full rounded-xl border border-border/70 bg-background px-3 text-sm shadow-sm disabled:opacity-50"
              >
                {checklist.map((item) => (
                  <option key={item.purpose} value={item.purpose}>
                    {item.label}
                    {item.required ? " *" : ""}
                  </option>
                ))}
                <option value="OTHER">Dokument tjetër</option>
              </select>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={selectedSpec?.accept ?? ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"}
            disabled={uploading}
            onChange={onFileSelected}
            className="hidden"
          />

          <div
            role="button"
            tabIndex={0}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "workflow-upload-zone",
              dragOver && "workflow-upload-zone-active",
              uploading && "pointer-events-none opacity-70",
            )}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-gov-primary" aria-hidden />
            ) : (
              <Upload className="h-8 w-8 text-gov-primary/70" aria-hidden />
            )}
            <p className="text-sm font-medium text-foreground">
              {uploading ? "Duke ngarkuar…" : "Klikoni ose zvarritni skedarin këtu"}
            </p>
            <p className="text-xs text-muted-foreground">PDF, foto ose Word - ngarkohet automatikisht</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className="workflow-section">
      <div className="workflow-section-header">
        <h2 className="workflow-section-title">Dokumentet</h2>
        <p className="workflow-section-desc">Ngarkoni dokumentet e kërkuara për aplikimin tuaj</p>
      </div>
      <div className="workflow-section-body">{content}</div>
    </section>
  );
}
