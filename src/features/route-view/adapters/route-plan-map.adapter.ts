import type { RouteMapLocation, RoutePlanDetail } from "../types"

function coordinate(value: unknown, limit: number) {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null
}

export function toRouteMapLocations(plan: Pick<RoutePlanDetail, "segments">): RouteMapLocation[] {
  const seen = new Set<string>()
  return [...plan.segments].sort((a, b) => a.sequenceNo - b.sequenceNo).flatMap((segment) => [segment.fromLocation, segment.toLocation]).flatMap((location) => {
    const latitude = coordinate(location.latitude, 90), longitude = coordinate(location.longitude, 180)
    if (latitude === null || longitude === null || seen.has(location.locationId)) return []
    seen.add(location.locationId)
    return [{ id: location.locationId, name: location.locationName, type: location.locationType, city: location.city, country: location.country, latitude, longitude }]
  })
}
