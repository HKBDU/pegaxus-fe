import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { dossierIdSchema } from "../schemas";
import { dossierSourceKind, loadComplianceDocument, loadSubmitDocumentVersion, loadUpdateDocumentMetadata } from "../source";
import type { ComplianceDocumentDetail, SubmitDocumentVersionInput, UpdateDocumentMetadataInput, UploadDocumentError, UploadDocumentMetadata } from "../types";
import { mapUploadDocumentError } from "./useUploadComplianceDocument";
import { dossierKeys } from "./useDossier";

export const documentKeys = {
  detail: (id: string) => ["dossier", dossierSourceKind, "document", id] as const,
};

export function getChangedDocumentMetadata(
  values: UploadDocumentMetadata & { note: string },
  document: ComplianceDocumentDetail,
) {
  const changes: Partial<UploadDocumentMetadata & { note: string }> = {};
  const fields = ["documentName", "documentNumber", "issuingAuthority", "issuedDate", "expiryDate", "note"] as const;
  for (const field of fields) {
    if (values[field] !== (document[field] ?? "")) changes[field] = values[field];
  }
  return changes;
}

export function mapComplianceDocumentError(error: unknown): UploadDocumentError {
  const response = (error as { response?: { status?: number; data?: { errorCode?: string; code?: string; data?: { errorCode?: string } } }; status?: number; message?: string }) ?? {};
  const code = response.response?.data?.errorCode ?? response.response?.data?.data?.errorCode ?? response.response?.data?.code ?? response.message;
  if (code === "DOCUMENT_ALREADY_VERIFIED") return { code, message: "This document has already been verified and is read-only.", refresh: "requirements" };
  if (code === "DOCUMENT_ALREADY_REVIEWED") return { code, message: "This version has already been reviewed. Use Update Document to submit corrected files.", refresh: "requirements" };
  if ((response.response?.status ?? response.status) === 404) return { code: "DOCUMENT_NOT_FOUND", message: "This document is no longer available.", refresh: "requirements" };
  return mapUploadDocumentError(error);
}

export async function invalidateComplianceDocument(client: QueryClient, documentId: string, dossierId?: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: documentKeys.detail(documentId), exact: true }),
    ...(dossierId ? [
      client.invalidateQueries({ queryKey: dossierKeys.requirementsRoot(dossierId) }),
      client.invalidateQueries({ queryKey: dossierKeys.overview(dossierId), exact: true }),
    ] : []),
  ]);
}

export function useComplianceDocument(documentId: string | null) {
  return useQuery({
    queryKey: documentKeys.detail(documentId ?? ""),
    queryFn: ({ signal }) => loadComplianceDocument(documentId!, signal),
    enabled: Boolean(documentId && dossierIdSchema.safeParse(documentId).success),
    retry: false,
  });
}

export function useSubmitDocumentVersion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitDocumentVersionInput) => loadSubmitDocumentVersion(input),
    onSuccess: (_result, input) => invalidateComplianceDocument(client, input.documentId, input.dossierId),
    onError: (error, input) => {
      const mapped = mapComplianceDocumentError(error);
      if (mapped.refresh) return invalidateComplianceDocument(client, input.documentId, input.dossierId);
    },
  });
}

export function useUpdateDocumentMetadata() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDocumentMetadataInput) => loadUpdateDocumentMetadata(input),
    onSuccess: (_result, input) => invalidateComplianceDocument(client, input.documentId, input.dossierId),
    onError: (error, input) => {
      const mapped = mapComplianceDocumentError(error);
      if (mapped.refresh) return invalidateComplianceDocument(client, input.documentId, input.dossierId);
    },
  });
}
