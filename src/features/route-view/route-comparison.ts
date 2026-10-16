import type { RoutePlanDetail, RouteSegment } from "./types"

export type SegmentImpact = {
  kind: "replaced" | "unaffected" | "replacement" | "completed" | "remaining" | "in-progress" | "return" | "unknown"
  label: string
  detail: string
  highlighted: boolean
}

// Classification uses RP3 status and replacement sequence, never coordinates or estimated progress.
export function getSegmentImpact(segment: RouteSegment, proposed: RoutePlanDetail, side: "primary" | "proposed"): SegmentImpact {
  if (side === "proposed") return proposed.routeType === "BACKUP"
    ? { kind: "replacement", label: "Proposed replacement", detail: "Prepared backup leg; not the full effective journey.", highlighted: true }
    : { kind: "return", label: "Proposed return", detail: "Return leg; approval does not activate this draft.", highlighted: true }
  if (proposed.routeType === "BACKUP") {
    const range = proposed.replacesSequenceNo
    if (!range) return { kind: "unknown", label: "Range unavailable", detail: "The API did not supply a PRIMARY replacement range.", highlighted: false }
    const affected = segment.sequenceNo >= range.from && segment.sequenceNo <= range.to
    return affected
      ? { kind: "replaced", label: "Affected segment", detail: "This PRIMARY leg is in the proposed replacement range.", highlighted: true }
      : { kind: "unaffected", label: "Outside replacement", detail: "This PRIMARY leg is outside the proposed replacement range.", highlighted: false }
  }
  if (segment.status === "COMPLETED") return { kind: "completed", label: "Completed leg", detail: "Completed PRIMARY leg; retained when return is activated.", highlighted: false }
  if (segment.status === "PENDING") return { kind: "remaining", label: "Remaining planned leg", detail: "Untraveled PRIMARY leg; omitted only after return activation.", highlighted: true }
  return { kind: "in-progress", label: "In progress", detail: "Current leg status is known; position and traveled portion are unavailable.", highlighted: false }
}

export function orderedSegments(plan: Pick<RoutePlanDetail, "segments">) {
  return [...plan.segments].sort((a, b) => a.sequenceNo - b.sequenceNo)
}

export function isRelatedPrimary(primary: RoutePlanDetail, proposed: RoutePlanDetail) {
  return primary.routeType === "PRIMARY" && primary.routePlanId !== proposed.routePlanId &&
    primary.transportPlanId === proposed.transportPlanId && primary.bookingId === proposed.bookingId
}
