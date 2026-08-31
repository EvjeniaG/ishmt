"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import {
  DocumentPreviewPanel,
  type ApplicationDocumentRow,
} from "@/components/applications/application-documents";
import { RegistryEmpty, SectionBlock } from "@/components/elevators/registry-shared";
import {
  ELEVATOR_DOCUMENT_GROUP_LABELS,
  ELEVATOR_DOCUMENT_GROUP_ORDER,
  labelDocumentClassification,
  labelDocumentPurpose,
  resolveElevatorDocumentGroup,
  type ElevatorDocumentGroup,
} from "@/lib/documents/document-display-labels";
import { formatDateSq } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export type ElevatorDocumentRow = ApplicationDocumentRow & {
  purpose?: string;
};

function formatFileSize(bytes: string): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function groupDocuments(documents: ElevatorDocumentRow[]) {
  const groups = new Map<ElevatorDocumentGroup, ElevatorDocumentRow[]>();
  for (const group of ELEVATOR_DOCUMENT_GROUP_ORDER) {
    groups.set(group, []);
  }

  for (const doc of documents) {
    const group = resolveElevatorDocumentGroup(doc);
    groups.get(group)?.push(doc);
  }

  return ELEVATOR_DOCUMENT_GROUP_ORDER.flatMap((group) => {
    const items = groups.get(group) ?? [];
    if (items.length === 0) return [];
    return [{ group, items }];
  });
}

function ElevatorDocumentRowItem({ doc }: { doc: ElevatorDocumentRow }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const title = labelDocumentPurpose(doc);
  const sizeLabel = formatFileSize(doc.fileSize);
  const uploadedAt =
    typeof doc.uploadedAt === "string"
      ? doc.uploadedAt
      : doc.uploadedAt instanceof Date
        ? doc.uploadedAt.toISOString()
        : String(doc.uploadedAt);

  return (
    <li className="rounded-xl border border-border/70 bg-card transition-colors hover:border-border">
      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gov-primary/10 text-gov-primary">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground" title={doc.originalFilename}>
              {doc.originalFilename}
              {sizeLabel ? ` · ${sizeLabel}` : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground/80">
                {labelDocumentClassification(doc.classification)}
              </span>
              {doc.uploadedBy ? <span>Ngarkuar nga {doc.uploadedBy}</span> : null}
              <span>{formatDateSq(uploadedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
          <button
            type="button"
            onClick={() => setPreviewOpen((value) => !value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              previewOpen
                ? "border-gov-primary/30 bg-gov-primary/10 text-gov-primary"
                : "border-border/70 bg-background text-foreground hover:border-gov-primary/30 hover:bg-gov-primary/5",
            )}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Shiko
          </button>
          <a
            href={`/api/documents/${doc.id}/download`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-gov-primary/30 hover:bg-gov-primary/5"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Shkarko
          </a>
        </div>
      </div>

      {previewOpen ? (
        <div className="border-t border-border/60 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
          <DocumentPreviewPanel
            doc={{ ...doc, uploadedAt }}
            index={0}
            total={1}
            onPrevious={() => undefined}
            onNext={() => undefined}
            onClose={() => setPreviewOpen(false)}
            compact
          />
        </div>
      ) : null}
    </li>
  );
}

export function ElevatorDocumentsPanel({ documents }: { documents: ElevatorDocumentRow[] }) {
  const groupedDocuments = useMemo(() => groupDocuments(documents), [documents]);

  if (documents.length === 0) {
    return (
      <RegistryEmpty
        title="Nuk ka dokumente regjistrimi"
        description="Dokumentet e ngarkuara gjatë regjistrimit fillestar (aplikimi, certifikimi, dokumentacioni teknik). Raportet e inspektimit dhe mirëmbajtjes gjenden te skedat përkatëse."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {documents.length} dokument{documents.length === 1 ? "" : "e"} regjistrimi
        </p>
      </div>

      {groupedDocuments.map(({ group, items }) => (
        <SectionBlock
          key={group}
          title={ELEVATOR_DOCUMENT_GROUP_LABELS[group]}
          count={items.length}
        >
          <ul className="space-y-3">
            {items.map((doc) => (
              <ElevatorDocumentRowItem key={doc.id} doc={doc} />
            ))}
          </ul>
        </SectionBlock>
      ))}
    </div>
  );
}
