"use client";

export async function uploadElevatorDocumentClient(
  file: File,
  elevatorId: string,
  options: { classification: string; purpose: string },
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entityType", "elevator");
  formData.append("entityId", elevatorId);
  formData.append("classification", options.classification);
  formData.append("purpose", options.purpose);

  const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Ngarkimi i dokumentit dështoi.");
  }
  return data.documentId as string;
}
