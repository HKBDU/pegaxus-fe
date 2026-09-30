import apiClient from "@/lib/axios";
import {
  dossierIdSchema,
  dossierOverviewEnvelopeSchema,
  dossierRequirementsEnvelopeSchema,
  dossierRequirementsParamsSchema,
  createUploadDocumentSchema,
  uploadDocumentEnvelopeSchema,
  validateUploadFiles,
} from "./schemas";
import type { DossierRequirementsParams, UploadDocumentInput } from "./types";

function buildUploadDocumentFormData({ files, metadata }: Pick<UploadDocumentInput, "files" | "metadata">): FormData {
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
};
