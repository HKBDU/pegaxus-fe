import { format, isValid, parseISO } from "date-fns"

import type {
  AssignableRole,
  EmployeeBrief,
  Phase2Segment,
  RouteSegmentInfo,
  ScheduleConflictDetails,
  SegmentStatus,
  SegmentVehicle,
} from "@/features/personnel/types"

function safeFormat(value: string | null | undefined, pattern: string) {
  if (!value) return "—"
  const date = parseISO(value)
  return isValid(date) ? format(date, pattern) : "—"
}

export const formatDateTime = (value: string | null | undefined) => safeFormat(value, "dd/MM/yyyy HH:mm")
export const formatDate = (value: string | null | undefined) => safeFormat(value, "dd/MM/yyyy")

export function formatDuration(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined) return "—"
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  if (!hours) return `${rest}m`
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function employeeLabel(employee: Pick<EmployeeBrief, "employeeCode" | "fullName">) {
  return `${employee.employeeCode} — ${employee.fullName}`
}

/** Row state shown in the phase 2 table. Derived from the PS2 fields; it is not a BE status. */
export type SegmentAssignmentState = "PROVIDER" | "ASSIGNED" | "INCOMPLETE" | "NOT_ASSIGNED"

export function segmentAssignmentState(segment: Phase2Segment): SegmentAssignmentState {
  if (segment.isOutsourced) return "PROVIDER"
  if (segment.driver && segment.escort) return "ASSIGNED"
  if (segment.driver || segment.escort) return "INCOMPLETE"
  return "NOT_ASSIGNED"
}

export interface ConflictCandidate {
  routePlanRouteId: string
  role: Extract<AssignableRole, "DRIVER" | "ESCORT">
  employee: EmployeeBrief
}

/**
 * SCHEDULE_CONFLICT only carries a message ("Driver EMP-… is already assigned to Transport TP-… during this
 * time slot."), so the person at fault is found by the employee code that appears in it.
 */
export function findConflictCandidate(message: string | undefined, candidates: ConflictCandidate[], details?: ScheduleConflictDetails) {
  // The structured `value` of the answer is exact; the message is only the fallback.
  if (details?.employeeId) {
    const exact = candidates.find(
      (candidate) =>
        candidate.employee.employeeId === details.employeeId && (!details.routePlanRouteId || candidate.routePlanRouteId === details.routePlanRouteId),
    )
    if (exact) return exact
  }
  if (!message) return undefined
  const text = message.toLowerCase()
  return candidates.find((candidate) => text.includes(candidate.employee.employeeCode.toLowerCase()))
}

const ERROR_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Some fields are invalid. Please check the form.",
  TRANSPORT_PLAN_NOT_FOUND: "Transport plan not found.",
  ROUTE_PLAN_NOT_FOUND: "Route plan not found.",
  SEGMENT_NOT_FOUND: "Route segment not found.",
  EMPLOYEE_NOT_FOUND: "Employee not found.",
  PLAN_LOCKED: "Assignments cannot be changed once the transport is in progress, completed or cancelled.",
  DEPOSIT_REQUIRED: "The customer's deposit must be paid before the Transport Specialist and Route Coordinator can be assigned.",
  PHASE1_ALREADY_ASSIGNED: "Phase 1 has already been assigned. Please reload the page and use Change instead.",
  PHASE1_NOT_ASSIGNED: "Phase 1 has not been assigned yet. Please reload the page.",
  PHASE1_LOCKED: "Phase 1 cannot be changed once Phase 2 is open.",
  TRANSPORT_PLAN_MODIFIED: "The transport plan was just modified. Please reload the page.",
  // What the BE actually returns for a stale PS5 (the contract names it TRANSPORT_PLAN_MODIFIED).
  TRANSPORT_PLAN_CONCURRENCY_CONFLICT: "The transport plan was just modified. Please reload the page.",
  ROUTE_PLAN_MODIFIED: "The route plan was just modified. Please reload the page.",
  ROUTE_NOT_CONFIRMED: "Drivers and escorts can be assigned only after the route plan is confirmed.",
  SEGMENT_ALREADY_ASSIGNED: "This segment already has a driver and an escort. Please reload the page and use Change instead.",
  SEGMENT_LOCKED: "This segment is already in progress or completed, so its personnel can no longer be changed.",
  INVALID_ROLE_ASSIGNMENT: "The selected employee does not have the required role or is not active.",
  OUTSOURCED_SEGMENT: "An outsourced segment cannot have a driver or an escort.",
  FORBIDDEN: "You do not have permission to perform this action.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
}

/** Codes that mean the data on screen is stale: reload it, never overwrite. */
export const STALE_ERROR_CODES = new Set([
  "TRANSPORT_PLAN_MODIFIED",
  "TRANSPORT_PLAN_CONCURRENCY_CONFLICT",
  "ROUTE_PLAN_MODIFIED",
  "PHASE1_ALREADY_ASSIGNED",
  "PHASE1_NOT_ASSIGNED",
  "SEGMENT_ALREADY_ASSIGNED",
  "PHASE1_LOCKED",
])

export function getPersonnelErrorCode(error: unknown) {
  return error instanceof Error ? error.message : ""
}

export function getPersonnelErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  const code = getPersonnelErrorCode(error)
  const backend = (error as { backendMessage?: string } | null)?.backendMessage
  if (code === "SCHEDULE_CONFLICT") return backend ?? "The selected employee is already assigned during this time slot."
  return ERROR_MESSAGES[code] ?? backend ?? fallback
}

/** Intersection of two time windows (ISO strings), or null when they do not overlap. */
export function overlapWindow(left: { from: string; to: string }, right: { from: string; to: string }) {
  const from = new Date(left.from) > new Date(right.from) ? left.from : right.from
  const to = new Date(left.to) < new Date(right.to) ? left.to : right.to
  return new Date(from) < new Date(to) ? { from, to } : null
}

/** One row of the phase 2 table / dialogs: PS2 assignment fields + RP3 location and distance details. */
export interface SegmentRow extends Phase2Segment {
  fromName: string
  toName: string
  distanceKm: number | null
  durationMinutes: number | null
  status: SegmentStatus | null
  vehicles: SegmentVehicle[]
}

/** Merges PS2 segments with RP3 segments by `routePlanRouteId`. RP3 can be missing, the rows then fall back to "Segment N". */
export function buildSegmentRows(phase2Segments: Phase2Segment[], routeSegments: RouteSegmentInfo[] | undefined): SegmentRow[] {
  const byId = new Map((routeSegments ?? []).map((segment) => [segment.routePlanRouteId, segment]))
  return [...phase2Segments]
    .sort((left, right) => left.sequenceNo - right.sequenceNo)
    .map((segment) => {
      const info = byId.get(segment.routePlanRouteId)
      return {
        ...segment,
        fromName: info ? [info.fromLocation.locationName, info.fromLocation.country].filter(Boolean).join(", ") : `Segment ${segment.sequenceNo}`,
        toName: info ? [info.toLocation.locationName, info.toLocation.country].filter(Boolean).join(", ") : "—",
        distanceKm: info?.route?.distanceKm ?? null,
        durationMinutes: info?.route?.estimatedDurationMinutes ?? null,
        status: info?.status ?? null,
        vehicles: info?.vehicles ?? [],
      }
    })
}
