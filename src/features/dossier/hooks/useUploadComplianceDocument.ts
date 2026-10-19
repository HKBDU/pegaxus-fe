import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { dossierSourceKind, loadUploadDocument } from "../source";
import type { UploadDocumentError, UploadDocumentInput } from "../types";
import { dossierKeys } from "./useDossier";

export function mapUploadDocumentError(error: unknown): UploadDocumentError {
  const response =
    (error as {
      response?: {
        status?: number;
        data?: {
          errorCode?: string;
          code?: string | number;
          message?: string;
          value?: { errorCode?: string };
          data?: { errorCode?: string };
        };
      };
      status?: number;
      message?: string;
    }) ?? {};
  const status = response.response?.status ?? response.status;
  const data = response.response?.data;
  const code =
    data?.errorCode ??
    data?.value?.errorCode ??
    data?.data?.errorCode ??
    (typeof data?.code === "string" ? data.code : undefined) ??
    response.message ??
    "UPLOAD_FAILED";
  if (
    status === 400 &&
    data?.message === "ExpiryDate is required for this DossierRequirement."
  )
    return {
      code,
      message: "Expiry date is required for this requirement.",
      field: "expiryDate",
    };
  if (
    status === 400 &&
    data?.message &&
    [
      "The document expiry date must be after the planned transport departure date.",
      "ExpiryDate must not be before IssuedDate.",
      "The document expiry date must satisfy the DossierRequirement valid_until date.",
    ].includes(data.message)
  )
    return { code, message: data.message, field: "expiryDate" };
  if (code === "FILE_TOO_LARGE" || status === 413)
    return { code, message: "Each file must be 5 MiB or smaller." };
  if (code === "INVALID_FILE_TYPE")
    return {
      code,
      message: "Only PDF, JPG, JPEG, and PNG files are accepted.",
    };
  if (code === "DOCUMENT_EXPIRES_BEFORE_DEPARTURE")
    return {
      code,
      message: "Expiry date cannot be before transport departure.",
      field: "expiryDate",
    };
  if (code === "DOCUMENT_VALIDITY_INSUFFICIENT")
    return {
      code,
      message: "The document does not satisfy the requirement validity date.",
      field: "expiryDate",
    };
  if (code === "DR_ALREADY_HAS_DOCUMENT")
    return {
      code,
      message:
        "This requirement already has a document. Refreshing requirements.",
      refresh: "requirements",
    };
  if (code === "DOCUMENT_ALREADY_EXISTS" || status === 409)
    return {
      code,
      message:
        "Document data changed. Refresh and review the latest requirement.",
      refresh: "requirements",
    };
  if (code === "DOSSIER_LOCKED")
    return {
      code,
      message: "This dossier is locked and cannot accept documents.",
      refresh: "overview",
    };
  if (code === "DR_NOT_FOUND")
    return {
      code,
      message:
        "This requirement is no longer available. Refreshing requirements.",
      refresh: "requirements",
    };
  if (code === "FORBIDDEN" || status === 403)
    return {
      code,
      message: "You do not have permission to upload to this requirement.",
    };
  return {
    code,
    message:
      data?.message || "Could not upload the document. Please try again.",
  };
}

export async function invalidateDossierAfterUpload(
  client: QueryClient,
  id: string,
  requirementId?: string | number,
) {
  await Promise.all([
    client.invalidateQueries({
      queryKey: dossierKeys.overview(id),
      exact: true,
    }),
    client.invalidateQueries({ queryKey: dossierKeys.requirementsRoot(id) }),
    client.invalidateQueries({
      queryKey: requirementId
        ? ["dossier", dossierSourceKind, id, "document", String(requirementId)]
        : ["dossier", dossierSourceKind, id, "document"],
    }),
  ]);
}

export async function refreshDossierAfterUploadError(
  client: QueryClient,
  id: string,
  error: unknown,
) {
  const refresh = mapUploadDocumentError(error).refresh;
  if (refresh === "overview") {
    await client.invalidateQueries({
      queryKey: dossierKeys.overview(id),
      exact: true,
    });
  } else if (refresh === "requirements") {
    await invalidateDossierAfterUpload(client, id);
  }
}

export function useUploadComplianceDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDocumentInput) => loadUploadDocument(input),
    onSuccess: (_result, input) =>
      invalidateDossierAfterUpload(
        client,
        input.dossierId,
        input.requirementId,
      ),
    onError: (error, input) =>
      refreshDossierAfterUploadError(client, input.dossierId, error),
  });
}
