/** Inspektor terreni me ngarkesë aktive (dosje + detyra terreni). */
export type FieldInspectorOptionWithWorkload = {
  id: string;
  label: string;
  pendingDocumentReviews: number;
  pendingFieldInspections: number;
  totalActive: number;
};

export function normalizeInspectorOptions(
  inspectors: {
    id: string;
    label: string;
    pendingDocumentReviews?: number;
    pendingFieldInspections?: number;
    totalActive?: number;
  }[],
): FieldInspectorOptionWithWorkload[] {
  return inspectors.map((i) => ({
    id: i.id,
    label: i.label,
    pendingDocumentReviews: i.pendingDocumentReviews ?? 0,
    pendingFieldInspections: i.pendingFieldInspections ?? 0,
    totalActive:
      i.totalActive ?? (i.pendingDocumentReviews ?? 0) + (i.pendingFieldInspections ?? 0),
  }));
}
