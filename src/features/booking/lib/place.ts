import { EU_COUNTRIES, findEuCountryByName } from "@/features/booking/constants/eu-countries"
import type { GeoapifyPlace } from "@/shared/utils/map"

const UNITED_KINGDOM = "United Kingdom"
const ADDRESS_MAX_LENGTH = 500

export const COUNTRY_MESSAGE = "Only the 27 EU countries and the United Kingdom are supported"

/** A booking point the Customer picked on the map: what B1/B5 send and what the form keeps. */
export interface PickedPoint {
  address: string
  country: string
  latitude: number
  longitude: number
}

export function isBookingCountry(name: string): boolean {
  return name.trim().toLowerCase() === UNITED_KINGDOM.toLowerCase() || findEuCountryByName(name) !== undefined
}

/** The BE only accepts a plain country name, so the ISO code from Geoapify is mapped to the BE's own spelling. */
function countryNameFromCode(code: string | null | undefined): string | undefined {
  const upper = code?.trim().toUpperCase()
  if (!upper) return undefined
  if (upper === "GB") return UNITED_KINGDOM
  return EU_COUNTRIES.find((country) => country.isoCode === upper)?.name
}

/** The BE stores decimal(10,4); sending more digits is rounded there, so round here and keep the map pin consistent. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

export function toPickedPoint(place: GeoapifyPlace | null): { point: PickedPoint } | { error: string } {
  if (!place) return { error: "No address was found at this point. Try another spot." }
  const country = countryNameFromCode(place.countryCode)
  if (!country) return { error: COUNTRY_MESSAGE }
  const address = (place.address || place.name || "").trim().slice(0, ADDRESS_MAX_LENGTH)
  if (!address) return { error: "No address was found at this point. Try another spot." }
  return {
    point: {
      address,
      country,
      latitude: roundCoordinate(place.latitude),
      longitude: roundCoordinate(place.longitude),
    },
  }
}

export type BookingPointSide = "origin" | "destination"

export const POINT_SIDE_LABEL: Record<BookingPointSide, string> = { origin: "Pickup", destination: "Destination" }
