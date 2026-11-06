import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useState } from "react"

import { acquireEditLock, assertBookingEditSession, beginBookingSave, captureBookingEditSession, finishBookingSaveAttempt, forgetEditLock, markBookingSaveWrite, refreshBookingEditLock, scheduleEditRelease, type BookingEditSession } from "@/features/booking/editLock"
import { useAuthStore } from "@/features/auth/store"
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
    mutationFn: async ({ booking, values, session }: { booking: Booking; values: BookingFormValues; session: BookingEditSession }) => {
      const { bookingId } = booking
      beginBookingSave(bookingId, session)
      const config = { signal: session.controller.signal }
      const run = async <T,>(request: () => Promise<T>) => {
        assertBookingEditSession(session)
        const result = await request()
        assertBookingEditSession(session)
        return result
      }
      const write = <T,>(request: () => Promise<T>) => {
        markBookingSaveWrite(bookingId, session)
        return run(request)
      }
      try {
        // A retry diffs against the actual server horses, including requests whose response was lost.
        let current = await run(() => bookingService.getBooking(bookingId, config))
        if (current.updatedAt !== booking.updatedAt) throw new Error("BOOKING_MODIFIED")
        if (current.status === "PENDING") {
          await write(() => bookingService.changeStatus(bookingId, "DRAFT", config))
          current = await run(() => bookingService.getBooking(bookingId, config))
        }
        if (current.status !== "DRAFT" && current.status !== "PENDING") throw new Error("INVALID_BOOKING_STATUS")

        await write(() => bookingService.updateBooking(bookingId, {
          lastUpdatedAt: current.updatedAt,
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
        }, config))

        const previousById = new Map(current.horses.map((horse) => [horse.horseId, horse]))
        const nextById = new Map(values.horses.map((horse) => [horse.horseId, horse]))

        for (const horse of current.horses.filter((item) => !nextById.has(item.horseId))) {
          await write(() => bookingService.removeHorse(bookingId, horse.horseId, config))
        }

        for (const horse of values.horses.filter((item) => !previousById.has(item.horseId))) {
          await write(() => bookingService.addHorse(bookingId, horse, config))
        }

        for (const horse of values.horses) {
          const previous = previousById.get(horse.horseId)
          if (previous && (previous.specialHandlingNotes ?? "") !== (horse.specialHandlingNotes ?? "")) {
            await write(() => bookingService.updateHorse(bookingId, horse.horseId, {
              specialHandlingNotes: horse.specialHandlingNotes ?? "",
            }, config))
          }
        }

        await write(() => bookingService.changeStatus(bookingId, "PENDING", config))
        const submitted = await run(() => bookingService.getBooking(bookingId, config))
        if (submitted.status !== "PENDING") throw new Error("Unable to confirm the booking submission. Check its current status before retrying.")
        forgetEditLock(bookingId, session)
      } finally {
        finishBookingSaveAttempt(bookingId, session)
      }
    },
    onSuccess: (_, variables) => {
      assertBookingEditSession(variables.session)
      void queryClient.invalidateQueries({ queryKey: bookingKeys.detail(variables.booking.bookingId) })
      void queryClient.invalidateQueries({ queryKey: bookingKeys.lists() })
    },
  })
}

/** Opens PENDING -> DRAFT; automatic release is allowed only before a save write. */
export function useBookingEditLock(bookingId: EntityId | undefined) {
  const sessionVersion = useAuthStore((state) => state.sessionVersion)
  const accountId = useAuthStore((state) => state.principal?.id)
  const session = useMemo(() => captureBookingEditSession(accountId, sessionVersion), [sessionVersion, accountId])
  const [state, setState] = useState<{ bookingId?: EntityId; session?: BookingEditSession; booking?: Booking; error?: unknown }>({})

  useEffect(() => {
    if (!bookingId) return
    let active = true
    void Promise.resolve().then(() => acquireEditLock(bookingId, session)).then(
      (booking) => { if (active) setState({ bookingId, session, booking }) },
      (error: unknown) => { if (active) setState({ bookingId, session, error }) },
    )
    return () => {
      active = false
      scheduleEditRelease(bookingId, session)
    }
  }, [bookingId, session])

  /** Re-reads the server copy (the baseline for the next Save) without touching what the customer typed. */
  const refresh = useCallback(async () => {
    if (!bookingId) return
    assertBookingEditSession(session)
    const booking = await refreshBookingEditLock(bookingId, session)
    assertBookingEditSession(session)
    setState((current) => current.bookingId === bookingId && current.session === session ? { bookingId, session, booking } : current)
  }, [bookingId, session])

  const current = state.bookingId === bookingId && state.session === session ? state : {}
  return { booking: current.booking, error: current.error, session, isLocking: Boolean(bookingId) && !current.booking && !current.error, refresh }
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
