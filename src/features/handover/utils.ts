import { STATUS_LABEL, TYPE_LABEL, type HandoverStatus, type HandoverType } from "./constants"
import type { HandoverRecord } from "./types"

export const typeLabel = (value: string) => TYPE_LABEL[value as HandoverType] ?? value
export const statusLabel = (value: string) => STATUS_LABEL[value as HandoverStatus] ?? value

export function formatDateTime(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
}

export function formatTime(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date)
}

/** The time that matters for a row: when it happened, else when it is planned. */
export function handoverMoment(item: { actualHandoverAt?: string | null; plannedHandoverAt?: string | null }) {
  return item.actualHandoverAt ?? item.plannedHandoverAt ?? null
}

export const hasAction = (record: Pick<HandoverRecord, "availableActions">, action: string) => record.availableActions.includes(action)

/** Great-circle distance in metres. Only used for the advisory "are you at the handover point" hint. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`
}

/** Text to show for a failed call: the BE message (it already says what to fix), else a plain fallback. */
export function describeError(error: unknown, fallback = "Something went wrong. Please try again.") {
  const known = error as { message?: unknown; errors?: Array<{ message: string }> } | null
  const details = known?.errors?.map((entry) => entry.message).filter(Boolean) ?? []
  const message = typeof known?.message === "string" && known.message ? known.message : fallback
  return details.length > 0 && !details.includes(message) ? `${message} ${details.join(" ")}` : message
}
