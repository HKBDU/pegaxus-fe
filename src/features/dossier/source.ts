import { z } from "zod";
import { dossierIdSchema, dossierRequirementsParamsSchema } from "./schemas";
import type { ApproveDocumentInput, DocumentReviewInput, DossierLoadErrorKind, DossierRequirementsParams, DossierSourceKind, SendMissingDocumentReminderInput, SubmitDocumentVersionInput, UpdateDocumentMetadataInput, UploadDocumentInput } from "./types";

export async function loadMissingDossierRequirements(dossierId: string, signal?: AbortSignal) {
  const id = dossierIdSchema.parse(dossierId);
  const { dossierService } = await import("./services");
  return dossierService.getMissingRequirements(id, signal);
}

export async function loadMissingRequirementReminder(input: SendMissingDocumentReminderInput) {
  const id = dossierIdSchema.parse(input.dossierId);
  const { dossierService } = await import("./services");
  return dossierService.sendMissingRequirementReminder({ ...input, dossierId: id });
}

export async function loadApproveDocument(input: ApproveDocumentInput) {
  return loadDocumentReview(input);
}

export async function loadDocumentReview(input: DocumentReviewInput) {
  const { dossierService } = await import("./services");
  return dossierService.reviewComplianceDocument(input);
}

export async function loadMarkReadyForSubmission(dossierId: string) {
  const id = dossierIdSchema.parse(dossierId);
  const { dossierService } = await import("./services");
  return dossierService.markReadyForSubmission(id);
}

export function resolveDossierSource(_isDev: boolean, _flag: string | undefined): DossierSourceKind {
  return "api";
}

export const dossierSourceKind = resolveDossierSource(
  import.meta.env.DEV,
  import.meta.env.VITE_DOSSIER_API_MOCKS,
);

export async function loadDossierOverview(dossierId: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  const { dossierService } = await import("./services");
  return dossierService.getOverview(dossierId, signal);
}

export async function loadDossierRequirements(
  dossierId: string,
  params: DossierRequirementsParams,
  signal?: AbortSignal,
) {
  const query = dossierRequirementsParamsSchema.parse(params);
  signal?.throwIfAborted();
  const { dossierService } = await import("./services");
  return dossierService.getRequirements(dossierId, query, signal);
}

export async function loadUploadDocument(input: UploadDocumentInput) {
  const { dossierService } = await import("./services");
  return dossierService.uploadComplianceDocument(input);
}

export async function loadComplianceDocument(documentId: string, signal?: AbortSignal, dossierId?: string, requirementId?: string) {
  signal?.throwIfAborted();
  const { dossierService } = await import("./services");
  return dossierService.getComplianceDocument(documentId, signal, dossierId, requirementId);
}

export async function loadSubmitDocumentVersion(input: SubmitDocumentVersionInput) {
  const { dossierService } = await import("./services");
  return dossierService.submitDocumentVersion(input);
}

export async function loadUpdateDocumentMetadata(input: UpdateDocumentMetadataInput) {
  const { dossierService } = await import("./services");
  return dossierService.updateComplianceDocumentMetadata(input);
}

export function getDossierLoadErrorKind(error: unknown): DossierLoadErrorKind {
  if (error instanceof z.ZodError) return "contract";
  const response = (error as { response?: { status?: number; data?: { errorCode?: string } }; status?: number }) ?? {};
  const status = response.response?.status ?? response.status;
  const code = response.response?.data?.errorCode;
  if (status === 401) return "unauthorized";
  if (status === 403 || code === "FORBIDDEN") return "forbidden";
  if (status === 404 || code === "DOSSIER_NOT_FOUND" || code === "NOT_FOUND" || (error as { message?: string })?.message === "DOSSIER_NOT_INITIALIZED") return "not-found";
  return "load";
}
