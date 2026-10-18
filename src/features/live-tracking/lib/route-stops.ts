import type { MapLocation, MapRoute } from "@/shared/components/map"
import type { TrackingSegment, TrackingStop } from "../types"

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

/** The stops of the plan in travel order, each once (the end of one leg is the start of the next). */
export function planStops(segments: TrackingSegment[]): MapLocation[] {
  const stops: MapLocation[] = []
  for (const segment of sortSegments(segments)) {
    for (const location of [segment.fromLocation, segment.toLocation]) {
      const stop = toMapLocation(location)
      if (stop && !stops.some((item) => item.id === stop.id)) stops.push(stop)
    }
  }
  return stops
}

/** One read-only route per leg: the map draws the road line itself with Geoapify (like the route plan screens). */
export function planRoutes(segments: TrackingSegment[]): MapRoute[] {
  return sortSegments(segments).flatMap((segment) => {
    const from = toMapLocation(segment.fromLocation)
    const to = toMapLocation(segment.toLocation)
    if (!from || !to) return []
    const mode = segment.transportMode
    return [
      {
        id: segment.routePlanRouteId,
        routePlanRouteId: segment.routePlanRouteId,
        name: `${from.name} to ${to.name}`,
        fromLocation: from,
        toLocation: to,
        transportMode: mode === "SEA" || mode === "AIR" ? mode : "ROAD",
        readonly: segment.status === "COMPLETED",
      } satisfies MapRoute,
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
