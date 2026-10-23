import type { z } from "zod"

import type {
  cancelFormSchema,
  customerIncidentSchema,
  incidentListItemSchema,
  incidentListSchema,
  incidentSchema,
  resolveFormSchema,
} from "./schemas"

export type Incident = z.infer<typeof incidentSchema>
export type CustomerIncident = z.infer<typeof customerIncidentSchema>
export type IncidentListItem = z.infer<typeof incidentListItemSchema>
export type IncidentList = z.infer<typeof incidentListSchema>

/** Fields both audiences share, for the pieces that render either view. */
export type IncidentLike = Incident | CustomerIncident
export type IncidentCostRequest = Incident["costRequests"][number]
export type IncidentHold = NonNullable<Incident["hold"]>
export type IncidentPhoto = Incident["photos"][number]

export type ResolveFormValues = z.infer<typeof resolveFormSchema>
export type CancelFormValues = z.infer<typeof cancelFormSchema>

/** Sort keys the BE accepts (`field:asc|desc`, comma separated). */
export type IncidentSort =
  | "severity:desc,occurredAt:desc"
  | "occurredAt:desc"
  | "occurredAt:asc"
  | "updatedAt:desc"

export interface IncidentListParams {
  /** Comma list of statuses, or "" for all. */
  status: string
  category: string
  severity: string
  transportId?: string
  hasPendingCost?: boolean
  emergencySettlementRequired?: boolean
  occurredFrom: string
  occurredTo: string
  search: string
  pageIndex: number
  pageSize: number
  sortBy: IncidentSort
}

/** Body of IN9 / IN10 / IN11 plus the optimistic-lock stamp (`lastUpdatedAt` = `updatedAt` of the loaded incident). */
export interface ResolveInput {
  lastUpdatedAt: string
  resolutionSummary: string
  emergencySettlementConfirmed: boolean
}
export interface SelfResolveInput {
  lastUpdatedAt: string
  resolutionSummary: string
}
export interface CancelInput {
  lastUpdatedAt: string
  cancellationReason: string
}

/** Audience of the detail page: the admin shell (LM / RC / TS) or the mobile crew shell (DRV / ESC). */
export type IncidentAudience = "admin" | "crew"
