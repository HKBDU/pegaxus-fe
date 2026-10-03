import type { EntityId } from "@/shared/types"
import type { ComplianceCategory } from "@/features/compliance-catalog/types"

/** GET /bookings/{id}/compliance-dossier (D1). */
export interface ComplianceDossierSummary {
  complianceDossierId: EntityId
  dossierCode: string
  status: string
}

/** A requirement the TS adds on top of (or instead of) a template: same fields as D3. */
export interface CustomRequirementDraft {
  /** Client-side key, never sent to the BE. */
  key: string
  complianceRequirementId: EntityId
  requirementCode: string
  requirementName: string
  category: ComplianceCategory | null
  /** null = applies to the whole trip (R11). */
  horseId: EntityId | null
  horseName: string | null
  isMandatory: boolean
  dueDate?: string
  instruction?: string
}

export interface CreateDossierInput {
  bookingId: EntityId
  /** Missing = custom dossier without a template (UC-18 ALT-01). */
  dossierTemplateId?: EntityId
  selectedTemplateItemIds: EntityId[]
  customRequirements: CustomRequirementDraft[]
}

/** POST /bookings/{id}/compliance-dossier (D2). */
export interface CreateDossierResult {
  complianceDossierId: EntityId
  dossierCode: string
  status: string
  generatedRequirementCount: number
  /** Template + custom: custom lines are added with D3 after D2, so some of them can fail on their own. */
  failedCustomCount: number
}

/** One line of the final dossier, after "applies per horse" items are expanded per horse (R11). */
export interface FinalRequirementRow {
  key: string
  requirementName: string
  category: ComplianceCategory | null
  scope: "HORSE" | "TRIP"
  horseName: string | null
  isMandatory: boolean
  instruction: string | null
  isCustom: boolean
}

export const REQUIREMENT_STATUSES = ["PENDING", "REQUESTED", "PROVIDED", "SATISFIED", "REJECTED", "WAIVED"] as const
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number]

/** One line of GET /compliance-dossiers/{id}/requirements (D8). */
export interface DossierRequirementItem {
  dossierRequirementId: EntityId
  complianceRequirementId: EntityId
  requirementName: string
  /** null = applies to the whole trip (R11). */
  horseId: EntityId | null
  horseName: string | null
  status: RequirementStatus
  isMandatory: boolean
  dueDate: string | null
  validUntil: string | null
  note: string | null
  document: { complianceDocumentId: EntityId; documentCode: string; status: string; latestVersionNo: number } | null
}

export interface DossierRequirementParams {
  pageIndex: number
  pageSize: number
  status: RequirementStatus | "ALL"
  /** "ALL" = trip-level and per-horse lines together. */
  horseId: string
}

/** Body of POST /compliance-dossiers/{id}/requirements (D3). */
export interface AddRequirementInput {
  complianceRequirementId: EntityId
  horseId: EntityId | null
  isMandatory: boolean
  dueDate?: string
  instruction?: string
}
