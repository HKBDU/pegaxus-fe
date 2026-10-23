import { ROLE_ROUTES } from "@/app/route-config"

import type { IncidentSort } from "./types"

/** Paths from api-contract 7.1; the shared `incidentPaths` differs, so the feature keeps its own. */
export const incidentRoutes = {
  adminList: ROLE_ROUTES.incidents,
  adminDetail: (incidentReportId: string) => `${ROLE_ROUTES.incidents}/${encodeURIComponent(incidentReportId)}`,
  crewDetail: (incidentReportId: string) => `/crew/incidents/${encodeURIComponent(incidentReportId)}`,
  customerDetail: (bookingId: string, transportId: string, incidentReportId: string) =>
    `/bookings/${encodeURIComponent(bookingId)}/transports/${encodeURIComponent(transportId)}/incidents/${encodeURIComponent(incidentReportId)}`,
  reroute: (incidentReportId: string) => `${ROLE_ROUTES.incidents}/${encodeURIComponent(incidentReportId)}/reroute`,
  transport: (transportId: string) => `/admin/ongoing-transports/${encodeURIComponent(transportId)}`,
} as const

/** Statuses that count as "still open" (IN7 `status=REPORTED,PENDING`). */
export const OPEN_STATUSES = "REPORTED,PENDING"

export const DEFAULT_SORT: IncidentSort = "severity:desc,occurredAt:desc"

export const SORT_OPTIONS: Array<{ value: IncidentSort; label: string }> = [
  { value: "severity:desc,occurredAt:desc", label: "Severity, newest" },
  { value: "occurredAt:desc", label: "Newest" },
  { value: "occurredAt:asc", label: "Oldest" },
  { value: "updatedAt:desc", label: "Recently updated" },
]

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: OPEN_STATUSES, label: "Open" },
  { value: "REPORTED", label: "Reported" },
  { value: "PENDING", label: "Pending" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CANCELLED", label: "Cancelled" },
]

/** Message per BE `errorCode` (contract IN9-IN11); the UI branches on the code, never on the HTTP status. */
export const INCIDENT_ERROR_MESSAGES: Record<string, string> = {
  INCIDENT_MODIFIED: "This incident was changed by someone else. Reload to see the latest version.",
  INVALID_INCIDENT_STATUS: "This incident can no longer be changed in its current status.",
  INVALID_TRANSPORT_STATUS: "The transport is not in a status that allows this action.",
  UNRESOLVED_EMERGENCY_COSTS: "Some emergency cost requests are still pending. Decide them before closing the incident.",
  HAS_OPEN_EMERGENCY_COSTS: "You still have open emergency cost requests. Ask the Logistics Manager to close the incident instead.",
  HAS_APPROVED_EMERGENCY_COST: "An emergency cost was already approved, so the incident cannot be cancelled. Resolve it instead.",
  SETTLEMENT_NOT_CONFIRMED: "Confirm the emergency cost settlement before resolving.",
  NETWORK_ERROR: "Cannot reach the server. Check your connection and try again.",
}

export const ALERT_NOTIFICATION_TYPES = new Set(["INCIDENT", "HORSE_HEALTH", "ROUTE", "EMERGENCY_COST"])

/** Left-edge colour per severity (list cards and the crew header). */
export const severityEdge: Record<string, string> = {
  CRITICAL: "border-l-red-600",
  HIGH: "border-l-orange-500",
  MEDIUM: "border-l-amber-400",
  LOW: "border-l-slate-400",
}
