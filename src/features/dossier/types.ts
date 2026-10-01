import type { z } from "zod";
import type {
  dossierOverviewSchema,
  dossierRequirementSchema,
  dossierRequirementStatusSchema,
  dossierRequirementsParamsSchema,
  dossierRequirementsPageSchema,
  bookingSummarySchema,
  dossierHorseOptionSchema,
  requirementSummarySchema,
  uploadDocumentResultSchema,
  complianceDocumentDetailSchema,
  documentVersionSchema,
  documentVersionFileSchema,
  documentReviewSummarySchema,
  documentRequestSummarySchema,
  submitDocumentVersionEnvelopeSchema,
  updateDocumentMetadataEnvelopeSchema,
  approveDocumentReviewSchema,
  approveDocumentEnvelopeSchema,
  readyForSubmissionEnvelopeSchema,
} from "./schemas";

export type DossierOverview = z.infer<typeof dossierOverviewSchema>;
export type DossierRequirement = z.infer<typeof dossierRequirementSchema>;
export type DossierRequirementStatus = z.infer<typeof dossierRequirementStatusSchema>;
export type DossierRequirementsParams = z.input<typeof dossierRequirementsParamsSchema>;
export type DossierRequirementsPage = z.infer<typeof dossierRequirementsPageSchema>;
export type BookingSummary = z.infer<typeof bookingSummarySchema>;
export type DossierHorseOption = z.infer<typeof dossierHorseOptionSchema>;
export type RequirementSummary = z.infer<typeof requirementSummarySchema>;
export type UploadDocumentResult = z.infer<typeof uploadDocumentResultSchema>;
export type ComplianceDocumentDetail = z.infer<typeof complianceDocumentDetailSchema>;
export type DocumentVersion = z.infer<typeof documentVersionSchema>;
export type DocumentVersionFile = z.infer<typeof documentVersionFileSchema>;
export type DocumentReviewSummary = z.infer<typeof documentReviewSummarySchema>;
export type DocumentRequestSummary = z.infer<typeof documentRequestSummarySchema>;
export type SubmitDocumentVersionResult = z.infer<typeof submitDocumentVersionEnvelopeSchema>["value"];
export type UpdateDocumentMetadataResult = z.infer<typeof updateDocumentMetadataEnvelopeSchema>["value"];
export type ApproveDocumentReview = z.infer<typeof approveDocumentReviewSchema>;
export type ApproveDocumentResponse = z.infer<typeof approveDocumentEnvelopeSchema>;
export type ReadyForSubmissionResponse = z.infer<typeof readyForSubmissionEnvelopeSchema>;
export type ApproveDocumentInput = {
  documentId: string;
  versionId: number;
  dossierId: string;
  review: ApproveDocumentReview;
};
export type DocumentReviewError = {
  code: string;
  message: string;
  backendMessage?: string;
  refresh: boolean;
};
export type UploadDocumentError = {
  code: string;
  message: string;
  field?: "expiryDate";
  refresh?: "overview" | "requirements";
};
export type UploadDocumentMetadata = {
  documentName: string;
  documentNumber: string;
  issuingAuthority: string;
  issuedDate: string;
  expiryDate: string;
};
export type UploadDocumentInput = {
  dossierId: string;
  requirementId: number;
  files: File[];
  metadata: UploadDocumentMetadata;
};
export type SubmitDocumentVersionInput = {
  documentId: string;
  dossierId?: string;
  files: File[];
  metadata: Pick<UploadDocumentMetadata, "documentNumber" | "issuingAuthority" | "issuedDate" | "expiryDate"> & { uploadNote?: string };
};
export type UpdateDocumentMetadataInput = {
  documentId: string;
  dossierId?: string;
  changes: Partial<UploadDocumentMetadata & { note: string }>;
};

export type DossierSourceKind = "api" | "mock";
export type DossierMockScenario = "normal" | "locked" | "empty" | "error";
export type DossierLoadErrorKind = "forbidden" | "not-found" | "contract" | "unauthorized" | "load";
