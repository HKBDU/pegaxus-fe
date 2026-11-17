import type { MapLocation, MapRoute } from "@/shared/components/map"
import type { SegmentDetail, TrackingSegment, TrackingStop } from "../types"

export interface StopPoint {
  id: string
  name: string
  latitude: number
  longitude: number
}

type SegmentLocation = TrackingSegment["fromLocation"]

function hasCoordinates(location: SegmentLocation): location is SegmentLocation & { latitude: number; longitude: number } {
  return Number.isFinite(location.latitude) && Number.isFinite(location.longitude)
}

export function sortSegments(segments: TrackingSegment[]) {
  return [...segments].sort((a, b) => a.displayOrder - b.displayOrder)
}

function toMapLocation(location: SegmentLocation): MapLocation | null {
  if (!hasCoordinates(location)) return null
  return {
    id: location.locationId,
    name: location.locationName,
    type: location.locationType,
    city: location.city,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
  }
}

/**
 * Legs the convoy left early at an incident to turn back. GP1 ends such a leg where it stopped (the incident), OT4 keeps
 * the planned end, so the two answers differ there. Keyed by leg, with the planned end the convoy never reached.
 */
export function cutLegs(segments: TrackingSegment[], details: SegmentDetail[] = []) {
  const planned = new Map(details.map((detail) => [detail.routePlanRouteId.toLowerCase(), detail.toLocation]))
  const cut = new Map<string, SegmentLocation>()
  for (const segment of segments) {
    const end = planned.get(segment.routePlanRouteId.toLowerCase())
    if (end && end.locationId.toLowerCase() !== segment.toLocation.locationId.toLowerCase())
      cut.set(segment.routePlanRouteId, end)
  }
  return cut
}

/** The stops of the plan in travel order, each once (the end of one leg is the start of the next). */
export function planStops(segments: TrackingSegment[], details: SegmentDetail[] = []): MapLocation[] {
  const cut = cutLegs(segments, details)
  const stops: MapLocation[] = []
  const add = (location: SegmentLocation, isIncident = false) => {
    const stop = toMapLocation(location)
    if (stop && !stops.some((item) => item.id === stop.id)) stops.push(isIncident ? { ...stop, isIncident } : stop)
  }
  for (const segment of sortSegments(segments)) {
    const plannedEnd = cut.get(segment.routePlanRouteId)
    add(segment.fromLocation)
    // A leg cut at an incident ends at the incident; its planned end follows, as the end of the stretch never driven.
    add(segment.toLocation, Boolean(plannedEnd))
    if (plannedEnd) add(plannedEnd)
  }
  return stops
}

/** One read-only route per leg: the map draws the road line itself with Geoapify (like the route plan screens). */
export function planRoutes(segments: TrackingSegment[], details: SegmentDetail[] = []): MapRoute[] {
  const cut = cutLegs(segments, details)
  return sortSegments(segments).flatMap((segment) => {
    const from = toMapLocation(segment.fromLocation)
    const to = toMapLocation(segment.toLocation)
    if (!from || !to) return []
    const mode = segment.transportMode
    const transportMode = mode === "SEA" || mode === "AIR" ? mode : "ROAD"
    const plannedEnd = cut.get(segment.routePlanRouteId)
    const rest = plannedEnd ? toMapLocation(plannedEnd) : null
    return [
      {
        id: segment.routePlanRouteId,
        routePlanRouteId: segment.routePlanRouteId,
        name: `${from.name} to ${to.name}`,
        fromLocation: from,
        toLocation: to,
        transportMode,
        readonly: segment.status === "COMPLETED",
      } satisfies MapRoute,
      // The planned rest of a leg cut at an incident: never driven, because the convoy turned back.
      ...(rest
        ? [
            {
              id: segment.routePlanRouteId + ":not-driven",
              name: `${to.name} to ${rest.name} (not driven)`,
              fromLocation: to,
              toLocation: rest,
              transportMode,
              notDriven: true,
            } satisfies MapRoute,
          ]
        : []),
    ]
  })
}

/**
 * The points still ahead: the next stop, then the end of every later leg. Legs that are COMPLETED are behind the
 * vehicle. When the BE sends no next stop (nothing started), the plan is measured from its first leg's end.
 */
export function remainingStops(segments: TrackingSegment[], nextStop: TrackingStop | null | undefined): StopPoint[] {
  const ordered = sortSegments(segments).filter((segment) => segment.status !== "COMPLETED")
  const points: StopPoint[] = []
  for (const segment of ordered) {
    const location = segment.toLocation
    if (!hasCoordinates(location)) continue
    points.push({ id: location.locationId, name: location.locationName, latitude: location.latitude, longitude: location.longitude })
  }
  if (nextStop && hasCoordinates(nextStop)) {
    const index = points.findIndex((point) => point.id === nextStop.locationId)
    const next = { id: nextStop.locationId, name: nextStop.locationName, latitude: nextStop.latitude, longitude: nextStop.longitude }
    // Drop anything before the next stop (a leg the BE already considers passed), keep the order after it.
    return index >= 0 ? points.slice(index) : [next, ...points]
  }
  return points
}
