const dateTime = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })
const dateOnly = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
const timeOnly = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })

export const EMPTY = "—"

export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : EMPTY)
export const formatDate = (iso: string) => dateOnly.format(new Date(iso))
export const formatTime = (iso: string) => timeOnly.format(new Date(iso))

/** "8 min ago" style label; `now` comes from the BE `serverTime` when the caller has it. */
export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.floor(hours / 24)} d ago`
}

/** `LOGISTICS_MANAGER` -> `Logistics Manager`. */
export const roleLabel = (role: string) =>
  role
    .replace(/^ROLE_/, "")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

interface PlaceLike {
  locationName: string
  city: string | null
  country: string
  latitude: number | null
  longitude: number | null
}

export const placeLine = (place: PlaceLike | null | undefined) =>
  place ? [place.locationName, place.city, place.country].filter(Boolean).join(", ") : EMPTY

export const coordinates = (place: PlaceLike | null | undefined) =>
  place && place.latitude !== null && place.longitude !== null ? `${place.latitude.toFixed(4)}, ${place.longitude.toFixed(4)}` : null

export const mapsUrl = (place: PlaceLike | null | undefined) =>
  place && place.latitude !== null && place.longitude !== null
    ? `https://www.google.com/maps?q=${place.latitude},${place.longitude}`
    : null

/** `TIRE_DAMAGE` -> `Tire Damage` for values without a shared label table. */
export const titleCase = (value: string | null | undefined) =>
  value
    ? value
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : EMPTY

export const yesNo = (value: boolean) => (value ? "Yes" : "No")
