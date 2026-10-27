import { format, isValid, parseISO } from "date-fns"

import { EQUIPMENT_PRESETS } from "@/features/fleet/constants/fleet.constants"
import type { ExpiryStatus, VehicleWarning } from "@/features/fleet/types"

const EXPIRING_SOON_DAYS = 7

/** Today as a UTC date (`yyyy-MM-dd`): the BE compares expiry dates with the UTC day, not the browser's day. */
export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

/** Mirrors the BE rule (api-contract "BE calculated field"): <= today expired, < 7 days left expiring soon. Used by the mock only. */
export function computeExpiryStatus(date: string | null, now = new Date()): ExpiryStatus {
  if (!date) return "VALID"
  const expiry = parseISO(date)
  if (!isValid(expiry)) return "VALID"
  const days = Math.round((Date.parse(date) - Date.parse(todayUtc(now))) / 86_400_000)
  if (days <= 0) return "EXPIRED"
  if (days < EXPIRING_SOON_DAYS) return "EXPIRING_SOON"
  return "VALID"
}

export function computeWarnings(registration: ExpiryStatus, insurance: ExpiryStatus): VehicleWarning[] {
  const warnings: VehicleWarning[] = []
  if (registration === "EXPIRED") warnings.push("REGISTRATION_EXPIRED")
  if (registration === "EXPIRING_SOON") warnings.push("REGISTRATION_EXPIRING_SOON")
  if (insurance === "EXPIRED") warnings.push("INSURANCE_EXPIRED")
  if (insurance === "EXPIRING_SOON") warnings.push("INSURANCE_EXPIRING_SOON")
  return warnings
}

function safeFormat(value: string | null | undefined, pattern: string) {
  if (!value) return "—"
  const date = parseISO(value)
  return isValid(date) ? format(date, pattern) : "—"
}

export const formatMonthYear = (value: string | null | undefined) => safeFormat(value, "MM/yyyy")
export const formatFleetDate = (value: string | null | undefined) => safeFormat(value, "dd/MM/yyyy")
export const formatFleetDateTime = (value: string | null | undefined) => safeFormat(value, "dd/MM/yyyy HH:mm")

/**
 * specialEquipment is one text column in the DB. The form keeps preset tags + free notes in it as
 * `[TAG; TAG]` on the first line followed by the notes, and reads that shape back when editing.
 */
export function buildEquipment(tags: string[], notes: string): string | undefined {
  const cleanNotes = notes.trim()
  const head = tags.length ? `[${tags.join("; ")}]` : ""
  const text = [head, cleanNotes].filter(Boolean).join("\n")
  return text || undefined
}

export function parseEquipment(text: string | null | undefined): { tags: string[]; notes: string } {
  if (!text) return { tags: [], notes: "" }
  const match = /^\[([^\]]*)\]\n?([\s\S]*)$/.exec(text)
  if (!match) return { tags: [], notes: text }
  const known = new Set<string>(EQUIPMENT_PRESETS)
  const tags = match[1]
    .split(";")
    .map((tag) => tag.trim())
    .filter((tag) => known.has(tag))
  return { tags, notes: match[2].trim() }
}

/** Plain one-line text for tables. */
export function equipmentSummary(text: string | null | undefined) {
  const { tags, notes } = parseEquipment(text)
  const parts = [...tags.map((tag) => tag.toLowerCase().replace(/^\w/, (c) => c.toUpperCase())), notes].filter(Boolean)
  return parts.join(", ") || "—"
}

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Some fields are invalid. Please check the form.",
  VEHICLE_NOT_FOUND: "Vehicle not found.",
  VEHICLE_CODE_DUPLICATED: "Vehicle Code or License Plate already exists in the system.",
  LICENSE_PLATE_DUPLICATED: "License plate is already assigned to another vehicle.",
  VEHICLE_MODIFIED: "The vehicle was just modified. Please reload the page.",
  VEHICLE_IN_USE: "The transport mode cannot be changed while the vehicle is assigned to unfinished route segments.",
  VEHICLE_STATUS_LOCKED: "Vehicle is currently assigned or in use on an active trip. Its status is managed automatically.",
  PROVIDER_NOT_FOUND: "Transport provider not found.",
  PROVIDER_CODE_DUPLICATED: "Transport Provider with this Code / Tax ID already exists.",
  TAX_CODE_DUPLICATED: "Transport Provider with this Code / Tax ID already exists.",
  PROVIDER_MODIFIED: "The provider was just modified. Please reload the page.",
  PROVIDER_IN_USE: "The provider is assigned to route segments that are not completed or cancelled.",
  FORBIDDEN: "You do not have permission to perform this action.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

export function getFleetErrorCode(error: unknown) {
  return error instanceof Error ? error.message : ""
}

export function getFleetErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  const code = getFleetErrorCode(error)
  const backend = (error as { backendMessage?: string } | null)?.backendMessage
  return ERROR_MESSAGES[code] ?? backend ?? fallback
}
