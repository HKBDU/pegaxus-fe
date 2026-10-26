import { addDays, addMonths, format, parseISO } from "date-fns"

import { isBookingCountry } from "@/features/booking/lib/place"

const DATE_FORMAT = "yyyy-MM-dd"
const UNITED_KINGDOM = "United Kingdom"

export const DOMESTIC_MIN_DAYS = 21
export const INTERNATIONAL_MIN_MONTHS = 3

/**
 * How early a booking must be made. The BE enforces the same rule; the form repeats it so the Customer sees why the
 * nearest dates are greyed out.
 * - domestic: United Kingdom to United Kingdom, at least 21 days ahead
 * - international: between the EU countries, or the United Kingdom and an EU country, at least 3 months ahead
 * - unsupported: the same country other than the United Kingdom (for example Germany to Germany)
 * - pending: the route is not picked yet, so only the shortest lead time applies
 */
export type DepartureRuleKind = "pending" | "domestic" | "international" | "unsupported"

export interface DepartureRule {
  kind: DepartureRuleKind
  /** Earliest allowed departure date (`yyyy-MM-dd`, counted from the UTC day, like the BE). */
  minDate: string
}

function utcToday(now: Date) {
  return parseISO(now.toISOString().slice(0, 10))
}

export function getDomesticEarliestDate(now = new Date()) {
  return format(addDays(utcToday(now), DOMESTIC_MIN_DAYS), DATE_FORMAT)
}

export function getInternationalEarliestDate(now = new Date()) {
  return format(addMonths(utcToday(now), INTERNATIONAL_MIN_MONTHS), DATE_FORMAT)
}

export function getDepartureRule(originCountry: string | undefined, destinationCountry: string | undefined, now = new Date()): DepartureRule {
  const origin = originCountry?.trim() ?? ""
  const destination = destinationCountry?.trim() ?? ""
  const shortest = getDomesticEarliestDate(now)
  if (!origin || !destination || !isBookingCountry(origin) || !isBookingCountry(destination)) return { kind: "pending", minDate: shortest }

  if (origin.toLowerCase() === destination.toLowerCase()) {
    return origin.toLowerCase() === UNITED_KINGDOM.toLowerCase()
      ? { kind: "domestic", minDate: shortest }
      : { kind: "unsupported", minDate: shortest }
  }
  return { kind: "international", minDate: getInternationalEarliestDate(now) }
}

export const SAME_COUNTRY_MESSAGE = "Same-country bookings are only accepted in the United Kingdom"

export const DEPARTURE_TOO_SOON_MESSAGE: Record<DepartureRuleKind, string> = {
  pending: "Departure date must be at least 21 days from today",
  unsupported: "Departure date must be at least 21 days from today",
  domestic: "Domestic bookings (United Kingdom) need a departure date at least 21 days from today",
  international: "International bookings need a departure date at least 3 months from today",
}
