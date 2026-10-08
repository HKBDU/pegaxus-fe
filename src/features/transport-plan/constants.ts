import type { ApprovedBookingsQueryParams } from "./types"

export const initialApprovedBookingParams: ApprovedBookingsQueryParams = {
  pageIndex: 1, pageSize: 20, search: "", sortBy: "requestedDepartureDate:asc",
}
export const scopeOptions = [
  { value: "ALL", label: "All scopes" },
  { value: "DOMESTIC", label: "Domestic" },
  { value: "INTERNATIONAL", label: "International" },
]
export const depositOptions = [
  { value: "ALL", label: "All deposits" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID", label: "Paid" },
]
export const planningOptions = [
  { value: "ALL", label: "All planning statuses" },
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
]
export const sortOptions = [
  { value: "requestedDepartureDate:asc", label: "Departure: earliest" },
  { value: "requestedDepartureDate:desc", label: "Departure: latest" },
  { value: "approvedAt:asc", label: "Approval: oldest" },
  { value: "approvedAt:desc", label: "Approval: newest" },
]

export function changeApprovedBookingFilters(
  current: ApprovedBookingsQueryParams,
  patch: Partial<Omit<ApprovedBookingsQueryParams, "pageIndex">>,
): ApprovedBookingsQueryParams {
  return { ...current, ...patch, pageIndex: 1 }
}

export function hasApprovedBookingFilters(params: ApprovedBookingsQueryParams) {
  return Boolean(params.search?.trim() || params.transportScope || params.depositStatus ||
    params.routePlanningStatus || params.departureFrom || params.departureTo)
}
