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
