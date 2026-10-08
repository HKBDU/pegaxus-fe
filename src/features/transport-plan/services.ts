import { isAxiosError } from "axios"
import { z } from "zod"
import apiClient from "@/lib/axios"
import type { ApiEnvelope } from "@/features/booking/types"
import type { EntityId, PaginatedResponse } from "@/shared/types"
import { approvedBookingDetailSchema, approvedBookingsPageSchema, approvedBookingsQuerySchema, entityIdSchema } from "./schemas"
import type { ApprovedBookingListItem, ApprovedBookingsQueryParams } from "./types"

const envelopeSchema = z.object({
  isSuccess: z.boolean(), code: z.number(), message: z.string(), value: z.unknown(), errorCode: z.string().nullish(),
})
class ApprovedBookingApiError extends Error {
  readonly status: number
  readonly errorCode?: string | null
  constructor(status: number, errorCode?: string | null) {
    super(errorCode || "APPROVED_BOOKING_REQUEST_FAILED")
    this.status = status
    this.errorCode = errorCode
  }
}

export function readEnvelope(response: unknown) {
  const parsed = envelopeSchema.parse(response)
  const envelope: ApiEnvelope<unknown> = parsed
  if (!envelope.isSuccess) throw new ApprovedBookingApiError(envelope.code, parsed.errorCode)
  return envelope.value
}

export function buildApprovedBookingQuery(params: ApprovedBookingsQueryParams) {
  return approvedBookingsQuerySchema.parse(params)
}

export const approvedBookingService = {
  async getApprovedBookings(params: ApprovedBookingsQueryParams, signal?: AbortSignal): Promise<PaginatedResponse<ApprovedBookingListItem>> {
    const response = await apiClient.get<unknown, unknown>("/approved-bookings", {
      params: buildApprovedBookingQuery(params), signal,
    })
    const page = approvedBookingsPageSchema.parse(readEnvelope(response))
    return {
      data: page.items,
      meta: {
        currentPage: page.pageIndex, itemsPerPage: page.pageSize,
        totalItems: page.totalItems, totalPages: page.totalPages,
        hasPreviousPage: page.pageIndex > 1, hasNextPage: page.pageIndex < page.totalPages,
      },
    }
  },
  async getApprovedBooking(bookingId: EntityId, signal?: AbortSignal) {
    const id = entityIdSchema.parse(bookingId)
    const response = await apiClient.get<unknown, unknown>(`/approved-bookings/${encodeURIComponent(id)}`, { signal })
    return approvedBookingDetailSchema.parse(readEnvelope(response))
  },
}

const errorSchema = z.object({ errorCode: z.string().optional() })
export function getApiErrorInfo(error: unknown) {
  const payload = isAxiosError(error) ? errorSchema.safeParse(error.response?.data) : null
  const code = error instanceof ApprovedBookingApiError ? error.errorCode : payload?.success ? payload.data.errorCode : undefined
  const status = error instanceof ApprovedBookingApiError ? error.status : isAxiosError(error) ? error.response?.status : undefined
  return { code, status }
}

export function getApprovedBookingError(error: unknown, context: "list" | "detail" = "detail") {
  const { code, status } = getApiErrorInfo(error)
  if (code === "INVALID_SORT_PARAMETER") return { message: "This sort option is not supported. Reset the filters and try again.", retryable: false }
  if (status === 404 && context === "list") return { message: "The approved bookings API is not available. Please contact your administrator.", retryable: false }
  if (code === "BOOKING_NOT_FOUND" || status === 404) return { message: "Approved booking not found or no longer available.", retryable: false }
  if (code === "INVALID_BOOKING_STATUS" || status === 409) return { message: "This booking is no longer approved and cannot be opened here.", retryable: false }
  if (status === 403) return { message: "You do not have permission to view approved bookings.", retryable: false }
  if (status === 401) return { message: "Your session has expired. Please sign in again.", retryable: false }
  if (error instanceof z.ZodError) return { message: "The server returned an unexpected approved booking response.", retryable: false }
  return { message: "Unable to load approved bookings. Please try again.", retryable: true }
}
