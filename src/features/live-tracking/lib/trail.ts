import { TRAIL_BREAK_MS, TRAIL_MAX_POINTS } from "../constants"
import type { Trail, TrailPoint, TruckSample } from "../types"

export function toTrailPoint(sample: Pick<TruckSample, "latitude" | "longitude" | "recordedAt">): TrailPoint | null {
  const time = Date.parse(sample.recordedAt)
  return Number.isFinite(time) ? { latitude: sample.latitude, longitude: sample.longitude, recordedAt: sample.recordedAt, time } : null
}

/**
 * Add a received sample to the trail. Older or duplicate samples are dropped (the hub may replay one after a
 * reconnect); a sample more than `TRAIL_BREAK_MS` after the previous one starts a new stroke, so the line is never
 * drawn straight across a signal gap (UC-53 ALT-01, BR-046).
 */
export function appendTrailPoint(trail: Trail, point: TrailPoint): Trail {
  const lastStroke = trail[trail.length - 1]
  const last = lastStroke?.[lastStroke.length - 1]
  if (!lastStroke || !last) return [[point]]
  if (point.time <= last.time) return trail
  if (point.time - last.time > TRAIL_BREAK_MS) return capTrail([...trail, [point]])
  const sameSpot = point.latitude === last.latitude && point.longitude === last.longitude
  // A parked vehicle keeps sending the same spot: keep one point and only move its time forward.
  const stroke = sameSpot ? [...lastStroke.slice(0, -1), point] : [...lastStroke, point]
  return capTrail([...trail.slice(0, -1), stroke])
}

function capTrail(trail: Trail): Trail {
  let excess = trail.reduce((sum, stroke) => sum + stroke.length, 0) - TRAIL_MAX_POINTS
  if (excess <= 0) return trail
  const result = [...trail]
  while (excess > 0 && result.length) {
    const first = result[0]
    if (first.length <= excess) {
      excess -= first.length
      result.shift()
    } else {
      result[0] = first.slice(excess)
      excess = 0
    }
  }
  return result
}

/** GeoJSON of the strokes that can be drawn (a stroke needs two points). */
export interface TrailGeoJson {
  type: "Feature"
  properties: Record<string, never>
  geometry: { type: "MultiLineString"; coordinates: number[][][] }
}

export function trailToGeoJson(trail: Trail): TrailGeoJson {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiLineString",
      coordinates: trail.filter((stroke) => stroke.length >= 2).map((stroke) => stroke.map((p) => [p.longitude, p.latitude])),
    },
  }
}

/** The stretch between two strokes: the vehicle drove on without reporting, so its path there is unknown. */
export interface TrailGap {
  from: TrailPoint
  to: TrailPoint
  ms: number
}

export function trailGaps(trail: Trail): TrailGap[] {
  const gaps: TrailGap[] = []
  for (let index = 1; index < trail.length; index += 1) {
    const from = trail[index - 1].at(-1)
    const to = trail[index][0]
    if (from && to) gaps.push({ from, to, ms: to.time - from.time })
  }
  return gaps
}
