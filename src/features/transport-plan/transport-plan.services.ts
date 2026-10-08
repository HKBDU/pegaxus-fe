import { z } from "zod"
import apiClient from "@/lib/axios"
import type { EntityId, PaginatedResponse } from "@/shared/types"
import { getApiErrorInfo, readEnvelope } from "./services"
import { transportPlanAssignmentsSchema, transportPlanDetailSchema, transportPlanIdSchema, transportPlanQuotationSchema, transportPlansPageSchema, transportPlansQuerySchema } from "./transport-plan.schemas"
import type { TransportPlanListItem, TransportPlansQueryParams } from "./transport-plan.types"

export const buildTransportPlanQuery = (params: TransportPlansQueryParams) => transportPlansQuerySchema.parse(params)
const detailPath = (id: EntityId) => `/transport-plans/${encodeURIComponent(transportPlanIdSchema.parse(id))}`

export const transportPlanService = {
  async getPlans(params: TransportPlansQueryParams, signal?: AbortSignal): Promise<PaginatedResponse<TransportPlanListItem>> {
    const payload = await apiClient.get<unknown, unknown>("/transport-plans", { params: buildTransportPlanQuery(params), signal })
    const page = transportPlansPageSchema.parse(readEnvelope(payload))
    return { data: page.items, meta: {
      currentPage: page.pageIndex, itemsPerPage: page.pageSize, totalItems: page.totalItems, totalPages: page.totalPages,
      hasPreviousPage: page.pageIndex > 1, hasNextPage: page.pageIndex < page.totalPages,
    } }
  },
  async getPlan(id: EntityId, signal?: AbortSignal) {
    const payload = await apiClient.get<unknown, unknown>(detailPath(id), { signal })
    return transportPlanDetailSchema.parse(readEnvelope(payload))
  },
  async getQuotation(id: EntityId, signal?: AbortSignal) {
    try {
      const payload = await apiClient.get<unknown, unknown>(`${detailPath(id)}/quotation`, { signal })
      return transportPlanQuotationSchema.parse(readEnvelope(payload))
    } catch (error) {
      const { code, status } = getApiErrorInfo(error)
      // A missing quotation is normal; a missing endpoint/plan is still an error.
      if (status === 404 && code === "QUOTATION_NOT_FOUND") return null
      throw error
    }
  },
  async getAssignments(id: EntityId, signal?: AbortSignal) {
    const payload = await apiClient.get<unknown, unknown>(`${detailPath(id)}/assignments`, { signal })
    return transportPlanAssignmentsSchema.parse(readEnvelope(payload))
  },
}

export function getTransportPlanError(error: unknown, context: "list" | "detail" | "quotation" | "personnel" = "detail") {
  const { code, status } = getApiErrorInfo(error)
  if (status === 401) return { message: "Your session has expired. Please sign in again.", retryable: false }
  if (status === 403) return { message: "You do not have permission to view this transport plan.", retryable: false }
  if (code === "TRANSPORT_PLAN_NOT_FOUND") return { message: "Transport plan not found or no longer available.", retryable: false }
  if (status === 404) return { message: context === "detail" ? "Transport plan not found or its API is unavailable." : "This transport plan API is not available. Please contact your administrator.", retryable: false }
  if (code === "INVALID_SORT_PARAMETER") return { message: "This sort option is not supported. Select another sort option.", retryable: false }
  if (error instanceof z.ZodError) return { message: "The server returned an unexpected transport plan response.", retryable: false }
  const subject = { list: "transport plans", detail: "the transport plan", quotation: "the quotation", personnel: "personnel assignments" }[context]
  return { message: `Unable to load ${subject}. Please try again.`, retryable: true }
}
