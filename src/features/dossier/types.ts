import type { z } from "zod"
import type { EntityId, PaginationMeta } from "@/shared/types"
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
  documentReviewSchema,
  documentReviewEnvelopeSchema,
  rejectDocumentReviewSchema,
  documentRequestFormSchema,
  readyForSubmissionEnvelopeSchema,
  missingDocumentReminderSchema,
  missingDocumentReminderEnvelopeSchema,
  dossierStatusSchema,
} from "./schemas"

export const DOSSIER_STATUSES = ["DRAFT", "IN_PREPARATION", "READY_FOR_SUBMISSION", "SUBMITTED", "PENDING", "APPROVED", "REJECTED", "CLOSED"] as const
export type DossierStatus = z.infer<typeof dossierStatusSchema>
export type DossierRisk = "URGENT_RISK" | "NORMAL"
export type DossierRouteType = "DOMESTIC" | "CROSS_BORDER"
export type DashboardSort =
  | "requestedDepartureDate:asc"
  | "requestedDepartureDate:desc"
  | "progressPercent:asc"
  | "progressPercent:desc"
  | "status:asc"
  | "status:desc"

/** Dossier overview contract used by both the dashboard and document workflow. */
export type DossierOverview = Omit<z.infer<typeof dossierOverviewSchema>, "openedAt"> & {
  openedAt: string | null
}
export type DossierRequirement = z.infer<typeof dossierRequirementSchema>
export type DossierRequirementStatus = z.infer<typeof dossierRequirementStatusSchema>
export type DossierRequirementsParams = z.input<typeof dossierRequirementsParamsSchema>
export type DossierRequirementsPage = z.infer<typeof dossierRequirementsPageSchema>
export type BookingSummary = z.infer<typeof bookingSummarySchema>
export type DossierHorseOption = z.infer<typeof dossierHorseOptionSchema>
export type RequirementSummary = z.infer<typeof requirementSummarySchema>
export type UploadDocumentResult = z.infer<typeof uploadDocumentResultSchema>
export type ComplianceDocumentDetail = z.infer<typeof complianceDocumentDetailSchema>
export type DocumentVersion = z.infer<typeof documentVersionSchema>
export type DocumentVersionFile = z.infer<typeof documentVersionFileSchema>
export type DocumentReviewSummary = z.infer<typeof documentReviewSummarySchema>
export type DocumentRequestSummary = z.infer<typeof documentRequestSummarySchema>
export type SubmitDocumentVersionResult = z.infer<typeof submitDocumentVersionEnvelopeSchema>["value"]
export type UpdateDocumentMetadataResult = z.infer<typeof updateDocumentMetadataEnvelopeSchema>["value"]
export type ApproveDocumentReview = z.infer<typeof approveDocumentReviewSchema>
export type ApproveDocumentResponse = z.infer<typeof approveDocumentEnvelopeSchema>
export type RejectDocumentReview = z.infer<typeof rejectDocumentReviewSchema>
export type DocumentRequestFormValues = z.input<typeof documentRequestFormSchema>
export type DocumentReviewPayload = z.infer<typeof documentReviewSchema>
export type DocumentReviewResponse = z.infer<typeof documentReviewEnvelopeSchema>
export type ReadyForSubmissionResponse = z.infer<typeof readyForSubmissionEnvelopeSchema>
export type MissingDocumentReminderInput = z.infer<typeof missingDocumentReminderSchema>
export type MissingDocumentReminderFormValues = z.input<typeof missingDocumentReminderSchema>
export type MissingDocumentReminderResponse = z.infer<typeof missingDocumentReminderEnvelopeSchema>
export type MissingDocumentReminderResult = MissingDocumentReminderResponse["value"]
export type SendMissingDocumentReminderInput = { dossierId: string; reminder: MissingDocumentReminderInput }
export type ApproveDocumentInput = {
  documentId: string
  versionId: number
  dossierId: string
  review: ApproveDocumentReview
}
export type DocumentReviewInput = Omit<ApproveDocumentInput, "review"> & { review: DocumentReviewPayload }
export type DocumentReviewError = {
  code: string
  message: string
  backendMessage?: string
  refresh: boolean
}
export type UploadDocumentError = {
  code: string
  message: string
  field?: "expiryDate"
  refresh?: "overview" | "requirements"
}
export type UploadDocumentMetadata = {
  documentName: string
  documentNumber: string
  issuingAuthority: string
  issuedDate: string
  expiryDate: string
}
export type DossierUploadedAssetRef = {
  publicId: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
}
export type UploadDocumentInput = {
  dossierId: string
  requirementId: number
  files: DossierUploadedAssetRef[]
  metadata: UploadDocumentMetadata
}
export type SubmitDocumentVersionInput = {
  documentId: string
  dossierId?: string
  files: DossierUploadedAssetRef[]
  metadata: Pick<UploadDocumentMetadata, "documentNumber" | "issuingAuthority" | "issuedDate" | "expiryDate"> & { uploadNote?: string }
}
export type UpdateDocumentMetadataInput = {
  documentId: string
  dossierId?: string
  changes: Partial<UploadDocumentMetadata & { note: string }>
}

