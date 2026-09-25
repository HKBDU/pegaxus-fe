import type { EntityId } from "@/shared/types"

// DRAFT exists only in the real BE: the customer edit flow is PENDING -> DRAFT -> (edit) -> PENDING.
export const BOOKING_STATUSES = ["PENDING", "APPROVED", "CANCELLED", "REJECTED", "DRAFT"] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]
export type BookingAudience = "customer" | "manager"
export type BookingSort = "createdAt:desc" | "createdAt:asc" | "requestedDepartureDate:asc"
export type HorseSex = "MALE" | "FEMALE" | "GELDING"

export interface ApiEnvelope<T> {
  isSuccess: boolean
  code: number
  message: string
  value: T
}

export interface BookingCustomer {
  customerId: EntityId
  fullName: string
  phone: string
  organization?: string | null
  email?: string | null
}

export interface BookedHorse {
  horseId: EntityId
  horseName: string
  sex: HorseSex
  breed: string
  microchipNumber: string
  passportNumber: string
  dateOfBirth?: string
  weightKg?: number
  specialHandlingNotes: string | null
}

// Exactly what GET /horses returns; nothing else is mapped.
export interface AvailableHorse {
  horseId: EntityId
  horseName: string
  sex: HorseSex | null
  breed: string | null
  microchipNumber: string | null
}

export interface HorseListParams {
  pageIndex: number
  pageSize: number
  search: string
}

export interface HorseListResponse {
  data: AvailableHorse[]
  meta: BookingListResponse["meta"]
}

export interface AssignedEmployee {
  employeeId: EntityId
  fullName: string
}

export interface BookingTransport {
  transportId: EntityId
  transportCode: string
  status: string
}

export interface BookingSummary {
  bookingId: EntityId
  bookingCode: string
  status: BookingStatus
  statusName: string
  customerName: string
  originCountry: string
  destinationCountry: string
  requestedDepartureDate: string
  totalHorses: number
  createdAt: string
}

export interface Booking extends Omit<BookingSummary, "customerName"> {
  customer: BookingCustomer
  originAddress: string
  destinationAddress: string
  requestedDepartureTime?: string | null
  requestedArrivalDate: string | null
  horses: BookedHorse[]
  specialRequirements: string | null
  customerNote: string | null
  assignedEmployee: AssignedEmployee | null
  submittedAt: string
  approvedAt: string | null
  rejectedAt: string | null
  cancelledAt: string | null
  rejectionReason: string | null
  cancellationReason: string | null
  transport: BookingTransport | null
  updatedAt: string
}

export interface BookingFilters {
  search: string
  status: BookingStatus | "ALL"
  sortBy: BookingSort
}

export interface BookingListParams extends BookingFilters {
  pageIndex: number
  pageSize: number
}

export interface BookingListResponse {
  data: BookingSummary[]
  meta: {
    totalItems: number
    totalPages: number
    itemsPerPage: number
    currentPage: number
    hasPreviousPage: boolean
    hasNextPage: boolean
  }
}

export interface BookingHorseInput {
  horseId: EntityId
  specialHandlingNotes?: string
}

export interface CreateBookingRequest {
  originAddress: string
  originCountry: string
  destinationAddress: string
  destinationCountry: string
  requestedDepartureDate: string
  requestedArrivalDate?: string
  horses?: BookingHorseInput[]
  specialRequirements?: string
  customerNote?: string
}

export interface CreateBookingResult {
  bookingId: EntityId
  bookingCode: string
}

export interface UpdateBookingRequest {
  lastUpdatedAt: string
  originAddress?: string
  originCountry?: string
  destinationAddress?: string
  destinationCountry?: string
  requestedDepartureDate?: string
  requestedArrivalDate?: string
  specialRequirements?: string
  customerNote?: string
}

export interface UpdateBookingResult {
  updatedAt: string
}

export interface AddBookingHorseRequest {
  horseId: EntityId
  specialHandlingNotes?: string
}

export interface UpdateBookingHorseRequest {
  specialHandlingNotes: string
}

export interface ApproveBookingResult {
  status: "APPROVED"
  transport: BookingTransport
}

export interface BookingFormValues {
  originAddress: string
  originCountry: string
  destinationAddress: string
  destinationCountry: string
  requestedDepartureDate: string
  requestedArrivalDate: string
  specialRequirements: string
  customerNote: string
  horses: BookingHorseInput[]
}

export interface BookingHistoryEntry {
  historyId: EntityId
  action: "CREATED" | "UPDATED" | "APPROVED" | "REJECTED" | "CANCELLED"
  previousStatus: BookingStatus | null
  newStatus: BookingStatus
  reason: string | null
  changedBy: { accountId: EntityId; fullName: string; role: string }
  changedAt: string
}
