import type { Booking } from "@/features/booking/types"
import type { EntityId } from "@/shared/types"
import type { ComplianceCategory } from "@/features/compliance-catalog/types"

/**
 * What the apply-template wizard reads from a booking (header, route countries, horses). Narrower than the Flow 1
 * Booking on purpose: the Transport Specialist gets it from AB2, which has no customer or audit data.
 */
export type ApplyBooking = Pick<Booking, "bookingId" | "bookingCode" | "status" | "originCountry" | "destinationCountry"> & {
  transportId: EntityId | null
  customer: { fullName: string }
  horses: { horseId: EntityId; horseName: string }[]
}

/** A transport can carry one MAIN dossier and one EXTRA dossier (DB v9: unique per transport and type). */
export type DossierType = "MAIN" | "EXTRA"

/** GET /bookings/{id}/compliance-dossier (D1): the MAIN dossier, or the first one when the BE sends no type. */
export interface ComplianceDossierSummary {
  complianceDossierId: EntityId
  dossierCode: string
  status: string
  dossierType?: DossierType | null
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

/** POST /bookings/{bookingId}/compliance-dossier (D2): the deployed BE takes the booking id, not the transport id the contract names. */
export interface CreateDossierResult {
  complianceDossierId: EntityId
  dossierCode: string
  status: string
  dossierType?: DossierType | null
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
  leadTimeDays?: number
  instruction?: string
  reason?: string
}

/** Body of PATCH /compliance-dossiers/{id}/requirements/{requirementId}. */
export interface UpdateRequirementInput {
  isMandatory?: boolean
  leadTimeDays?: number
  instruction?: string
  reason: string
}

export interface WaiveRequirementInput {
  waivedReason: string
}
