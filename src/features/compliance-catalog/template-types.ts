import type { EntityId, PaginationMeta } from "@/shared/types"

export const TEMPLATE_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"] as const

export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number]
export type TemplateSort = "updatedAt:desc" | "templateName:asc" | "templateName:desc" | "recommendation:desc"

/** One row of GET /dossier-templates (T1). */
export interface DossierTemplateSummary {
  dossierTemplateId: EntityId
  templateCode: string
  templateName: string
  versionNo: number
  status: TemplateStatus
  effectiveFrom: string | null
  effectiveTo: string | null
  itemCount: number
  updatedAt: string
  /** Only returned when T1 is called with bookingId (UC-18 recommendation). */
  isRecommended?: boolean
  recommendationRank?: number
  matchedCountries?: string[]
  recommendationReason?: string
}

export interface DossierTemplateItem {
  dossierTemplateItemId?: EntityId
  complianceRequirementId: EntityId
  requirementName: string
  sequenceNo: number
  isMandatory: boolean
  appliesPerHorse: boolean
  instruction: string | null
}

/** GET /dossier-templates/{id} (T2). */
export interface DossierTemplate extends DossierTemplateSummary {
  description: string | null
  /** Backend T2 returns this computed flag instead of referenceCount/isReferenced. */
  canDelete: boolean
  isReferenced?: boolean
  referenceCount?: { complianceDossierCount: number }
  items: DossierTemplateItem[]
}

export interface DossierTemplateListParams {
  pageIndex: number
  pageSize: number
  search: string
  country: string
  status: TemplateStatus | "ALL"
  sortBy: TemplateSort
  /** Switches T1 to the recommendation mode for that booking (UC-18). */
  bookingId?: EntityId
}

export interface DossierTemplateListResponse {
  data: DossierTemplateSummary[]
  meta: PaginationMeta
}

/** Body of POST (T3) / PUT (T4). */
export interface DossierTemplatePayload {
  templateCode: string
  templateName: string
  description?: string
  status: TemplateStatus
  effectiveFrom?: string
  effectiveTo?: string
  items: {
    complianceRequirementId: EntityId
    sequenceNo: number
    isMandatory: boolean
    appliesPerHorse: boolean
    instruction?: string
  }[]
}

export interface SaveDossierTemplateResult {
  dossierTemplateId: EntityId
  templateCode: string
  versionNo?: number
}
