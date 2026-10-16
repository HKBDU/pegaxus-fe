import { MAX_IMAGE_FILE_SIZE, MAX_PDF_FILE_SIZE } from "@/shared/constants/viewer";
import { getDocumentFileHref } from "./document-review";
import type { DocumentVersionFile } from "../types";

export function getDossierFilePreview(file: Pick<DocumentVersionFile, "fileUrl" | "mimeType" | "fileSizeBytes">, objectUrl?: string): {
  kind: "pdf" | "image" | "fallback";
  href?: string;
  reason?: string;
} {
  const href = objectUrl?.startsWith("blob:") ? objectUrl : getDocumentFileHref(file.fileUrl);
  if (!href) return { kind: "fallback", reason: "File link unavailable" };
  if (file.mimeType === "application/pdf") {
    return file.fileSizeBytes <= MAX_PDF_FILE_SIZE ? { kind: "pdf", href }
      : { kind: "fallback", href, reason: "This PDF exceeds the shared viewer's 1 MiB preview limit. Use Open File to inspect it." };
  }
  if (file.mimeType === "image/jpeg" || file.mimeType === "image/png") {
    return file.fileSizeBytes <= MAX_IMAGE_FILE_SIZE ? { kind: "image", href }
      : { kind: "fallback", href, reason: "This image exceeds the shared viewer's 5 MiB preview limit. Use Open File to inspect it." };
  }
  return { kind: "fallback", href, reason: "Preview is unavailable for this file type. Use Open File to inspect it." };
}
