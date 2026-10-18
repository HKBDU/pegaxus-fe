import { useMemo } from "react"
import { MapViewer } from "@/shared/components/map"
import { planRoutes, planStops } from "../lib/route-stops"
import { trailGaps } from "../lib/trail"
import type { GpsSignal, TrackingSegment, TrackingStop, Trail, TruckSample } from "../types"
import { GapLayer } from "./GapLayer"
import { MapLegend } from "./MapLegend"
import { NextStopHighlight } from "./NextStopHighlight"
import { TrailLayer } from "./TrailLayer"
import { TruckMarker } from "./TruckMarker"

interface TrackingMapProps {
  segments: TrackingSegment[]
  nextStop: TrackingStop | null | undefined
  truck: TruckSample | null
  trail: Trail
  signal: GpsSignal
}

/**
 * Planned legs (drawn by the shared map through Geoapify), the stops, the next stop, the trail, the signal gaps and the
 * vehicle. This is the only file that loads the map library for the tab: the page lazy-loads it, and crew has no route
 * to it.
 */
export default function TrackingMap({ segments, nextStop, truck, trail, signal }: TrackingMapProps) {
  const stops = useMemo(() => planStops(segments), [segments])
  const routes = useMemo(() => planRoutes(segments), [segments])
  const gaps = useMemo(() => trailGaps(trail), [trail])
  const next =
    nextStop && typeof nextStop.latitude === "number" && typeof nextStop.longitude === "number"
      ? { latitude: nextStop.latitude, longitude: nextStop.longitude, name: nextStop.locationName }
      : null

  return (
    // MapViewer sizes itself to 87vh; inside the tab it fills this box instead.
    <div className="relative h-[clamp(440px,calc(100vh-9rem),720px)] overflow-hidden rounded-lg border border-[#e5e2d9] shadow-sm [&>div]:h-full! [&>div]:min-h-0!">
      <MapViewer locations={stops} routes={routes} mode="view">
        {next ? <NextStopHighlight {...next} /> : null}
        <TrailLayer trail={trail} />
        <GapLayer gaps={gaps} />
        {truck ? <TruckMarker truck={truck} signal={signal} /> : null}
      </MapViewer>
      <MapLegend />
    </div>
  )
}
