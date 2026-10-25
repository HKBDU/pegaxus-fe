import type { SegmentDetail, TrackingSegment, TransportOverview } from "../types"

const POINTS = ["North", "North-east", "East", "South-east", "South", "South-west", "West", "North-west"] as const

/** Heading in degrees (0 = north, clockwise) as a compass word; null when the device sent no heading. */
export function compassDirection(heading: number | null | undefined) {
  if (heading === null || heading === undefined || !Number.isFinite(heading)) return null
  return POINTS[Math.round((((heading % 360) + 360) % 360) / 45) % 8]
}

/**
 * How far along its leg the vehicle is, 0-100. A finished leg is 100 and one not started is 0; the current leg is
 * measured from the remaining road distance to its end against the leg length. Null when it cannot be known.
 */
export function segmentProgress(segment: SegmentDetail | undefined, remainingKm: number | null) {
  if (!segment) return null
  if (segment.status === "COMPLETED") return 100
  if (segment.status === "PLANNED") return 0
  if (remainingKm === null || !segment.distanceKm) return null
  return Math.round(Math.min(100, Math.max(0, (1 - remainingKm / segment.distanceKm) * 100)))
}

/** The leg to describe first: the current one, else the first not finished, else (all done) the last. */
export function pickCurrentSegment(segments: SegmentDetail[]) {
  return segments.find((item) => item.isCurrent) ?? segments.find((item) => item.status !== "COMPLETED") ?? segments.at(-1)
}

/** GP1 legs in the shape of OT4 legs, with the fields only OT4 knows left empty (used when OT4 fails). */
export function fromTrackingSegments(segments: TrackingSegment[]): SegmentDetail[] {
  return [...segments]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((segment) => ({ ...segment, isCurrent: segment.status === "IN_TRANSIT", isOutsourced: false, vehicles: [] }))
}

/** "3 normal · 1 at risk"; only the groups that exist. */
export function welfareText(summary: TransportOverview["horseHealthSummary"]) {
  const parts = [
    [summary.normal, "normal"],
    [summary.observationRequired, "under observation"],
    [summary.atRisk, "at risk"],
    [summary.critical, "critical"],
    [summary.noData, "no data"],
  ] as const
  const text = parts.filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`)
  return text.length ? text.join(" · ") : "No health data"
}

/** The worst health group, to colour the welfare line. */
export function welfareTone(summary: TransportOverview["horseHealthSummary"]): "good" | "warn" | "bad" | "none" {
  if (summary.critical > 0 || summary.atRisk > 0) return "bad"
  if (summary.observationRequired > 0) return "warn"
  return summary.normal > 0 ? "good" : "none"
}
