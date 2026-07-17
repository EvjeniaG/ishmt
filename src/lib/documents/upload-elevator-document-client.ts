"use client";

export async function uploadElevatorDocumentClient(
  file: File,
  elevatorId: string,
  options: { classification: string; purpose: string },
): Promise<string> {
  const { uploadEntityDocumentClient } = await import("@/lib/documents/upload-entity-document-client");
  return uploadEntityDocumentClient(file, "elevator", elevatorId, options);
}
