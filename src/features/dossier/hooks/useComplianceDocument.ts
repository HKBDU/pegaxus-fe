import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { dossierIdSchema } from "../schemas";
import {
  dossierSourceKind,
  loadComplianceDocument,
  loadSubmitDocumentVersion,
  loadUpdateDocumentMetadata,
} from "../source";
import type {
  ComplianceDocumentDetail,
  SubmitDocumentVersionInput,
  UpdateDocumentMetadataInput,
  UploadDocumentError,
  UploadDocumentMetadata,
} from "../types";
import { mapUploadDocumentError } from "./useUploadComplianceDocument";
import { dossierKeys } from "./useDossier";
import { dossierService } from "../services";

export const documentKeys = {
  root: (dossierId: string, requirementId: string) =>
    [
      "dossier",
      dossierSourceKind,
      dossierId,
      "document",
      requirementId,
    ] as const,
  detail: (id: string, dossierId?: string, requirementId?: string) =>
    dossierId && requirementId
      ? ([
          ...documentKeys.root(dossierId, requirementId),
          "detail",
          id,
        ] as const)
      : (["dossier", dossierSourceKind, "document", id] as const),
  requirement: (dossierId: string, requirementId: string) =>
    [...documentKeys.root(dossierId, requirementId), "requirement"] as const,
  history: (dossierId: string, requirementId: string) =>
    [...documentKeys.root(dossierId, requirementId), "history"] as const,
};

export function getChangedDocumentMetadata(
  values: UploadDocumentMetadata,
  document: ComplianceDocumentDetail,
) {
  const changes: UpdateDocumentMetadataInput["changes"] = {};
  const fields = [
    "documentNumber",
    "issuingAuthority",
    "issuedDate",
    "expiryDate",
  ] as const;
  for (const field of fields) {
    const value = values[field]?.trim();
    if (value && value !== (document[field] ?? "")) changes[field] = value;
  }
  return changes;
}

export function mapComplianceDocumentError(
  error: unknown,
): UploadDocumentError {
  const response =
    (error as {
      response?: {
        status?: number;
        data?: {
          errorCode?: string;
          code?: string | number;
          value?: { errorCode?: string };
          data?: { errorCode?: string };
        };
      };
      status?: number;
      message?: string;
    }) ?? {};
  const data = response.response?.data;
  const code =
    data?.errorCode ??
    data?.value?.errorCode ??
    data?.data?.errorCode ??
    (typeof data?.code === "string" ? data.code : undefined) ??
    response.message;
  if (code === "DOCUMENT_ALREADY_VERIFIED")
    return {
      code,
      message: "This document has already been verified and is read-only.",
      refresh: "requirements",
    };
  if (code === "DOCUMENT_ALREADY_REVIEWED")
    return {
      code,
      message:
        "This version has already been reviewed. Use Update Document to submit corrected files.",
      refresh: "requirements",
    };
  if ((response.response?.status ?? response.status) === 404)
    return {
      code: "DOCUMENT_NOT_FOUND",
      message: "This document is no longer available.",
      refresh: "requirements",
    };
  return mapUploadDocumentError(error);
}

export async function invalidateComplianceDocument(
  client: QueryClient,
  documentId?: string,
  dossierId?: string,
  requirementId?: string | number,
) {
  await Promise.all([
    ...(dossierId && requirementId
      ? [
          client.invalidateQueries({
            queryKey: documentKeys.root(dossierId, String(requirementId)),
          }),
        ]
      : documentId
        ? [
            client.invalidateQueries({
              queryKey: documentKeys.detail(documentId),
              exact: true,
            }),
          ]
        : []),
    ...(dossierId
      ? [
          client.invalidateQueries({
            queryKey: dossierKeys.requirementsRoot(dossierId),
          }),
          client.invalidateQueries({
            queryKey: dossierKeys.overview(dossierId),
            exact: true,
          }),
        ]
      : []),
  ]);
}

export function useComplianceDocument(
  documentId: string | null,
  dossierId?: string,
  requirementId?: string,
) {
  return useQuery({
    queryKey: documentKeys.detail(documentId ?? "", dossierId, requirementId),
    queryFn: ({ signal }) =>
      loadComplianceDocument(
        documentId ?? "",
        signal,
        dossierId,
        requirementId,
      ),
    enabled: Boolean(documentId && dossierIdSchema.safeParse(documentId).success),
    retry: false,
  });
}

export function useDossierRequirement(
  dossierId: string,
  requirementId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: documentKeys.requirement(dossierId, requirementId),
    queryFn: ({ signal }) =>
      dossierService.getRequirement(dossierId, requirementId, signal),
    enabled:
      enabled &&
      dossierIdSchema.safeParse(dossierId).success &&
      dossierIdSchema.safeParse(requirementId).success,
    retry: false,
  });
}

export function useDocumentVersions(
  dossierId: string,
  requirementId: string,
  enabled = true,
) {
  return useQuery({
    queryKey: documentKeys.history(dossierId, requirementId),
    queryFn: ({ signal }) =>
      dossierService.getDocumentVersions(dossierId, requirementId, signal),
    enabled:
      enabled &&
      dossierIdSchema.safeParse(dossierId).success &&
      dossierIdSchema.safeParse(requirementId).success,
    retry: false,
  });
}

export function useSubmitDocumentVersion() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitDocumentVersionInput) =>
      loadSubmitDocumentVersion(input),
    onSuccess: (_result, input) =>
      invalidateComplianceDocument(
        client,
        input.documentId,
        input.dossierId,
        input.requirementId,
      ),
    onError: (error, input) => {
      const mapped = mapComplianceDocumentError(error);
      if (
        mapped.refresh ||
        (error as { response?: { status?: number } }).response?.status === 409
      )
        return invalidateComplianceDocument(
          client,
          input.documentId,
          input.dossierId,
          input.requirementId,
        );
    },
  });
}

export function useUpdateDocumentMetadata() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDocumentMetadataInput) =>
      loadUpdateDocumentMetadata(input),
    onSuccess: (_result, input) =>
      invalidateComplianceDocument(
        client,
        input.documentId,
        input.dossierId,
        input.requirementId,
      ),
    onError: (error, input) => {
      const mapped = mapComplianceDocumentError(error);
      if (
        mapped.refresh ||
        (error as { response?: { status?: number } }).response?.status === 409
      )
        return invalidateComplianceDocument(
          client,
          input.documentId,
          input.dossierId,
          input.requirementId,
        );
    },
  });
}
