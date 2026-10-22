import { useMemo } from "react"

import { MapViewer, type MapLocation } from "@/shared/components/map"

import type { IncidentLike } from "../types"

/** Read-only map with the incident point. Lazy-loaded by the caller so maplibre stays out of the main bundle. */
export default function IncidentLocationMap({ location }: { location: NonNullable<IncidentLike["location"]> }) {
  const locations = useMemo<MapLocation[]>(
    () =>
      location.latitude !== null && location.longitude !== null
        ? [{ id: location.locationId, name: location.locationName, city: location.city, country: location.country, latitude: location.latitude, longitude: location.longitude }]
        : [],
    [location],
  )
  if (!locations.length) return null
  return (
    // MapViewer sizes itself to 87vh; here it fills this smaller box instead.
    <div className="h-[240px] sm:h-[280px] [&>div]:h-full! [&>div]:min-h-0!">
      <MapViewer locations={locations} mode="view" />
    </div>
  )
}
