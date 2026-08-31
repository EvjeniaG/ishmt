"use client";

import { useRouter } from "@/lib/navigation/use-app-router";
import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Trash2,
  Download,
  FileText,
  Eye,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import type { ApplicationDocumentSpec, RegistrationDocPhase } from "@/lib/documents/application-document-checklist";
import {
  filterSupplementaryDocuments,
  isSupplementaryDocumentPurpose,
  supplementaryDocumentPurpose,
  SUPPLEMENTARY_PHASE_LABELS,
} from "@/lib/documents/application-document-checklist";
import { cn } from "@/lib/utils";
import { WorkflowSection, WorkflowSubsection } from "@/components/applications/workflow-section";

export type ApplicationDocumentRow = {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: string;
  classification: string;
  storagePending: boolean;
  uploadedAt: string;
  uploadedById?: string | null;
  uploadedBy: string | null;
  purpose?: string;
};

type ChecklistItem = ApplicationDocumentSpec & { uploaded: boolean };

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

function canRemoveDocument(doc: ApplicationDocumentRow, currentUserId?: string | null): boolean {
  return Boolean(currentUserId && doc.uploadedById === currentUserId);
}

function DocumentActionButtons({
  doc,
  currentUserId,
  onPreview,
  onDelete,
  deleting,
  previewActive,
}: {
  doc: ApplicationDocumentRow;
  currentUserId?: string | null;
  onPreview: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  previewActive?: boolean;
}) {
  const showDelete = onDelete && canRemoveDocument(doc, currentUserId);

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={onPreview}
        className={cn(
          "rounded-md p-1.5 hover:bg-gov-primary/10",
          previewActive ? "bg-gov-primary/10 text-gov-primary" : "text-gov-primary",
        )}
        title="Shiko"
        aria-label="Shiko dokumentin"
      >
        <Eye className="h-4 w-4" />
      </button>
      <a
        href={`/api/documents/${doc.id}/download`}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Shkarko"
        aria-label="Shkarko dokumentin"
      >
        <Download className="h-4 w-4" />
      </a>
      {showDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="rounded-md p-1.5 text-destructive hover:bg-red-50 disabled:opacity-50"
          title="Hiq"
          aria-label="Hiq dokumentin"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function DocumentPreviewPanel({
  doc,
  index,
  total,
  onPrevious,
  onNext,
  onClose,
  compact = false,
}: {
  doc: ApplicationDocumentRow;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onClose: () => void;
  compact?: boolean;
}) {
  const previewUrl = `/api/documents/${doc.id}/preview`;
  const canInlinePreview = isPdfDoc(doc) || isImageDoc(doc);
  const minH = compact ? "min-h-[12rem]" : "min-h-[16rem]";

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-lg border border-border/70 bg-background", minH)}>
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <FileText className="h-4 w-4 shrink-0 text-gov-primary" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm font-medium" title={doc.originalFilename}>
          {doc.originalFilename}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={onPrevious}
                disabled={index <= 0}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                aria-label="Dokumenti i mëparshëm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[2.5rem] text-center text-xs text-muted-foreground">
                {index + 1}/{total}
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
            </>
          )}
          <a
            href={`/api/documents/${doc.id}/download`}
            className="rounded-lg p-1.5 text-gov-primary hover:bg-gov-primary/10"
            title="Shkarko"
            aria-label="Shkarko dokumentin"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Mbyll parashikimin"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={cn("relative flex-1 bg-muted/10", minH)}>
        {canInlinePreview ? (
          isPdfDoc(doc) ? (
            <iframe
              key={doc.id}
              src={previewUrl}
              title={doc.originalFilename}
              className={cn("h-full w-full border-0", minH)}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={doc.id}
              src={previewUrl}
              alt={doc.originalFilename}
              className="mx-auto max-h-[20rem] w-full object-contain p-3"
            />
          )
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
            <FileText className="h-8 w-8 opacity-40" aria-hidden />
            <p>Nuk shfaqet në faqe - shkarkojeni për ta hapur.</p>
            <a
              href={`/api/documents/${doc.id}/download`}
              className="inline-flex items-center gap-1 text-gov-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              Shkarko
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentFileRow({
  doc,
  currentUserId,
  onDelete,
  deleting,
}: {
  doc: ApplicationDocumentRow;
  currentUserId?: string | null;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const sizeLabel = formatFileSize(doc.fileSize);

  return (
    <div className="min-w-0 flex-1 space-y-2">
      <div className="workflow-doc-file-row">
        <FileText className="h-4 w-4 shrink-0 text-gov-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm" title={doc.originalFilename}>
          {doc.originalFilename}
          {sizeLabel ? <span className="text-muted-foreground"> · {sizeLabel}</span> : null}
        </span>
        <DocumentActionButtons
          doc={doc}
          currentUserId={currentUserId}
          onPreview={() => setPreviewOpen((v) => !v)}
          onDelete={onDelete}
          deleting={deleting}
          previewActive={previewOpen}
        />
      </div>
      {previewOpen && (
        <DocumentPreviewPanel
          doc={doc}
          index={0}
          total={1}
          onPrevious={() => undefined}
          onNext={() => undefined}
          onClose={() => setPreviewOpen(false)}
          compact
        />
      )}
    </div>
  );
}

function UploadDropRow({
  accept,
  maxMb,
  uploading,
  dragOver,
  onClick,
  onKeyDown,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  accept: string;
  maxMb: number;
  uploading: boolean;
  dragOver: boolean;
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  void accept;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "workflow-upload-zone workflow-upload-zone-row min-w-0 flex-1 !py-3",
        dragOver && "workflow-upload-zone-active",
        uploading && "pointer-events-none opacity-70",
      )}
    >
      {uploading ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gov-primary" aria-hidden />
          <span className="text-sm text-muted-foreground">Duke ngarkuar…</span>
        </>
      ) : (
        <>
          <Upload className="h-4 w-4 shrink-0 text-gov-primary/80" aria-hidden />
          <span className="truncate text-sm font-medium text-foreground">Ngarko skedarin</span>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">· max {maxMb} MB</span>
        </>
      )}
    </div>
  );
}

function DocumentSlotCard({
  applicationId,
  spec,
  doc,
  canUpload,
  currentUserId,
}: {
  applicationId: string;
  spec: ChecklistItem;
  doc?: ApplicationDocumentRow;
  canUpload: boolean;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const uploaded = Boolean(doc);

  async function uploadFile(file: File, replace = false) {
    if (file.size > spec.maxMb * 1024 * 1024) {
      setError(`Skedari kalon ${spec.maxMb} MB.`);
      return;
    }

    if (replace && doc) {
      const removed = await deleteDocument(doc.id, false);
      if (!removed) return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("entityType", "application");
    formData.set("entityId", applicationId);
    formData.set("purpose", spec.purpose);
    formData.set("classification", spec.classification);

    try {
      const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error ?? "Ngarkimi dështoi");
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      if (replaceInputRef.current) replaceInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Ngarkimi dështoi");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(documentId: string, confirm = true): Promise<boolean> {
    if (confirm && doc && !window.confirm(`Hiq dokumentin "${doc.originalFilename}"?`)) {
      return false;
    }
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        setError(result.error ?? "Heqja e dokumentit dështoi");
        return false;
      }
      if (!confirm) router.refresh();
      return true;
    } catch {
      setError("Heqja e dokumentit dështoi");
      return false;
    } finally {
      setDeleting(false);
    }
  }

  async function onDelete() {
    if (!doc) return;
    const ok = await deleteDocument(doc.id, true);
    if (ok) router.refresh();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file, uploaded);
  }

  const canReplace = canUpload && uploaded && doc && canRemoveDocument(doc, currentUserId);

  return (
    <div
      className={cn(
        "workflow-doc-slot-row",
        uploaded && "workflow-doc-item-done",
        !uploaded && spec.required && "workflow-doc-item-missing",
      )}
    >
      <div className="flex min-w-0 shrink-0 items-start gap-3 sm:w-[36%] sm:max-w-sm lg:w-[32%]">
        {uploaded ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gov-success" aria-hidden />
        ) : (
          <CircleAlert
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              spec.required ? "text-amber-600" : "text-muted-foreground",
            )}
            aria-hidden
          />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium leading-snug text-foreground">
            {spec.label}
            {spec.required ? (
              <span className="text-amber-600"> *</span>
            ) : (
              <span className="font-normal text-muted-foreground"> (opsionale)</span>
            )}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {uploaded ? "Ngarkuar" : spec.reason}
          </p>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={spec.accept}
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file, false);
            }}
            className="hidden"
          />
          {canReplace && (
            <input
              ref={replaceInputRef}
              type="file"
              accept={spec.accept}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file, true);
              }}
              className="hidden"
            />
          )}

          {uploaded && doc ? (
            <>
              <DocumentFileRow
                doc={doc}
                currentUserId={currentUserId}
                onDelete={
                  canUpload && canRemoveDocument(doc, currentUserId) ? () => void onDelete() : undefined
                }
                deleting={deleting}
              />
              {canReplace && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => replaceInputRef.current?.click()}
                  className="workflow-action-pill shrink-0 !px-2.5 !py-2 text-xs"
                  title="Zëvendëso skedarin"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zëvendëso"}
                </button>
              )}
            </>
          ) : canUpload ? (
            <UploadDropRow
              accept={spec.accept}
              maxMb={spec.maxMb}
              uploading={uploading}
              dragOver={dragOver}
              onClick={() => !uploading && inputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            />
          ) : !spec.required ? null : (
            <p className="flex-1 text-xs text-muted-foreground">Nuk është ngarkuar.</p>
          )}
      </div>

      {error && <p className="w-full text-xs text-destructive sm:pl-[calc(36%+0.75rem)]">{error}</p>}
    </div>
  );
}

