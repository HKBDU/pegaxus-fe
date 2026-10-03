import type { EntityId, PaginationMeta } from "@/shared/types"

export const DOSSIER_STATUSES = ["DRAFT", "IN_PREPARATION", "READY_FOR_SUBMISSION", "SUBMITTED", "PENDING", "APPROVED", "REJECTED", "CLOSED"] as const
export type DossierStatus = (typeof DOSSIER_STATUSES)[number]

export type DossierRisk = "URGENT_RISK" | "NORMAL"
export type DossierRouteType = "DOMESTIC" | "CROSS_BORDER"
export type DashboardSort =
  | "requestedDepartureDate:asc"
  | "requestedDepartureDate:desc"
  | "progressPercent:asc"
  | "progressPercent:desc"
  | "status:asc"
  | "status:desc"

/** `value.kpi` of GET /compliance-dossiers/dashboard (K1). */
export interface DashboardKpi {
  totalActive: number
  readyForDeparture: number
  actionRequired: number
  submittedToAuthorities: number
  urgentRisk: number
}

export interface DashboardItem {
  complianceDossierId: EntityId
  /** Not in K1 yet: the design shows a "Dossier code" column. */
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

/** GET /compliance-dossiers/{id} (D7). */
export interface DossierOverview {
  complianceDossierId: EntityId
  dossierCode: string
  bookingId: EntityId
  bookingCode: string
  status: DossierStatus
  openedAt: string
  progressPercent: number
  mandatoryTotal: number
  mandatorySatisfiedOrWaived: number
  writeLocked: boolean
  writeLockReason: string | null
}

export const AUDIT_ACTION_TYPES = [
  "DOSSIER_INITIALIZED",
  "DOSSIER_STATUS_CHANGED",
  "DOSSIER_REQUIREMENT_ADDED",
  "DOSSIER_REQUIREMENT_REMOVED",
  "DOSSIER_REQUIREMENT_UPDATED",
  "DOSSIER_REQUIREMENT_WAIVED",
  "DOSSIER_REQUIREMENT_REMINDED",
  "DOCUMENT_VERSION_SUBMITTED",
  "DOCUMENT_REVIEW_APPROVED",
  "DOCUMENT_REVIEW_REJECTED",
  "DOCUMENT_REVIEW_REVISION_REQUIRED",
  "DOCUMENT_REQUEST_CREATED",
  "AUTHORITY_SUBMITTED",
  "AUTHORITY_DECISION_UPDATED",
  "QUARANTINE_PROOF_SUBMITTED",
  "QUARANTINE_RESULT_FINALIZED",
  "CUSTOMS_PROOF_SUBMITTED",
  "CUSTOMS_RESULT_FINALIZED",
] as const
export type AuditActionType = (typeof AUDIT_ACTION_TYPES)[number]

/** One event of GET /compliance-dossiers/{id}/audit-history (K3). The table is append-only: there is no write API. */
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
  /** yyyy-MM-dd, inclusive. */
  from: string
  to: string
}

export interface AuditResponse {
  data: AuditEvent[]
  meta: PaginationMeta
}
