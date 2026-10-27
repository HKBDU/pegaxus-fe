import type { BookingAudience, BookingStatus } from "@/features/booking/types"

// Customers and logistics managers describe the same booking status differently.
const bookingStatusLabels: Record<BookingAudience, Record<BookingStatus, string>> = {
  customer: {
    PENDING: "Pending",
    APPROVED: "Approved",
    CANCELLED: "Cancelled",
    REJECTED: "Rejected",
    DRAFT: "Draft",
  },
  manager: {
    PENDING: "Needs review",
    APPROVED: "Approved",
    CANCELLED: "Cancelled by customer",
    REJECTED: "Rejected",
    DRAFT: "Draft",
  },
}

// Messages for the errorCode values the BE returns (see the API contract, section 4).
const bookingErrorMessages: Record<string, string> = {
  BOOKING_NOT_FOUND: "This booking no longer exists.",
  INVALID_BOOKING_STATUS: "This booking can no longer be changed in its current status. Reload and try again.",
  BOOKING_MODIFIED: "This booking changed elsewhere. Reload it before saving again.",
  BOOKING_BEING_EDITED: "The customer is editing this booking. Wait until the customer saves it, then review it again.",
  BOOKING_HAS_NO_HORSE: "This booking has no horse, so it cannot be approved.",
  REASON_REQUIRED: "Please enter a reason.",
  INVALID_COORDINATES: "The pickup or destination point is outside the valid map range. Pick the point again on the map.",
  ARRIVAL_DATE_INVALID: "The arrival date cannot be before the departure date.",
  DUPLICATE_HORSE_IN_BOOKING: "A horse can only be selected once per booking.",
  HORSE_ALREADY_IN_BOOKING: "This horse is already in the booking.",
  HORSE_NOT_FOUND: "One of the selected horses was not found.",
  HORSE_NOT_IN_BOOKING: "This horse is not in the booking.",
  FORBIDDEN: "You do not have permission to do this.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

/** The booking service rethrows API failures as Error(errorCode); mock mode throws the same codes. */
export function getBookingErrorMessage(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : ""
  return bookingErrorMessages[code] ?? getValidationMessage(error) ?? fallback
}

/** A 400 from the BE (field validation, supported countries, route rules) already says what is wrong, in English. */
function getValidationMessage(error: unknown): string | undefined {
  const response = (error instanceof Error ? error.cause : undefined) as
    | { response?: { status?: number; data?: { message?: unknown; errors?: unknown } } }
    | undefined
  if (response?.response?.status !== 400) return undefined
  const data = response.response.data
  const messages = Array.isArray(data?.errors)
    ? data.errors.map((item) => (item as { message?: unknown })?.message).filter((m): m is string => typeof m === "string" && m.length > 0)
    : []
  if (messages.length) return [...new Set(messages)].join(" ")
  return typeof data?.message === "string" && data.message ? data.message : undefined
}

export function formatSex(sex?: string | null) {
  return sex ? sex.charAt(0) + sex.slice(1).toLowerCase() : "—"
}

export function getBookingStatusLabel(status: BookingStatus, audience: BookingAudience = "customer") {
  return bookingStatusLabels[audience][status]
}

export function formatBookingDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    timeZone: "UTC",
  }).format(new Date(value))
}

export function formatBookingTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value))
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}
