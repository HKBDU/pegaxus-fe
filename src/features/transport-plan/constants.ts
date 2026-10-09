import type { ApprovedBookingsQueryParams } from "./types"
import { approvedBookingsQuerySchema, dossierStatusSchema, routePlanStatusSchema } from "./schemas"

export const initialApprovedBookingParams: ApprovedBookingsQueryParams = {
  pageIndex: 1, pageSize: 20, search: "", sortBy: "requestedDepartureDate:asc",
}
export const scopeOptions = [
  { value: "ALL", label: "All scopes" },
  { value: "false", label: "Domestic" },
  { value: "true", label: "International" },
]
export const formatStatusLabel = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())
export const routeStatusOptions = [{ value: "ALL", label: "All route statuses" }, ...routePlanStatusSchema.options.map((value) => ({ value, label: formatStatusLabel(value) }))]
export const dossierStatusOptions = [{ value: "ALL", label: "All dossier statuses" }, ...dossierStatusSchema.options.map((value) => ({ value, label: formatStatusLabel(value) }))]
export const presenceOptions = [{ value: "ALL", label: "All" }, { value: "true", label: "Exists" }, { value: "false", label: "Not created" }]
export const sortOptions = [
  { value: "requestedDepartureDate:asc", label: "Departure: earliest" },
  { value: "requestedDepartureDate:desc", label: "Departure: latest" },
  { value: "approvedAt:asc", label: "Approval: oldest" },
  { value: "approvedAt:desc", label: "Approval: newest" },
  { value: "createdAt:asc", label: "Created: oldest" },
  { value: "createdAt:desc", label: "Created: newest" },
]

export function changeApprovedBookingFilters(
  current: ApprovedBookingsQueryParams,
  patch: Partial<Omit<ApprovedBookingsQueryParams, "pageIndex">>,
): ApprovedBookingsQueryParams {
  return { ...current, ...patch, pageIndex: 1 }
}

export function hasApprovedBookingFilters(params: ApprovedBookingsQueryParams) {
  return Boolean(params.search?.trim() || params.isInternational != null || params.transportPlanStatus || params.routePlanStatus ||
    params.hasRoutePlan != null || params.hasTransportPlan != null || params.hasComplianceDossier != null || params.complianceDossierStatus || params.departureFrom || params.departureTo)
}

export function buildDepartureRange(from: string, to: string) {
  const range = approvedBookingsQuerySchema.parse({ ...initialApprovedBookingParams, departureFrom: from || undefined, departureTo: to || undefined })
  return { departureFrom: range.departureFrom, departureTo: range.departureTo }
}
