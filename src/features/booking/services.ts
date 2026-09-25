import type { AxiosRequestConfig } from "axios"

import { useAuthStore } from "@/features/auth/store"
import apiClient from "@/lib/axios"
import { env } from "@/lib/env"
import { createBaseService } from "@/shared/services"
import type { EntityId } from "@/shared/types"
import { MOCK_AVAILABLE_HORSES, MOCK_BOOKINGS } from "@/features/booking/constants/booking.mock"
import type {
  AddBookingHorseRequest,
  ApiEnvelope,
  ApproveBookingResult,
  AvailableHorse,
  BookedHorse,
  Booking,
  BookingHistoryEntry,
  BookingListParams,
  BookingListResponse,
  BookingSummary,
  BookingTransport,
  CreateBookingRequest,
  CreateBookingResult,
  HorseListParams,
  HorseListResponse,
  UpdateBookingHorseRequest,
  UpdateBookingRequest,
  UpdateBookingResult,
} from "@/features/booking/types"

const BOOKING_ENDPOINT = "bookings"
const HORSE_ENDPOINT = "horses"
const useBookingMocks = import.meta.env.DEV && import.meta.env.VITE_BOOKING_API_MOCKS !== "false"
let mockBookings = structuredClone(MOCK_BOOKINGS)

function wait(delay = 180) {
  return new Promise((resolve) => window.setTimeout(resolve, delay))
}

function unwrapValue<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "value" in payload) {
    return (payload as ApiEnvelope<T>).value
  }
  return payload as T
}

/** Rethrows a BE error response as Error(errorCode) so the UI can react to codes like BOOKING_MODIFIED. */
async function callApi<T>(request: Promise<T>): Promise<T> {
  try {
    return await request
  } catch (error) {
    const data = (error as { response?: { data?: { errorCode?: string } } }).response?.data
    if (data?.errorCode) throw new Error(data.errorCode, { cause: error })
    throw error
  }
}

const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) => callApi(apiClient.get<unknown, T>(url, config)),
  post: <T = unknown>(url: string, data?: unknown) => callApi(apiClient.post<unknown, T>(url, data)),
  patch: <T = unknown>(url: string, data?: unknown) => callApi(apiClient.patch<unknown, T>(url, data)),
  delete: <T = unknown>(url: string) => callApi(apiClient.delete<unknown, T>(url)),
}

/** The BE reads "+00:00" as local time on a non-UTC server (=> false BOOKING_MODIFIED); "Z" is always read as UTC. */
function toUtcZ(timestamp: string) {
  return timestamp.replace(/\+00:00$/, "Z")
}

// The BE serialises enums as numbers in the approve response; the contract says strings.
const BOOKING_STATUS_BY_NUMBER: Record<number, string> = { 1: "DRAFT", 2: "PENDING", 3: "APPROVED", 4: "REJECTED", 5: "CANCELLED" }
const TRANSPORT_STATUS_BY_NUMBER: Record<number, string> = { 1: "CREATED", 2: "PLANNING", 3: "READY", 4: "IN_TRANSIT", 5: "COMPLETED", 6: "CANCELLED" }
const enumName = (value: unknown, names: Record<number, string>) => (typeof value === "number" ? (names[value] ?? String(value)) : value)

function toSummary(booking: Booking): BookingSummary {
  return {
    bookingId: booking.bookingId,
    bookingCode: booking.bookingCode,
    status: booking.status,
    statusName: booking.statusName,
    customerName: booking.customer.fullName,
    originCountry: booking.originCountry,
    destinationCountry: booking.destinationCountry,
    requestedDepartureDate: booking.requestedDepartureDate,
    totalHorses: booking.totalHorses,
    createdAt: booking.createdAt,
  }
}

function findMockBooking(bookingId: EntityId) {
  const booking = mockBookings.find((item) => String(item.bookingId) === String(bookingId))
  if (!booking) throw new Error("BOOKING_NOT_FOUND")
  return booking
}

function assertPending(booking: Booking) {
  if (booking.status !== "PENDING") throw new Error("INVALID_BOOKING_STATUS")
}

function toBookedHorse(input: AddBookingHorseRequest): BookedHorse {
  const horse = MOCK_AVAILABLE_HORSES.find((item) => item.horseId === input.horseId)
  if (!horse) throw new Error("HORSE_NOT_FOUND")
  return {
    ...horse,
    passportNumber: horse.passportNumber ?? "",
    specialHandlingNotes: input.specialHandlingNotes?.trim() || null,
  }
}

