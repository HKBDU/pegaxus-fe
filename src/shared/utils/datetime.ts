const UTC_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
})

const UTC_DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
})

const UTC_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
})

const LOCAL_TIME_LABEL_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZoneName: "shortOffset",
})

function parseDate(value: string | Date | null | undefined) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function withUtcSuffix(value: string) {
  return `${value} UTC`
}

/** Formats an instant in UTC. Date-only values are kept as date-only values. */
export function formatUtcDateTime(value: string | Date | null | undefined) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = parseDate(value)
  if (!date) return "—"
  const parts = UTC_DATE_TIME_FORMAT.formatToParts(date)
  const hour = parts.find((part) => part.type === "hour")?.value
  const minute = parts.find((part) => part.type === "minute")?.value
  const day = parts.find((part) => part.type === "day")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const year = parts.find((part) => part.type === "year")?.value
  return `${hour}:${minute} UTC, ${day}/${month}/${year}`
}

export function formatLocalDateTimeLabel(value: string | Date | null | undefined) {
  const date = parseDate(value)
  return date ? `${LOCAL_TIME_LABEL_FORMAT.format(date)} (your time)` : "—"
}

export function formatUtcTime(value: string | Date | null | undefined) {
  const date = parseDate(value)
  return date ? withUtcSuffix(UTC_TIME_FORMAT.format(date)) : "—"
}

export function formatUtcDate(value: string | Date | null | undefined) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = parseDate(value)
  return date ? UTC_DATE_FORMAT.format(date) : "—"
}

export function todayUtc() {
  const now = new Date()
  return [now.getUTCFullYear(), String(now.getUTCMonth() + 1).padStart(2, "0"), String(now.getUTCDate()).padStart(2, "0")].join("-")
}

/** Converts a datetime-local value, interpreted in the viewer's local time, to UTC. */
export function toUtcIso(localValue: string | null | undefined) {
  if (!localValue) return undefined
  const date = new Date(localValue)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

