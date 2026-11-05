import { addUtcDays, addUtcMonths, todayUtc } from "@/shared/utils/datetime"

export type ScheduleValidation = { field: "plannedStartAt" | "plannedEndAt"; message: string } | null

function datePart(value: string) {
  return value.slice(0, 10)
}

function isUkCountry(value?: string | null) {
  const country = value?.trim().toUpperCase()
  return country === "GB" || country === "UK"
}

export function minimumPlannedStartDateUtc(
  originCountry?: string | null,
  destinationCountry?: string | null,
  bookingCreatedAt?: string | null,
) {
  const baseDate = bookingCreatedAt?.slice(0, 10) || todayUtc()
  const leadDate = isUkCountry(originCountry) && isUkCountry(destinationCountry)
    ? addUtcDays(baseDate, 21)
    : addUtcMonths(baseDate, 2)
  return leadDate > todayUtc() ? leadDate : todayUtc()
}

export function validatePlannedStartDate({
  plannedStartAt,
  originCountry,
  destinationCountry,
  bookingCreatedAt,
}: {
  plannedStartAt: string
  originCountry?: string | null
  destinationCountry?: string | null
  bookingCreatedAt?: string | null
}): ScheduleValidation {
  if (!plannedStartAt) return null
  const minimumDate = minimumPlannedStartDateUtc(originCountry, destinationCountry, bookingCreatedAt)
  if (datePart(plannedStartAt) < minimumDate) {
    const leadTime = isUkCountry(originCountry) && isUkCountry(destinationCountry) ? "3 weeks" : "2 months"
    return {
      field: "plannedStartAt",
      message: `Planned start must be at least ${leadTime} from the booking creation date (UTC).`,
    }
  }
  return null
}

export function validateTransportPlanSchedule({
  plannedStartAt,
  plannedEndAt,
  estimatedDurationMinutes,
  requestedArrivalDate,
  originCountry,
  destinationCountry,
  bookingCreatedAt,
}: {
  plannedStartAt: string
  plannedEndAt: string
  estimatedDurationMinutes?: number | null
  requestedArrivalDate?: string | null
  originCountry?: string | null
  destinationCountry?: string | null
  bookingCreatedAt?: string | null
}): ScheduleValidation {
  const plannedStartError = validatePlannedStartDate({ plannedStartAt, originCountry, destinationCountry, bookingCreatedAt })
  if (plannedStartError) return plannedStartError
  if (requestedArrivalDate && datePart(plannedEndAt) > requestedArrivalDate) {
    return { field: "plannedEndAt", message: "Planned end must not be later than the booking requested arrival date." }
  }
  if (estimatedDurationMinutes != null) {
    const elapsedMinutes = (Date.parse(plannedEndAt) - Date.parse(plannedStartAt)) / 60_000
    if (Number.isFinite(elapsedMinutes) && elapsedMinutes < estimatedDurationMinutes) {
      return { field: "plannedEndAt", message: "The planned schedule must cover at least the estimated transport time." }
    }
  }
  return null
}

export function validateArrivalDate(arrivalAt: string | undefined, requestedArrivalDate?: string | null) {
  if (!arrivalAt || !requestedArrivalDate) return null
  return datePart(arrivalAt) > requestedArrivalDate
    ? "Segment planned arrival must not be later than the booking requested arrival date."
    : null
}