async function getMockBookings(params: BookingListParams): Promise<BookingListResponse> {
  await wait()
  const search = params.search.trim().toLowerCase()
  const filtered = mockBookings.filter((booking) => {
    const matchesSearch =
      !search ||
      booking.bookingCode.toLowerCase().includes(search) ||
      booking.customer.fullName.toLowerCase().includes(search) ||
      booking.originCountry.toLowerCase().includes(search) ||
      booking.destinationCountry.toLowerCase().includes(search)
    return matchesSearch && (params.status === "ALL" || booking.status === params.status)
  })

  filtered.sort((left, right) => {
    if (params.sortBy === "requestedDepartureDate:asc") {
      return Date.parse(left.requestedDepartureDate) - Date.parse(right.requestedDepartureDate)
    }
    const direction = params.sortBy === "createdAt:desc" ? -1 : 1
    return direction * (Date.parse(left.createdAt) - Date.parse(right.createdAt))
  })

  const totalItems = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalItems / params.pageSize))
  const currentPage = Math.min(params.pageIndex, totalPages)
  const start = (currentPage - 1) * params.pageSize

  return {
    data: filtered.slice(start, start + params.pageSize).map(toSummary),
    meta: {
      totalItems,
      totalPages,
      itemsPerPage: params.pageSize,
      currentPage,
      hasPreviousPage: currentPage > 1,
      hasNextPage: currentPage < totalPages,
    },
  }
}

const bookingBaseService = createBaseService<
  Booking,
  CreateBookingRequest,
  UpdateBookingRequest,
  BookingListParams,
  CreateBookingResult,
  UpdateBookingResult,
  BookingSummary,
  Booking
>({
  endpoint: BOOKING_ENDPOINT,
  getAll: async (params) => {
    const query = params ?? {
      pageIndex: 1,
      pageSize: 10,
      search: "",
      status: "ALL",
      sortBy: "createdAt:desc",
    }
    if (useBookingMocks) return getMockBookings(query)

    const payload = await api.get<unknown>(BOOKING_ENDPOINT, {
      params: {
        pageIndex: query.pageIndex,
        pageSize: query.pageSize,
        search: query.search || undefined,
        status: query.status === "ALL" ? undefined : query.status,
        sortBy: query.sortBy,
      },
    })
    const value = unwrapValue<{
      items: BookingSummary[]
      pageIndex: number
      pageSize: number
      totalItems: number
      totalPages: number
    }>(payload)
    return {
      data: value.items,
      meta: {
        totalItems: value.totalItems,
        totalPages: value.totalPages,
        itemsPerPage: value.pageSize,
        currentPage: value.pageIndex,
        hasPreviousPage: value.pageIndex > 1,
        hasNextPage: value.pageIndex < value.totalPages,
      },
    }
  },
  getById: async (id) => {
    const bookingId = id
    if (useBookingMocks) {
      await wait()
      return structuredClone(findMockBooking(bookingId))
    }
    const payload = await api.get<unknown>(`${BOOKING_ENDPOINT}/${bookingId}`)
    return unwrapValue<Booking>(payload)
  },
  create: async (data) => {
    if (useBookingMocks) {
      await wait()
      const now = new Date().toISOString()
      const bookingId = Math.max(...mockBookings.map((item) => Number(item.bookingId))) + 1
      const dateCode = now.slice(0, 10).replaceAll("-", "")
      const bookingCode = `BK-${dateCode}-${String(bookingId).slice(-4).padStart(4, "0")}`
      const horses = (data.horses ?? []).map(toBookedHorse)
      const booking: Booking = {
        bookingId,
        bookingCode,
        status: "PENDING",
        statusName: "Chờ duyệt",
        customer: { customerId: 301, fullName: "Nguyễn Minh Khang", phone: "0901234567" },
        originAddress: data.originAddress,
        originCountry: data.originCountry,
        destinationAddress: data.destinationAddress,
        destinationCountry: data.destinationCountry,
        requestedDepartureDate: data.requestedDepartureDate,
        requestedArrivalDate: data.requestedArrivalDate || null,
        totalHorses: horses.length,
        horses,
        specialRequirements: data.specialRequirements?.trim() || null,
        customerNote: data.customerNote?.trim() || null,
        assignedEmployee: null,
        submittedAt: now,
        approvedAt: null,
        rejectedAt: null,
        cancelledAt: null,
        rejectionReason: null,
        cancellationReason: null,
        transport: null,
        createdAt: now,
        updatedAt: now,
      }
      mockBookings = [booking, ...mockBookings]
      return { bookingId, bookingCode }
    }
    const payload = await api.post<unknown>(BOOKING_ENDPOINT, data)
    return unwrapValue<CreateBookingResult>(payload)
  },
  update: async (id, data) => {
    const bookingId = id
    if (useBookingMocks) {
      await wait()
      const booking = findMockBooking(bookingId)
      assertPending(booking)
      if (booking.updatedAt !== data.lastUpdatedAt) throw new Error("BOOKING_MODIFIED")
      const updatedAt = new Date().toISOString()
      const changes = Object.fromEntries(
        Object.entries(data).filter(([key, value]) => key !== "lastUpdatedAt" && value !== undefined),
      )
      Object.assign(booking, changes, { updatedAt })
      return { updatedAt }
    }
    const payload = await api.patch<unknown>(`${BOOKING_ENDPOINT}/${bookingId}`, {
      ...data,
      lastUpdatedAt: toUtcZ(data.lastUpdatedAt),
    })
    return unwrapValue<UpdateBookingResult>(payload)
  },
})

