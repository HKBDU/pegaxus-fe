import { addUtcDays, addUtcMonths, todayUtc } from "@/shared/utils/datetime"

export type ScheduleValidation = { field: "plannedStartAt" | "plannedEndAt"; message: string } | null

function datePart(value: string) {
  return value.slice(0, 10)
}

function isUkCountry(value?: string | null) {
  const country = value?.trim().toUpperCase()
  return country === "GB" || country === "UK"
}

export function minimumPlannedStartDateUtc(originCountry?: string | null, destinationCountry?: string | null) {
  const minimumDays = isUkCountry(originCountry) && isUkCountry(destinationCountry)
    ? addUtcDays(todayUtc(), 21)
    : addUtcMonths(todayUtc(), 2)
  return minimumDays
}

export function validatePlannedStartDate({
  plannedStartAt,
  originCountry,
  destinationCountry,
}: {
  plannedStartAt: string
  originCountry?: string | null
  destinationCountry?: string | null
}): ScheduleValidation {
  if (!plannedStartAt) return null
  const minimumDate = minimumPlannedStartDateUtc(originCountry, destinationCountry)
  if (datePart(plannedStartAt) < minimumDate) {
    const leadTime = isUkCountry(originCountry) && isUkCountry(destinationCountry) ? "3 weeks" : "2 months"
    return {
      field: "plannedStartAt",
      message: `Planned start must be at least ${leadTime} from today (UTC).`,
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
}: {
  plannedStartAt: string
  plannedEndAt: string
  estimatedDurationMinutes?: number | null
  requestedArrivalDate?: string | null
  originCountry?: string | null
  destinationCountry?: string | null
}): ScheduleValidation {
  const plannedStartError = validatePlannedStartDate({ plannedStartAt, originCountry, destinationCountry })
  if (plannedStartError) return plannedStartError
  if (requestedArrivalDate && datePart(plannedEndAt) > requestedArrivalDate) {
    return { field: "plannedEndAt", message: "Planned end must not be later than the booking requested arrival date." }
  }
  if (estimatedDurationMinutes != null) {
    const elapsedMinutes = (Date.parse(plannedEndAt) - Date.parse(plannedStartAt)) / 60_000
    if (Number.isFinite(elapsedMinutes) && elapsedMinutes > estimatedDurationMinutes) {
      return { field: "plannedEndAt", message: "The planned schedule cannot exceed the estimated transport time." }
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
