import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useState } from "react"

import { acquireEditLock, forgetEditLock, scheduleEditRelease } from "@/features/booking/editLock"
import { bookingService } from "@/features/booking/services"
import type { EntityId } from "@/shared/types"
import type {
  Booking,
  BookingFormValues,
  BookingListParams,
  CreateBookingRequest,
  HorseListParams,
} from "@/features/booking/types"

export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (params: BookingListParams) => [...bookingKeys.lists(), params] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  // String(id): the route gives "1024" while mock data uses 1024; both must hit the same cache entry.
  detail: (id: EntityId) => [...bookingKeys.details(), String(id)] as const,
  availableHorses: (params: HorseListParams) => [...bookingKeys.all, "available-horses", params] as const,
}

export function useBookings(params: BookingListParams) {
  return useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: () => bookingService.getBookings(params),
    placeholderData: (previousData) => previousData,
  })
}

export function useBooking(id: EntityId) {
  return useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn: () => bookingService.getBooking(id),
    enabled: typeof id === "string" ? id.length > 0 : Number.isFinite(id) && id > 0,
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
        destinationAddress: values.destinationAddress,
        destinationCountry: values.destinationCountry,
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
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.bookingId) })
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
    },
  })
}

export function useApproveBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bookingId: EntityId) => bookingService.approveBooking(bookingId),
    onSuccess: (_, bookingId) => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(bookingId) })
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
    },
  })
}

export function useRejectBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: EntityId; reason: string }) =>
      bookingService.rejectBooking(bookingId, reason),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.bookingId) })
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
    },
  })
}