const horseBaseService = createBaseService<AvailableHorse, never, never, HorseListParams>({
  endpoint: HORSE_ENDPOINT,
  getAll: async (params) => {
    const query = params ?? { pageIndex: 1, pageSize: 20, search: "" }
    if (useBookingMocks) {
      await wait(80)
      const search = query.search.trim().toLowerCase()
      const filtered = MOCK_AVAILABLE_HORSES.filter((horse) =>
        !search || [horse.horseName, horse.microchipNumber, horse.passportNumber]
          .some((value) => value?.toLowerCase().includes(search)),
      )
      const totalItems = filtered.length
      const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize))
      const currentPage = Math.min(query.pageIndex, totalPages)
      const start = (currentPage - 1) * query.pageSize
      return {
        data: structuredClone(filtered.slice(start, start + query.pageSize)),
        meta: {
          totalItems,
          totalPages,
          itemsPerPage: query.pageSize,
          currentPage,
          hasPreviousPage: currentPage > 1,
          hasNextPage: currentPage < totalPages,
        },
      }
    }
    const payload = await api.get<unknown>(HORSE_ENDPOINT, { params: query })
    const value = unwrapValue<{
      items: AvailableHorse[]
      pageIndex: number
      pageSize: number
      totalItems: number
      totalPages: number
    }>(payload)
    return {
      data: value.items,
      meta: {
        totalItems: value.totalItems,
        totalPages: value.totalPages,
        itemsPerPage: value.pageSize,
        currentPage: value.pageIndex,
        hasPreviousPage: value.pageIndex > 1,
        hasNextPage: value.pageIndex < value.totalPages,
      },
    }
  },
})

