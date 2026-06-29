/** ASCII-safe filename for Content-Disposition (quoted-string form). */
export function asciiContentDispositionFilename(filename: string): string {
  const sanitized = filename.replace(/["\\]/g, "_").replace(/[^\x20-\x7E]/g, "_").trim();
  return sanitized || "document";
}

export function buildContentDisposition(mode: "inline" | "attachment", filename: string): string {
  return `${mode}; filename="${asciiContentDispositionFilename(filename)}"`;
}

/** Infer a browser-previewable MIME type when storage only has octet-stream. */
export function resolvePreviewContentType(mimeType: string, filename: string): string {
  if (mimeType && mimeType !== "application/octet-stream") {
    return mimeType;
  }
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return mimeType || "application/octet-stream";
  }
}