export interface DashboardKpi {
  totalActive: number
  readyForDeparture: number
  actionRequired: number
  submittedToAuthorities: number
  urgentRisk: number
}
export interface DashboardItem {
  complianceDossierId: EntityId
  dossierCode?: string
  bookingCode: string
  customerName: string
  originCountry: string
  destinationCountry: string
  requestedDepartureDate: string
  progressPercent: number
  status: DossierStatus
  isUrgentRisk: boolean
}
export interface DashboardParams {
  pageIndex: number
  pageSize: number
  search: string
  status: DossierStatus | "ALL"
  risk: DossierRisk | "ALL"
  routeType: DossierRouteType | "ALL"
  sortBy: DashboardSort
}
export interface DashboardResponse {
  kpi: DashboardKpi
  data: DashboardItem[]
  meta: PaginationMeta
}
export type ExportFormat = "xlsx" | "pdf"

export const AUDIT_ACTION_TYPES = [
  "DOSSIER_INITIALIZED", "DOSSIER_STATUS_CHANGED", "DOSSIER_REQUIREMENT_ADDED", "DOSSIER_REQUIREMENT_REMOVED",
  "DOSSIER_REQUIREMENT_UPDATED", "DOSSIER_REQUIREMENT_WAIVED", "DOSSIER_REQUIREMENT_REMINDED", "DOCUMENT_VERSION_SUBMITTED",
  "DOCUMENT_REVIEW_APPROVED", "DOCUMENT_REVIEW_REJECTED", "DOCUMENT_REVIEW_REVISION_REQUIRED", "DOCUMENT_REQUEST_CREATED",
  "AUTHORITY_SUBMITTED", "AUTHORITY_DECISION_UPDATED", "QUARANTINE_PROOF_SUBMITTED", "QUARANTINE_RESULT_FINALIZED",
  "CUSTOMS_PROOF_SUBMITTED", "CUSTOMS_RESULT_FINALIZED",
] as const
export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number]
export interface AuditEvent {
  actionType: AuditActionType
  targetEntity: string
  targetEntityId: EntityId
  actor: { accountId: EntityId; fullName: string; role: string }
  note: string | null
  occurredAt: string
}
export interface AuditParams {
  pageIndex: number
  pageSize: number
  search: string
  actionType: AuditActionType | "ALL"
  from: string
  to: string
}
export interface AuditResponse {
  data: AuditEvent[]
  meta: PaginationMeta
}

export type DossierSourceKind = "api" | "mock"
export type DossierMockScenario = "normal" | "locked" | "empty" | "error"
export type DossierLoadErrorKind = "forbidden" | "not-found" | "contract" | "unauthorized" | "load"
