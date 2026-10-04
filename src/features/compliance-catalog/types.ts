import type { EntityId, PaginationMeta } from "@/shared/types"

export const COMPLIANCE_CATEGORIES = ["QUARANTINE", "CUSTOMS", "TRANSPORT", "HORSE_HEALTH", "HORSE_IDENTITY", "OTHER"] as const
export const COMPLIANCE_STATUSES = ["ACTIVE", "INACTIVE"] as const

export type ComplianceCategory = (typeof COMPLIANCE_CATEGORIES)[number]
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number]
export type ComplianceSort = "updatedAt:desc" | "updatedAt:asc" | "requirementCode:asc"

export interface ApiEnvelope<T> {
  isSuccess: boolean
  code: number
  message: string
  value: T
}

export interface ReferenceCount {
  dossierTemplateItemCount: number
  dossierRequirementCount: number
  linkedDossierCount: number
}

/** One row of GET /compliance-requirements (C1). */
export interface ComplianceRequirementSummary {
  complianceRequirementId: EntityId
  requirementCode: string
  requirementName: string
  country: string | null
  category: ComplianceCategory
  validityRequired: boolean
  validityPeriodDays: number | null
  status: ComplianceStatus
  updatedAt: string
  /** Not in contract C1 yet: the list design has an "Applicable BCP" column. */
  bcpCode?: string | null
}

/** GET /compliance-requirements/{id} (C2). */
export interface ComplianceRequirement extends ComplianceRequirementSummary {
  description: string | null
  issuingAuthority: string | null
  bcpCode: string | null
  legalBasis: string | null
  createdAt: string
  isReferenced: boolean
  referenceCount: ReferenceCount
}

export interface ComplianceRequirementListParams {
  pageIndex: number
  pageSize: number
  search: string
  country: string
  category: ComplianceCategory | "ALL"
  status: ComplianceStatus | "ALL"
  sortBy: ComplianceSort
}

export interface ComplianceRequirementListResponse {
  data: ComplianceRequirementSummary[]
  meta: PaginationMeta
}

/** Body of POST (C3) / PUT (C4). */
export interface ComplianceRequirementPayload {
  requirementCode: string
  requirementName: string
  description?: string
  country?: string
  category: ComplianceCategory
  issuingAuthority?: string
  validityRequired: boolean
  validityPeriodDays?: number
  bcpCode?: string
  legalBasis?: string
  status: ComplianceStatus
  acknowledgeReferenceImpact?: boolean
}

export interface CreateComplianceRequirementResult {
  complianceRequirementId: EntityId
  requirementCode: string
}

export interface UpdateComplianceRequirementResult {
  complianceRequirementId: EntityId
  updatedAt: string
}
