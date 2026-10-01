import apiClient from "@/lib/axios";
import {
  dossierIdSchema,
  dossierOverviewEnvelopeSchema,
  dossierRequirementsEnvelopeSchema,
  dossierRequirementsParamsSchema,
  createUploadDocumentSchema,
  uploadDocumentEnvelopeSchema,
  validateUploadFiles,
  complianceDocumentEnvelopeSchema,
  createSubmitDocumentVersionSchema,
  submitDocumentVersionEnvelopeSchema,
  createUpdateDocumentMetadataSchema,
  updateDocumentMetadataEnvelopeSchema,
} from "./schemas";
import type { DossierRequirementsParams, SubmitDocumentVersionInput, UpdateDocumentMetadataInput, UploadDocumentInput } from "./types";

function buildUploadDocumentFormData({ files, metadata }: { files: readonly File[]; metadata: object }): FormData {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) form.append(key, trimmed);
    }
  }
  return form;
}

export const dossierService = {
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
    const fileError = validateUploadFiles(input.files);
    if (fileError) throw new Error(fileError.message);
    const metadata = createUploadDocumentSchema(null).parse(input.metadata);
    const payload = await apiClient.post<unknown, unknown>(
      `compliance-dossiers/${encodeURIComponent(dossierId)}/requirements/${encodeURIComponent(requirementId)}/documents`,
      buildUploadDocumentFormData({ files: input.files, metadata }),
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
    const fileError = validateUploadFiles(input.files);
    if (fileError) throw new Error(fileError.message);
    const metadata = createSubmitDocumentVersionSchema(null).parse(input.metadata);
    const payload = await apiClient.post<unknown, unknown>(
      `compliance-documents/${encodeURIComponent(id)}/versions`,
      buildUploadDocumentFormData({ files: input.files, metadata }),
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
