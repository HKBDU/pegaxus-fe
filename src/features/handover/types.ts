import type { z } from "zod"
import type { handoverListItemSchema, handoverListSchema, handoverRecordSchema, segmentsOverviewSchema } from "./schemas"

export type HandoverRecord = z.infer<typeof handoverRecordSchema>
export type HandoverParty = HandoverRecord["from"]
export type HandoverListItem = z.infer<typeof handoverListItemSchema>
export type HandoverList = z.infer<typeof handoverListSchema>
export type SegmentsOverview = z.infer<typeof segmentsOverviewSchema>
export type HandoverBoundary = SegmentsOverview["handoverBoundaries"][number]
export type OverviewSegment = SegmentsOverview["segments"][number]

export interface ListFilters {
  handoverType?: string
  status?: string
}

/** HO3 body. Parties and location are filled in by the BE from the boundary; only `OTHER` sends parties. */
export interface CreateHandoverInput {
  handoverType: string
  fromRoutePlanRouteId?: string | null
  toRoutePlanRouteId?: string | null
  startNow: boolean
  plannedHandoverAt?: string
}

export interface PartyDraft {
  partyName: string
  contactName: string
  contactPhone: string
}

export interface LocationDraft {
  locationName: string
  address: string
  country: string
}

/** The editable part of the completion form (HO5). */
export interface CompleteDraft {
  horseConditionNote: string
  documentHandoverNote: string
  equipmentHandoverNote: string
  discrepancyNote: string
  from: PartyDraft
  to: PartyDraft
  location: LocationDraft
}

export interface CompleteInput extends CompleteDraft {
  lastUpdatedAt: string
  senderSignature: Blob
  receiverSignature: Blob
}

export interface CancelInput {
  lastUpdatedAt: string
  cancellationReason: string
}

/** A pen stroke in a signature pad: points as fractions (0-1) of the pad width and height. */
export type SignatureStroke = Array<{ x: number; y: number }>
