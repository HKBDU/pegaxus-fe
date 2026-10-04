import apiClient from "@/lib/axios";
import {
  dossierIdSchema,
  dossierOverviewEnvelopeSchema,
  dossierRequirementsEnvelopeSchema,
  dossierRequirementsParamsSchema,
  createUploadDocumentSchema,
  uploadDocumentEnvelopeSchema,
  dossierUploadedAssetsSchema,
  complianceDocumentEnvelopeSchema,
  createSubmitDocumentVersionSchema,
  submitDocumentVersionEnvelopeSchema,
  createUpdateDocumentMetadataSchema,
  updateDocumentMetadataEnvelopeSchema,
  approveDocumentReviewSchema,
  approveDocumentEnvelopeSchema,
  documentReviewSchema,
  documentReviewEnvelopeSchema,
  readyForSubmissionEnvelopeSchema,
  missingDocumentReminderSchema,
  missingDocumentReminderEnvelopeSchema,
} from "./schemas";
import type { ApproveDocumentInput, DocumentReviewInput, DossierRequirementsParams, SendMissingDocumentReminderInput, SubmitDocumentVersionInput, UpdateDocumentMetadataInput, UploadDocumentInput } from "./types";

// FE transport adapter pending the final U1/U3 backend DTO. Keep asset serialization here.
function buildDossierDocumentRequest({ files, metadata }: Pick<UploadDocumentInput, "files"> & { metadata: object }) {
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) fields[key] = trimmed;
    }
  }
  return { files: dossierUploadedAssetsSchema.parse(files), ...fields };
}

export const dossierService = {
  async sendMissingRequirementReminder(input: SendMissingDocumentReminderInput) {
    const id = dossierIdSchema.parse(input.dossierId);
    const reminder = missingDocumentReminderSchema.parse(input.reminder);
    const payload = await apiClient.post<unknown, unknown>(`compliance-dossiers/${id}/requirements/reminders`, reminder);
    return missingDocumentReminderEnvelopeSchema.parse(payload);
  },

  async approveDocument(input: ApproveDocumentInput) {
    approveDocumentReviewSchema.parse(input.review);
    return approveDocumentEnvelopeSchema.parse(await dossierService.reviewComplianceDocument(input));
  },

  async reviewComplianceDocument(input: DocumentReviewInput) {
    const documentId = dossierIdSchema.parse(input.documentId);
    const versionId = dossierIdSchema.parse(String(input.versionId));
    const review = documentReviewSchema.parse(input.review);
    const payload = await apiClient.post<unknown, unknown>(
      `compliance-documents/${documentId}/versions/${versionId}/reviews`, review,
    );
    return documentReviewEnvelopeSchema.parse(payload);
  },

  async markReadyForSubmission(dossierId: string) {
    const id = dossierIdSchema.parse(dossierId);
    const payload = await apiClient.patch<unknown, unknown>(`compliance-dossiers/${id}/ready-for-submission`);
    return readyForSubmissionEnvelopeSchema.parse(payload);
  },

  async getOverview(dossierId: string, signal?: AbortSignal) {
    const id = dossierIdSchema.parse(dossierId);
    const payload = await apiClient.get<unknown, unknown>(
      `compliance-dossiers/${encodeURIComponent(id)}`,
      { signal },
    );
    return dossierOverviewEnvelopeSchema.parse(payload).value;
  },

  async getRequirements(
    dossierId: string,
    params: DossierRequirementsParams,
    signal?: AbortSignal,
  ) {
    const id = dossierIdSchema.parse(dossierId);
    const query = dossierRequirementsParamsSchema.parse(params);
    const payload = await apiClient.get<unknown, unknown>(
      `compliance-dossiers/${encodeURIComponent(id)}/requirements`,
      { params: query, signal },
    );
    return dossierRequirementsEnvelopeSchema.parse(payload).value;
  },

  async uploadComplianceDocument(input: UploadDocumentInput) {
    const dossierId = dossierIdSchema.parse(input.dossierId);
    const requirementId = dossierIdSchema.parse(String(input.requirementId));
    const metadata = createUploadDocumentSchema(null).parse(input.metadata);
    const payload = await apiClient.post<unknown, unknown>(
      `compliance-dossiers/${encodeURIComponent(dossierId)}/requirements/${encodeURIComponent(requirementId)}/documents`,
      buildDossierDocumentRequest({ files: input.files, metadata }),
      { timeout: 120_000 },
    );
    return uploadDocumentEnvelopeSchema.parse(payload).value;
  },

  async getComplianceDocument(documentId: string, signal?: AbortSignal) {
    const id = dossierIdSchema.parse(documentId);
    const payload = await apiClient.get<unknown, unknown>(
      `compliance-documents/${encodeURIComponent(id)}`,
      { signal },
    );
    return complianceDocumentEnvelopeSchema.parse(payload).value;
  },

  async submitDocumentVersion(input: SubmitDocumentVersionInput) {
    const id = dossierIdSchema.parse(input.documentId);
    const metadata = createSubmitDocumentVersionSchema(null).parse(input.metadata);
    const payload = await apiClient.post<unknown, unknown>(
      `compliance-documents/${encodeURIComponent(id)}/versions`,
      buildDossierDocumentRequest({ files: input.files, metadata }),
      { timeout: 120_000 },
    );
    return submitDocumentVersionEnvelopeSchema.parse(payload).value;
  },

  async updateComplianceDocumentMetadata(input: UpdateDocumentMetadataInput) {
    const id = dossierIdSchema.parse(input.documentId);
    const changes = createUpdateDocumentMetadataSchema(null).parse(input.changes);
    const payload = await apiClient.patch<unknown, unknown>(
      `compliance-documents/${encodeURIComponent(id)}`,
      changes,
    );
    return updateDocumentMetadataEnvelopeSchema.parse(payload).value;
  },
};
