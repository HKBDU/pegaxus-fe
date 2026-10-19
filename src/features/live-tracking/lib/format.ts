const clock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" })
const clockWithSeconds = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })

/** "14:05" from an ISO string or a millisecond timestamp; "-" when it is not a valid time. */
export function formatClock(value: string | number | null | undefined, withSeconds = false) {
  if (value === null || value === undefined) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return (withSeconds ? clockWithSeconds : clock).format(date)
}

export function formatKm(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? "-" : `${value.toFixed(1)} km`
}

export function formatSpeed(value: number | null | undefined) {
  return value === null || value === undefined || !Number.isFinite(value) ? "-" : `${Math.round(value)} km/h`
}

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

/** "14 Oct 2026, 13:42" (the viewer's time zone); "-" when empty or invalid. */
export function formatDateTime(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "-"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : dateTime.format(date)
}

/** 183 -> "3h 03m", 45 -> "45m". */
export function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) return "-"
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  return hours > 0 ? `${hours}h ${String(total % 60).padStart(2, "0")}m` : `${total}m`
}

/** "REST_STOP" -> "Rest stop". */
export function humanize(code: string | null | undefined) {
  if (!code) return "-"
  const text = code.replaceAll("_", " ").toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
}
