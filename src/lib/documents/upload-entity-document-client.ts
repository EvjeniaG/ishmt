"use client";

export async function uploadEntityDocumentClient(
  file: File,
  entityType: "elevator" | "application",
  entityId: string,
  options: { classification: string; purpose: string },
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entityType", entityType);
  formData.append("entityId", entityId);
  formData.append("classification", options.classification);
  formData.append("purpose", options.purpose);

  const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Ngarkimi i dokumentit dështoi.");
  }
  return data.documentId as string;
}