function ChecklistDocumentsView({
  applicationId,
  checklist,
  documents,
  canUpload,
  currentUserId,
  panel = false,
  supplementaryPhase,
  showAllSupplementary = false,
}: {
  applicationId: string;
  checklist: ChecklistItem[];
  documents: ApplicationDocumentRow[];
  canUpload: boolean;
  currentUserId?: string | null;
  /** Mbështjell në workflow-doc-panel (p.sh. IQMT ose pamje standalone). */
  panel?: boolean;
  supplementaryPhase?: RegistrationDocPhase;
  showAllSupplementary?: boolean;
}) {
  const docByPurpose = useMemo(() => {
    const map = new Map<string, ApplicationDocumentRow>();
    for (const doc of documents) {
      if (doc.purpose && isSupplementaryDocumentPurpose(doc.purpose)) continue;
      if (doc.purpose && !map.has(doc.purpose)) {
        map.set(doc.purpose, doc);
      }
    }
    return map;
  }, [documents]);

  const displayChecklist = useMemo(
    () =>
      canUpload
        ? checklist
        : checklist.filter((item) => item.required || docByPurpose.has(item.purpose)),
    [canUpload, checklist, docByPurpose],
  );

  const required = displayChecklist.filter((item) => item.required);
  const requiredDone = required.filter((item) => docByPurpose.has(item.purpose)).length;

  const list = (
    <div className="space-y-3">
      {required.length > 0 && (
        <div className="flex justify-end">
          <span className="text-xs font-medium text-muted-foreground">
            {requiredDone}/{required.length} të detyrueshme
          </span>
        </div>
      )}
      <div className="grid gap-2">
        {displayChecklist.map((spec) => {
          const doc = docByPurpose.get(spec.purpose);
          return (
            <DocumentSlotCard
              key={spec.purpose}
              applicationId={applicationId}
              spec={{ ...spec, uploaded: Boolean(doc) }}
              doc={doc}
              canUpload={canUpload}
              currentUserId={currentUserId}
            />
          );
        })}
      </div>
      {!showAllSupplementary && supplementaryPhase && (
        <SupplementaryDocumentsSection
          applicationId={applicationId}
          phase={supplementaryPhase}
          documents={documents}
          canUpload={canUpload}
          currentUserId={currentUserId}
        />
      )}
      {showAllSupplementary && (
        <AllSupplementaryDocumentsSection documents={documents} currentUserId={currentUserId} />
      )}
    </div>
  );

  if (panel) {
    return <div className="workflow-doc-panel">{list}</div>;
  }

  return list;
}

