import { addDays, addMonths, format, parseISO } from "date-fns"

export type ScheduleValidation = { field: "plannedStartAt" | "plannedEndAt"; message: string } | null

function datePart(value: string) {
  return value.slice(0, 10)
}

export function validateTransportPlanSchedule({
  plannedStartAt,
  plannedEndAt,
  estimatedDurationMinutes,
  requestedArrivalDate,
}: {
  plannedStartAt: string
  plannedEndAt: string
  estimatedDurationMinutes?: number | null
  requestedArrivalDate?: string | null
}): ScheduleValidation {
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

/** The BE rejects a planned start earlier than now (`PLANNED_START_IN_PAST`); `startIso` is the UTC value that would be sent. */
export function validatePlannedStartNotPast(startIso: string | undefined, now = Date.now()): ScheduleValidation {
  if (!startIso) return null
  const start = Date.parse(startIso)
  return Number.isFinite(start) && start < now
    ? { field: "plannedStartAt", message: "Planned start cannot be in the past." }
    : null
}

export function validateArrivalDate(arrivalAt: string | undefined, requestedArrivalDate?: string | null) {
  if (!arrivalAt || !requestedArrivalDate) return null
  return datePart(arrivalAt) > requestedArrivalDate
    ? "Segment planned arrival must not be later than the booking requested arrival date."
    : null
}

/**
 * Earliest planned start date (`yyyy-MM-dd`, UTC day) the BE accepts: the day the booking was made plus 21 days (same
 * country in and out, which the BE only accepts for the United Kingdom) or 2 months (across a border). Returns
 * undefined while the booking creation date is unknown.
 */
export function plannedStartEarliestDate(booking: {
  createdAt?: string | null
  originCountry?: string | null
  destinationCountry?: string | null
}) {
  if (!booking.createdAt) return undefined
  const madeOn = parseISO(new Date(booking.createdAt).toISOString().slice(0, 10))
  const domestic = (booking.originCountry ?? "").trim().toLowerCase() === (booking.destinationCountry ?? "").trim().toLowerCase()
  return format(domestic ? addDays(madeOn, 21) : addMonths(madeOn, 2), "yyyy-MM-dd")
}

/** The BE rejects a planned start whose UTC day is before the earliest date (`PLANNED_START_TOO_EARLY`). */
export function validatePlannedStartLeadTime(startIso: string | undefined, earliest: string | undefined): ScheduleValidation {
  if (!startIso || !earliest) return null
  return startIso.slice(0, 10) < earliest
    ? { field: "plannedStartAt", message: `Planned start must be on or after ${earliest} (booking date plus the required lead time).` }
    : null
}
