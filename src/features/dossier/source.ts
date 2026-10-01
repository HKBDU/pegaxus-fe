import { z } from "zod";
import {
  dossierOverviewSchema,
  createUploadDocumentSchema,
  createSubmitDocumentVersionSchema,
  createUpdateDocumentMetadataSchema,
  dossierRequirementsPageSchema,
  dossierRequirementsParamsSchema,
  validateUploadFiles,
  dossierIdSchema,
  approveDocumentReviewSchema,
  approveDocumentEnvelopeSchema,
  documentReviewSchema,
  documentReviewEnvelopeSchema,
  readyForSubmissionEnvelopeSchema,
  missingDocumentReminderSchema,
  missingDocumentReminderEnvelopeSchema,
} from "./schemas";
import type { ApproveDocumentInput, DocumentReviewInput, DossierLoadErrorKind, DossierMockScenario, DossierRequirementsParams, DossierSourceKind, SendMissingDocumentReminderInput, SubmitDocumentVersionInput, UpdateDocumentMetadataInput, UploadDocumentInput } from "./types";
import { collectMissingDossierRequirements } from "./lib/missing-document-reminder";

export async function loadMissingDossierRequirements(dossierId: string, signal?: AbortSignal) {
  const id = dossierIdSchema.parse(dossierId);
  return collectMissingDossierRequirements((params, pageSignal) => loadDossierRequirements(id, params, pageSignal), signal);
}

export async function loadMissingRequirementReminder(input: SendMissingDocumentReminderInput) {
  const id = dossierIdSchema.parse(input.dossierId);
  const reminder = missingDocumentReminderSchema.parse(input.reminder);
  if (dossierSourceKind === "mock") {
    const { sendMockMissingRequirementReminder } = await import("./mocks/dossier.mock");
    return missingDocumentReminderEnvelopeSchema.parse(sendMockMissingRequirementReminder(id, reminder, mockScenario()));
  }
  const { dossierService } = await import("./services");
  return dossierService.sendMissingRequirementReminder({ dossierId: id, reminder });
}

export async function loadApproveDocument(input: ApproveDocumentInput) {
  approveDocumentReviewSchema.parse(input.review);
  return approveDocumentEnvelopeSchema.parse(await loadDocumentReview(input));
}

export async function loadDocumentReview(input: DocumentReviewInput) {
  const documentId = dossierIdSchema.parse(input.documentId);
  dossierIdSchema.parse(String(input.versionId));
  const review = documentReviewSchema.parse(input.review);
  if (dossierSourceKind === "mock") {
    const { reviewMockDocument } = await import("./mocks/dossier.mock");
    return documentReviewEnvelopeSchema.parse(reviewMockDocument(documentId, input.versionId, review, mockScenario()));
  }
  const { dossierService } = await import("./services");
  return dossierService.reviewComplianceDocument({ ...input, review });
}

export async function loadMarkReadyForSubmission(dossierId: string) {
  const id = dossierIdSchema.parse(dossierId);
  if (dossierSourceKind === "mock") {
    const { markMockDossierReady } = await import("./mocks/dossier.mock");
    return readyForSubmissionEnvelopeSchema.parse(markMockDossierReady(id, mockScenario()));
  }
  const { dossierService } = await import("./services");
  return dossierService.markReadyForSubmission(id);
}

export function resolveDossierSource(isDev: boolean, flag: string | undefined): DossierSourceKind {
  return isDev && flag === "true" ? "mock" : "api";
}

export const dossierSourceKind = resolveDossierSource(
  import.meta.env.DEV,
  import.meta.env.VITE_DOSSIER_API_MOCKS,
);

function mockScenario(): DossierMockScenario {
  const scenario = import.meta.env.VITE_DOSSIER_MOCK_SCENARIO ?? "normal";
  if (["normal", "locked", "empty", "error"].includes(scenario)) {
    return scenario as DossierMockScenario;
  }
  throw new Error(`Unsupported dossier mock scenario: ${scenario}`);
}

export async function loadDossierOverview(dossierId: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (dossierSourceKind === "mock") {
    const { getMockDossier } = await import("./mocks/dossier.mock");
    return dossierOverviewSchema.parse(getMockDossier(dossierId, mockScenario()));
  }
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
  if (dossierSourceKind === "mock") {
    const { getMockRequirements } = await import("./mocks/dossier.mock");
    return dossierRequirementsPageSchema.parse(getMockRequirements(dossierId, query, mockScenario()));
  }
  const { dossierService } = await import("./services");
  return dossierService.getRequirements(dossierId, query, signal);
}

export async function loadUploadDocument(input: UploadDocumentInput) {
  if (dossierSourceKind === "mock") {
    const fileError = validateUploadFiles(input.files);
    if (fileError) throw new Error(fileError.code);
    const metadata = createUploadDocumentSchema(null).parse(input.metadata);
    const { uploadMockDocument } = await import("./mocks/dossier.mock");
    return uploadMockDocument(input.dossierId, input.requirementId, input.files, mockScenario(), metadata);
  }
  const { dossierService } = await import("./services");
  return dossierService.uploadComplianceDocument(input);
}

export async function loadComplianceDocument(documentId: string, signal?: AbortSignal) {
  signal?.throwIfAborted();
  if (dossierSourceKind === "mock") {
    const { getMockComplianceDocument } = await import("./mocks/dossier.mock");
    const { complianceDocumentDetailSchema } = await import("./schemas");
    return complianceDocumentDetailSchema.parse(getMockComplianceDocument(documentId, mockScenario()));
  }
  const { dossierService } = await import("./services");
  return dossierService.getComplianceDocument(documentId, signal);
}

export async function loadSubmitDocumentVersion(input: SubmitDocumentVersionInput) {
  const fileError = validateUploadFiles(input.files);
  if (fileError) throw new Error(fileError.code);
  createSubmitDocumentVersionSchema(null).parse(input.metadata);
  if (dossierSourceKind === "mock") {
    const { submitMockDocumentVersion } = await import("./mocks/dossier.mock");
    return submitMockDocumentVersion(input.documentId, input.files, input.metadata, mockScenario());
  }
  const { dossierService } = await import("./services");
  return dossierService.submitDocumentVersion(input);
}

export async function loadUpdateDocumentMetadata(input: UpdateDocumentMetadataInput) {
  const changes = createUpdateDocumentMetadataSchema(null).parse(input.changes);
  if (dossierSourceKind === "mock") {
    const { updateMockComplianceDocumentMetadata } = await import("./mocks/dossier.mock");
    return updateMockComplianceDocumentMetadata(input.documentId, changes, mockScenario());
  }
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
  if (status === 404 || code === "DOSSIER_NOT_FOUND" || code === "NOT_FOUND") return "not-found";
  return "load";
}
