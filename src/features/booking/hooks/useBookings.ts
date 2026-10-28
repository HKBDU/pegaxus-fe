import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"

import { acquireEditLock, forgetEditLock, scheduleEditRelease } from "@/features/booking/editLock"
import { bookingService } from "@/features/booking/services"
import { bookingIdSchema } from "@/features/booking/schemas"
import { approvedBookingKeys } from "@/features/transport-plan/hooks/useApprovedBookings"
import type { EntityId } from "@/shared/types"
import type {
  Booking,
  BookingFormValues,
  BookingListParams,
  CreateBookingRequest,
  HorseListParams,
} from "@/features/booking/types"

/** B5 takes a point's latitude and longitude together or not at all, so a half-filled pair is never sent. */
function pairOf<Side extends "origin" | "destination">(side: Side, latitude: number | undefined, longitude: number | undefined) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return {}
  return { [`${side}Latitude`]: latitude, [`${side}Longitude`]: longitude } as Record<`${Side}Latitude` | `${Side}Longitude`, number>
}

export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (params: BookingListParams) => [...bookingKeys.lists(), params] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  // String(id): the route gives "1024" while mock data uses 1024; both must hit the same cache entry.
  detail: (id: EntityId) => [...bookingKeys.details(), String(id)] as const,
  availableHorses: (params: HorseListParams) => [...bookingKeys.all, "available-horses", params] as const,
}

/** Re-reads the booking and the lists after a decision and waits for it, so the status on screen is already the new one. */
function refreshBooking(queryClient: QueryClient, bookingId: EntityId) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) }),
    queryClient.invalidateQueries({ queryKey: bookingKeys.lists() }),
  ])
}

export function useBookings(params: BookingListParams) {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => bookingService.getBookings(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useBooking(id: EntityId) {
  const parsedBookingId = bookingIdSchema.safeParse(id)

  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingService.getBooking(id),
    enabled: parsedBookingId.success,
  })
}

export function useBookingHistories(id: EntityId, enabled: boolean) {
  return useQuery({
    queryKey: [...bookingKeys.detail(id), "histories"] as const,
    queryFn: () => bookingService.getHistories(id),
    enabled,
  })
}

export function useAvailableHorses(params: HorseListParams) {
  return useQuery({
    queryKey: bookingKeys.availableHorses(params),
    queryFn: () => bookingService.getAvailableHorses(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingService.createBooking(data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() }),
  })
}

export function useUpdateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    // `booking` is the snapshot taken when the edit page locked it (DRAFT), see useBookingEditLock.
    mutationFn: async ({ booking, values }: { booking: Booking; values: BookingFormValues }) => {
      const { bookingId } = booking

      // Keep the anti-overwrite check: refuse if the booking changed since the form was opened.
      if ((await bookingService.getBooking(bookingId)).updatedAt !== booking.updatedAt) throw new Error("BOOKING_MODIFIED")

      await bookingService.updateBooking(bookingId, {
        lastUpdatedAt: booking.updatedAt,
        originAddress: values.originAddress,
        originCountry: values.originCountry,
        ...pairOf("origin", values.originLatitude, values.originLongitude),
        destinationAddress: values.destinationAddress,
        destinationCountry: values.destinationCountry,
        ...pairOf("destination", values.destinationLatitude, values.destinationLongitude),
        requestedDepartureDate: values.requestedDepartureDate,
        requestedArrivalDate: values.requestedArrivalDate || undefined,
        specialRequirements: values.specialRequirements || undefined,
        customerNote: values.customerNote || undefined,
      })

      const previousById = new Map(booking.horses.map((horse) => [horse.horseId, horse]))
      const nextById = new Map(values.horses.map((horse) => [horse.horseId, horse]))

      for (const horse of booking.horses.filter((item) => !nextById.has(item.horseId))) {
        await bookingService.removeHorse(bookingId, horse.horseId)
      }

      for (const horse of values.horses.filter((item) => !previousById.has(item.horseId))) {
        await bookingService.addHorse(bookingId, horse)
      }

      for (const horse of values.horses) {
        const previous = previousById.get(horse.horseId)
        if (previous && (previous.specialHandlingNotes ?? "") !== (horse.specialHandlingNotes ?? "")) {
          await bookingService.updateHorse(bookingId, horse.horseId, {
            specialHandlingNotes: horse.specialHandlingNotes ?? "",
          })
        }
      }

      // Save = submit again: DRAFT -> PENDING, so the manager can review it. If a step above failed the booking
      // stays DRAFT and the customer keeps editing (Cancel or leaving the page then returns it to PENDING).
      await bookingService.changeStatus(bookingId, "PENDING")
      forgetEditLock(bookingId)
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.booking.bookingId) })
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
    },
  })
}

/** Opens the edit session: PENDING -> DRAFT right away. Leaving the page without saving puts it back to PENDING. */
export function useBookingEditLock(bookingId: EntityId | undefined) {
  const [state, setState] = useState<{ booking?: Booking; error?: unknown }>({})

  useEffect(() => {
    if (!bookingId) return
    let active = true
    acquireEditLock(bookingId).then(
      (booking) => { if (active) setState({ booking }) },
      (error: unknown) => { if (active) setState({ error }) },
    )
    return () => {
      active = false
      scheduleEditRelease(bookingId)
    }
  }, [bookingId])

  /** Re-reads the server copy (the baseline for the next Save) without touching what the customer typed. */
  const refresh = useCallback(async () => {
    if (bookingId) setState({ booking: await bookingService.getBooking(bookingId) })
  }, [bookingId])

  return { booking: state.booking, error: state.error, isLocking: Boolean(bookingId) && !state.booking && !state.error, refresh }
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: EntityId; reason: string }) =>
      bookingService.cancelBooking(bookingId, reason),
    onSuccess: (_, variables) => refreshBooking(queryClient, variables.bookingId),
  })
}

/** Everything the BE closes together with the booking (transport, plans, dossier, handovers, invoices): refetch it all. */
const CLOSED_WITH_BOOKING_KEYS = [
  approvedBookingKeys.all,
  ["transport-plans"],
  ["route-view"],
  ["ongoing-transports"],
  ["dossier"],
  ["handover"],
  ["invoice"],
] as const

/** Logistics Manager cancels an APPROVED booking (PATCH negotiated-status). */
export function useManagerCancelBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: EntityId; reason: string }) =>
      bookingService.managerCancelBooking(bookingId, reason),
    onSuccess: async (_, variables) => {
      void Promise.all(CLOSED_WITH_BOOKING_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
      await refreshBooking(queryClient, variables.bookingId)
    },
    // The booking moved on behind our back (departed or already cancelled): show its real state next to the error.
    onError: (error, variables) => {
      if (["TRANSPORT_ALREADY_DEPARTED", "INVALID_BOOKING_STATUS"].includes(error.message)) void refreshBooking(queryClient, variables.bookingId)
    },
  })
}

export function useApproveBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: EntityId) => bookingService.approveBooking(bookingId),
    onSuccess: async (_, bookingId) => {
      void queryClient.invalidateQueries({ queryKey: approvedBookingKeys.detail(bookingId) })
      await refreshBooking(queryClient, bookingId)
    },
  })
}

export function useRejectBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: EntityId; reason: string }) =>
      bookingService.rejectBooking(bookingId, reason),
    onSuccess: (_, variables) => refreshBooking(queryClient, variables.bookingId),
  })
}
