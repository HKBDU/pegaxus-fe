import { z } from "zod"
import apiClient from "@/lib/axios"
import type { EntityId, PaginatedResponse } from "@/shared/types"
import { getApiErrorInfo, readEnvelope } from "./services"
import { createTransportPlanSchema, updateTransportPlanSchema, transportPlanDetailSchema, transportPlanIdSchema, transportPlansPageSchema, transportPlansQuerySchema } from "./transport-plan.schemas"
import type { CreateTransportPlanInput, UpdateTransportPlanInput, TransportPlanListItem, TransportPlansQueryParams } from "./transport-plan.types"
import { isFlow3MockMode } from "./source"

export const buildTransportPlanQuery = (params: TransportPlansQueryParams) => transportPlansQuerySchema.parse(params)
const detailPath = (id: EntityId) => `/transport-plans/${encodeURIComponent(transportPlanIdSchema.parse(id))}`

export const transportPlanService = {
  async getPlans(params: TransportPlansQueryParams, signal?: AbortSignal): Promise<PaginatedResponse<TransportPlanListItem>> {
    signal?.throwIfAborted()
    const query = buildTransportPlanQuery(params)
    const payload = !import.meta.env.PROD && isFlow3MockMode()
      ? (await import("./mock/mock-service")).flow3MockService.getPlans(query)
      : await apiClient.get<unknown, unknown>("/transport-plans", { params: query, signal })
    const page = transportPlansPageSchema.parse(readEnvelope(payload))
    return { data: page.items, meta: {
      currentPage: page.pageIndex, itemsPerPage: page.pageSize, totalItems: page.totalItems, totalPages: page.totalPages,
      hasPreviousPage: page.pageIndex > 1, hasNextPage: page.pageIndex < page.totalPages,
    } }
  },
  async getPlan(id: EntityId, signal?: AbortSignal) {
    const path = detailPath(id)
    signal?.throwIfAborted()
    const payload = !import.meta.env.PROD && isFlow3MockMode()
      ? (await import("./mock/mock-service")).flow3MockService.getPlan(String(id))
      : await apiClient.get<unknown, unknown>(path, { signal })
    return transportPlanDetailSchema.parse(readEnvelope(payload))
  },
  async createPlan(bookingId: string, input: CreateTransportPlanInput) {
    const id = transportPlanIdSchema.parse(bookingId), body = createTransportPlanSchema.parse(input)
    const payload = !import.meta.env.PROD && isFlow3MockMode()
      ? (await import("./mock/mock-service")).flow3MockService.createPlan(id, body)
      : await apiClient.post<unknown, unknown>(`/bookings/${encodeURIComponent(id)}/transport-plans`, body)
    return transportPlanDetailSchema.parse(readEnvelope(payload))
  },
  async updatePlan(id: string, input: UpdateTransportPlanInput) {
    const path = detailPath(id), body = updateTransportPlanSchema.parse(input)
    const payload = !import.meta.env.PROD && isFlow3MockMode()
      ? (await import("./mock/mock-service")).flow3MockService.updatePlan(id, body)
      : await apiClient.put<unknown, unknown>(path, body)
    return transportPlanDetailSchema.parse(readEnvelope(payload))
  },
}

export function getTransportPlanError(error: unknown, context: "list" | "detail" | "quotation" | "personnel" = "detail") {
  const { code, status, message } = getApiErrorInfo(error)
  if (code === "PLAN_LOCKED") return { message: message || "This plan is locked because transportation has started or ended.", retryable: false }
  if (code === "TRANSPORT_PLAN_MODIFIED") return { message: message || "This plan has changed. Reload Latest Data before saving again.", retryable: false }
  if (code === "TRANSPORT_PLAN_ALREADY_EXISTS") return { message: message || "A plan already exists for this booking. Open the existing plan instead.", retryable: false }
  if (code === "BOOKING_NOT_FOUND") return { message: message || "Booking not found.", retryable: false }
  if (code === "INVALID_BOOKING_STATUS") return { message: message || "Booking must be approved before creating a plan.", retryable: false }
  if (code === "VALIDATION_ERROR") return { message: message || "Check the transport plan fields and try again.", retryable: false }
  if (code === "UNAUTHORIZED" || status === 401) return { message: "Your session has expired. Please sign in again.", retryable: false }
  if (code === "FORBIDDEN" || status === 403) return { message: "You do not have permission to view this transport plan.", retryable: false }
  if (code === "TRANSPORT_PLAN_NOT_FOUND") return { message: "Transport plan not found or no longer available.", retryable: false }
  if (status === 404) return { message: context === "detail" ? "Transport plan not found or its API is unavailable." : "This transport plan API is not available. Please contact your administrator.", retryable: false }
  if (code === "INVALID_SORT_PARAMETER") return { message: "This sort option is not supported. Select another sort option.", retryable: false }
  if (error instanceof z.ZodError) return { message: "The server returned an unexpected transport plan response.", retryable: false }
  const subject = { list: "transport plans", detail: "the transport plan", quotation: "the quotation", personnel: "personnel assignments" }[context]
  return { message: `Unable to load ${subject}. Please try again.`, retryable: true }
}