export const bookingService = {
  getBookings: (params: BookingListParams) => bookingBaseService.getAll(params),
  getBooking: (bookingId: EntityId) => bookingBaseService.getById(bookingId),
  createBooking: (data: CreateBookingRequest) => bookingBaseService.create(data),
  updateBooking: (bookingId: EntityId, data: UpdateBookingRequest) => bookingBaseService.update(bookingId, data),

  getAvailableHorses: (params: HorseListParams): Promise<HorseListResponse> => horseBaseService.getAll(params),

  async getHistories(bookingId: EntityId): Promise<BookingHistoryEntry[]> {
    if (useBookingMocks) {
      await wait()
      const booking = findMockBooking(bookingId)
      const by = { accountId: "mock", fullName: booking.customer.fullName, role: "CUSTOMER" }
      const manager = { accountId: "mock-manager", fullName: booking.assignedEmployee?.fullName ?? "Logistics Manager", role: "LOGISTICS_MANAGER" }
      const entries: BookingHistoryEntry[] = [
        { historyId: "1", action: "CREATED", previousStatus: null, newStatus: "PENDING", reason: null, changedBy: by, changedAt: booking.submittedAt },
      ]
      if (booking.approvedAt) entries.push({ historyId: "2", action: "APPROVED", previousStatus: "PENDING", newStatus: "APPROVED", reason: null, changedBy: manager, changedAt: booking.approvedAt })
      if (booking.rejectedAt) entries.push({ historyId: "2", action: "REJECTED", previousStatus: "PENDING", newStatus: "REJECTED", reason: booking.rejectionReason, changedBy: manager, changedAt: booking.rejectedAt })
      if (booking.cancelledAt) entries.push({ historyId: "2", action: "CANCELLED", previousStatus: "PENDING", newStatus: "CANCELLED", reason: booking.cancellationReason, changedBy: by, changedAt: booking.cancelledAt })
      return entries
    }
    const payload = await api.get<unknown>(`${BOOKING_ENDPOINT}/${bookingId}/histories`)
    return unwrapValue<BookingHistoryEntry[]>(payload)
  },

  async addHorse(bookingId: EntityId, data: AddBookingHorseRequest): Promise<void> {
    if (useBookingMocks) {
      await wait()
      const booking = findMockBooking(bookingId)
      assertPending(booking)
      if (booking.horses.some((horse) => horse.horseId === data.horseId)) throw new Error("HORSE_ALREADY_IN_BOOKING")
      booking.horses.push(toBookedHorse(data))
      booking.totalHorses = booking.horses.length
      booking.updatedAt = new Date().toISOString()
      return
    }
    await api.post(`${BOOKING_ENDPOINT}/${bookingId}/horses`, data)
  },

  async updateHorse(bookingId: EntityId, horseId: EntityId, data: UpdateBookingHorseRequest): Promise<void> {
    if (useBookingMocks) {
      await wait()
      const booking = findMockBooking(bookingId)
      assertPending(booking)
      const horse = booking.horses.find((item) => item.horseId === horseId)
      if (!horse) throw new Error("HORSE_NOT_IN_BOOKING")
      horse.specialHandlingNotes = data.specialHandlingNotes.trim() || null
      booking.updatedAt = new Date().toISOString()
      return
    }
    await api.patch(`${BOOKING_ENDPOINT}/${bookingId}/horses/${horseId}`, data)
  },

  async removeHorse(bookingId: EntityId, horseId: EntityId): Promise<void> {
    if (useBookingMocks) {
      await wait()
      const booking = findMockBooking(bookingId)
      assertPending(booking)
      const index = booking.horses.findIndex((item) => item.horseId === horseId)
      if (index < 0) throw new Error("HORSE_NOT_IN_BOOKING")
      booking.horses.splice(index, 1)
      booking.totalHorses = booking.horses.length
      booking.updatedAt = new Date().toISOString()
      return
    }
    await api.delete(`${BOOKING_ENDPOINT}/${bookingId}/horses/${horseId}`)
  },

  async cancelBooking(bookingId: EntityId, reason: string): Promise<void> {
    if (useBookingMocks) {
      await wait()
      const booking = findMockBooking(bookingId)
      assertPending(booking)
      booking.status = "CANCELLED"
      booking.statusName = "Đã hủy"
      booking.cancellationReason = reason
      booking.cancelledAt = new Date().toISOString()
      booking.updatedAt = booking.cancelledAt
      return
    }
    await api.post(`${BOOKING_ENDPOINT}/${bookingId}/cancel`, { reason })
  },

  async approveBooking(bookingId: EntityId): Promise<ApproveBookingResult> {
    if (useBookingMocks) {
      await wait()
      const booking = findMockBooking(bookingId)
      assertPending(booking)
      if (!booking.horses.length) throw new Error("BOOKING_HAS_NO_HORSE")
      const transport = { transportId: 90, transportCode: "TP-20260924-0001", status: "CREATED" }
      booking.status = "APPROVED"
      booking.statusName = "Đã duyệt"
      booking.assignedEmployee = { employeeId: 41, fullName: "Trần Anh Tuấn" }
      booking.approvedAt = new Date().toISOString()
      booking.updatedAt = booking.approvedAt
      booking.transport = transport
      return { status: "APPROVED", transport }
    }
    const payload = await api.post<unknown>(`${BOOKING_ENDPOINT}/${bookingId}/approve`)
    const result = unwrapValue<{ status: unknown; transport: BookingTransport & { status: unknown } }>(payload)
    return {
      status: enumName(result.status, BOOKING_STATUS_BY_NUMBER) as ApproveBookingResult["status"],
      transport: { ...result.transport, status: String(enumName(result.transport.status, TRANSPORT_STATUS_BY_NUMBER)) },
    }
  },

  /**
   * The BE only lets a customer edit a booking that is DRAFT (PENDING -> DRAFT -> edit -> PENDING),
   * whereas the contract edits it while PENDING. Mock mode has no such rule, so this is a no-op there.
   */
  async changeStatus(bookingId: EntityId, status: "DRAFT" | "PENDING"): Promise<void> {
    if (useBookingMocks) return
    await api.patch(`${BOOKING_ENDPOINT}/${bookingId}/status`, { status })
  },

  /** Best effort while the tab is closing: a keepalive fetch can outlive the page (axios cannot). */
  releaseOnPageHide(bookingId: EntityId): void {
    if (useBookingMocks) return
    const token = useAuthStore.getState().accessToken
    void fetch(`${env.API_URL}${BOOKING_ENDPOINT}/${bookingId}/status`, {
      method: "PATCH",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ status: "PENDING" }),
    }).catch(() => undefined)
  },

  async rejectBooking(bookingId: EntityId, reason: string): Promise<void> {
    if (useBookingMocks) {
      await wait()
      const booking = findMockBooking(bookingId)
      assertPending(booking)
      booking.status = "REJECTED"
      booking.statusName = "Từ chối"
      booking.assignedEmployee = { employeeId: 41, fullName: "Trần Anh Tuấn" }
      booking.rejectionReason = reason
      booking.rejectedAt = new Date().toISOString()
      booking.updatedAt = booking.rejectedAt
      return
    }
    await api.post(`${BOOKING_ENDPOINT}/${bookingId}/reject`, { reason })
  },
}