function GenericDocumentRow({
  doc,
  currentUserId,
  onDelete,
  deleting,
}: {
  doc: ApplicationDocumentRow;
  currentUserId?: string | null;
  onDelete?: () => void;
  deleting: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const sizeLabel = formatFileSize(doc.fileSize);

  return (
    <li
      className={cn(
        "workflow-doc-slot-row flex-col",
        "workflow-doc-item-done",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-gov-primary" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={doc.originalFilename}>
          {doc.originalFilename}
          {sizeLabel ? <span className="font-normal text-muted-foreground"> · {sizeLabel}</span> : null}
        </span>
        <DocumentActionButtons
          doc={doc}
          currentUserId={currentUserId}
          onPreview={() => setPreviewOpen((v) => !v)}
          onDelete={onDelete && canRemoveDocument(doc, currentUserId) ? onDelete : undefined}
          deleting={deleting}
          previewActive={previewOpen}
        />
      </div>
      {previewOpen && (
        <div className="w-full">
          <DocumentPreviewPanel
            doc={doc}
            index={0}
            total={1}
            onPrevious={() => undefined}
            onNext={() => undefined}
            onClose={() => setPreviewOpen(false)}
            compact
          />
        </div>
      )}
    </li>
  );
}

const SUPPLEMENTARY_MAX_MB = 20;
const SUPPLEMENTARY_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx";

function SupplementaryDocumentsSection({
  applicationId,
  phase,
  documents,
  canUpload,
  currentUserId,
}: {
  applicationId: string;
  phase: RegistrationDocPhase;
  documents: ApplicationDocumentRow[];
  canUpload: boolean;
  currentUserId?: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const purpose = supplementaryDocumentPurpose(phase);
  const supplementaryDocs = filterSupplementaryDocuments(documents, phase);

  if (!canUpload && supplementaryDocs.length === 0) return null;

  async function uploadFile(file: File) {
    if (file.size > SUPPLEMENTARY_MAX_MB * 1024 * 1024) {
      setError(`Skedari kalon ${SUPPLEMENTARY_MAX_MB} MB.`);
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("entityType", "application");
    formData.set("entityId", applicationId);
    formData.set("purpose", purpose);
    formData.set("classification", "APPLICATION");

    try {
      const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error ?? "Ngarkimi dështoi");
        return;
      }
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Ngarkimi dështoi");
    } finally {
      setUploading(false);
    }
  }

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
      router.refresh();
    } catch {
      setError("Heqja e dokumentit dështoi");
    } finally {
      setDeletingId(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  return (
    <WorkflowSubsection
      title="Dokumente të tjera (opsionale)"
      description="Material shtesë që nuk është në listën e detyrueshme."
    >
      <div className="space-y-3">
        {supplementaryDocs.length > 0 && (
          <ul className="grid gap-2">
            {supplementaryDocs.map((doc) => (
              <GenericDocumentRow
                key={doc.id}
                doc={doc}
                currentUserId={currentUserId}
                onDelete={canUpload ? () => void onDelete(doc) : undefined}
                deleting={deletingId === doc.id}
              />
            ))}
          </ul>
        )}

        {canUpload && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={SUPPLEMENTARY_ACCEPT}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile(file);
              }}
              className="hidden"
            />
            <UploadDropRow
              accept={SUPPLEMENTARY_ACCEPT}
              maxMb={SUPPLEMENTARY_MAX_MB}
              uploading={uploading}
              dragOver={dragOver}
              onClick={() => !uploading && inputRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            />
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </WorkflowSubsection>
  );
}

function AllSupplementaryDocumentsSection({
  documents,
  currentUserId,
}: {
  documents: ApplicationDocumentRow[];
  currentUserId?: string | null;
}) {
  const phases: RegistrationDocPhase[] = ["owner", "installer", "certifier"];
  const grouped = phases
    .map((phase) => ({
      phase,
      docs: filterSupplementaryDocuments(documents, phase),
    }))
    .filter((entry) => entry.docs.length > 0);

  const legacyDocs = documents.filter(
    (doc) => !doc.purpose || doc.purpose === "OTHER",
  );

  if (grouped.length === 0 && legacyDocs.length === 0) return null;

  return (
    <WorkflowSection title="Dokumente të tjera" className="mt-4">
      <div className="space-y-6">
        {grouped.map(({ phase, docs }) => (
          <WorkflowSubsection key={phase} title={SUPPLEMENTARY_PHASE_LABELS[phase]}>
            <ul className="grid gap-2">
              {docs.map((doc) => (
                <GenericDocumentRow
                  key={doc.id}
                  doc={doc}
                  currentUserId={currentUserId}
                  onDelete={() => undefined}
                  deleting={false}
                />
              ))}
            </ul>
          </WorkflowSubsection>
        ))}
        {legacyDocs.length > 0 && (
          <WorkflowSubsection key="legacy-docs" title="Të tjera">
            <ul className="grid gap-2">
              {legacyDocs.map((doc) => (
                <GenericDocumentRow
                  key={doc.id}
                  doc={doc}
                  currentUserId={currentUserId}
                  onDelete={() => undefined}
                  deleting={false}
                />
              ))}
            </ul>
          </WorkflowSubsection>
        )}
      </div>
    </WorkflowSection>
  );
}

function GenericDocumentsView({
  applicationId,
  documents,
  canUpload,
  currentUserId,
  supplementaryPhase,
}: {
  applicationId: string;
  documents: ApplicationDocumentRow[];
  canUpload: boolean;
  currentUserId?: string | null;
  supplementaryPhase?: RegistrationDocPhase;
}) {
  if (supplementaryPhase) {
    return (
      <SupplementaryDocumentsSection
        applicationId={applicationId}
        phase={supplementaryPhase}
        documents={documents}
        canUpload={canUpload}
        currentUserId={currentUserId}
      />
    );
  }

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("entityType", "application");
    formData.set("entityId", applicationId);
    formData.set("classification", "APPLICATION");

    try {
      const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
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
      router.refresh();
    } catch {
      setError("Heqja e dokumentit dështoi");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {documents.length > 0 && (
        <ul className="grid gap-2">
          {documents.map((doc) => (
            <GenericDocumentRow
              key={doc.id}
              doc={doc}
              currentUserId={currentUserId}
              onDelete={canUpload ? () => void onDelete(doc) : undefined}
              deleting={deletingId === doc.id}
            />
          ))}
        </ul>
      )}

      {canUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
            className="hidden"
          />
          <UploadDropRow
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
            maxMb={20}
            uploading={uploading}
            dragOver={dragOver}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (uploading) return;
              const file = e.dataTransfer.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
        </>
      )}

      {documents.length === 0 && !canUpload && (
        <p className="text-sm text-muted-foreground">Ende nuk ka dokumente të ngarkuara.</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function ApplicationDocuments({
  applicationId,
  documents,
  canUpload,
  currentUserId,
  embedded = false,
  checklist = [],
  showChecklistSummary = true,
  sectionTitle,
  sectionDescription,
  supplementaryPhase,
  showAllSupplementary = false,
}: {
  applicationId: string;
  documents: ApplicationDocumentRow[];
  canUpload: boolean;
  currentUserId?: string | null;
  embedded?: boolean;
  checklist?: ChecklistItem[];
  showChecklistSummary?: boolean;
  sectionTitle?: string;
  sectionDescription?: string;
  supplementaryPhase?: RegistrationDocPhase;
  showAllSupplementary?: boolean;
}) {
  void showChecklistSummary;
  void sectionTitle;

  const content =
    checklist.length > 0 ? (
      <ChecklistDocumentsView
        applicationId={applicationId}
        checklist={checklist}
        documents={documents}
        canUpload={canUpload}
        currentUserId={currentUserId}
        panel={!embedded}
        supplementaryPhase={supplementaryPhase}
        showAllSupplementary={showAllSupplementary}
      />
    ) : (
      <GenericDocumentsView
        applicationId={applicationId}
        documents={documents}
        canUpload={canUpload}
        currentUserId={currentUserId}
        supplementaryPhase={supplementaryPhase}
      />
    );

  if (embedded) {
    return content;
  }

  return (
    <WorkflowSection
      title={sectionTitle ?? "Dokumentet"}
      description={
        sectionDescription ??
        (canUpload
          ? "Ngarkoni dokumentet e kërkuara para se të ruani ose të vazhdoni."
          : "Dosja e ngarkuar në aplikim")
      }
    >
      {content}
    </WorkflowSection>
  );
}
