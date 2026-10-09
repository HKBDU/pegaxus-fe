import { routeStatusOptions } from "./constants"
import { transportPlanStatusSchema } from "./transport-plan.schemas"
import type { TransportPlansQueryParams } from "./transport-plan.types"

export const initialTransportPlanParams: TransportPlansQueryParams = {
  pageIndex: 1, pageSize: 20, search: "", sortBy: "createdAt:desc",
}
export const transportPlanStatusOptions = [
  { value: "ALL", label: "All statuses" },
  ...transportPlanStatusSchema.options.map((value) => ({ value, label: value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()) })),
]
export const transportPlanSortOptions = [
  { value: "createdAt:desc", label: "Newest created" },
  { value: "createdAt:asc", label: "Oldest created" },
  { value: "plannedStartAt:asc", label: "Start: earliest" },
  { value: "plannedStartAt:desc", label: "Start: latest" },
]
export { routeStatusOptions }
export function changeTransportPlanFilters(current: TransportPlansQueryParams, patch: Partial<Omit<TransportPlansQueryParams, "pageIndex">>): TransportPlansQueryParams {
  return { ...current, ...patch, pageIndex: 1 }
}
export function hasTransportPlanFilters(params: TransportPlansQueryParams) {
  return Boolean(params.search?.trim() || params.status || params.routePlanStatus)
}
