import { useQuery } from "@tanstack/react-query"
import type { EntityId } from "@/shared/types"
import { approvedBookingService, buildApprovedBookingQuery, getApprovedBookingError } from "../services"
import { entityIdSchema } from "../schemas"
import type { ApprovedBookingsQueryParams } from "../types"

export const approvedBookingKeys = {
  all: ["approved-bookings"] as const,
  list: (params: ApprovedBookingsQueryParams) => ["approved-bookings", "list", buildApprovedBookingQuery(params)] as const,
  detail: (id: EntityId) => ["approved-bookings", "detail", String(id)] as const,
}

const retry = (failureCount: number, error: Error) => failureCount < 1 && getApprovedBookingError(error).retryable

export function useApprovedBookings(params: ApprovedBookingsQueryParams) {
  return useQuery({
    queryKey: approvedBookingKeys.list(params),
    queryFn: ({ signal }) => approvedBookingService.getApprovedBookings(params, signal),
    retry,
  })
}

export function useApprovedBooking(bookingId: EntityId) {
  return useQuery({
    queryKey: approvedBookingKeys.detail(bookingId),
    queryFn: ({ signal }) => approvedBookingService.getApprovedBooking(bookingId, signal),
    enabled: entityIdSchema.safeParse(bookingId).success,
    retry,
  })
}
