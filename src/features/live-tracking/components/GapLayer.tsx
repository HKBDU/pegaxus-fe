import { useMemo } from "react"
import { Layer, Marker, Source } from "react-map-gl/maplibre"
import { formatDuration } from "../lib/format"
import type { TrailGap } from "../lib/trail"

interface GapGeoJson {
  type: "FeatureCollection"
  features: Array<{ type: "Feature"; properties: Record<string, never>; geometry: { type: "LineString"; coordinates: number[][] } }>
}

/**
 * Where the vehicle was out of signal: a dotted grey line from the last position before the gap to the first one after
 * it, with the length of the gap. It is a straight connector, not a route - the real path in between is unknown.
 */
export function GapLayer({ gaps }: { gaps: TrailGap[] }) {
  const data = useMemo<GapGeoJson>(
    () => ({
      type: "FeatureCollection",
      features: gaps.map((gap) => ({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [gap.from.longitude, gap.from.latitude],
            [gap.to.longitude, gap.to.latitude],
          ],
        },
      })),
    }),
    [gaps],
  )
  if (!gaps.length) return null
  return (
    <>
      <Source id="live-gaps" type="geojson" data={data}>
        <Layer
          id="live-gaps-line"
          type="line"
          layout={{ "line-cap": "round" }}
          paint={{ "line-color": "#64748b", "line-width": 3, "line-opacity": 0.95, "line-dasharray": [0.5, 2] }}
        />
      </Source>
      {gaps.map((gap) => (
        <Marker
          key={gap.from.time}
          latitude={(gap.from.latitude + gap.to.latitude) / 2}
          longitude={(gap.from.longitude + gap.to.longitude) / 2}
          anchor="center"
          style={{ pointerEvents: "none", zIndex: 4 }}
        >
          <span className="rounded-full border border-slate-300 bg-white/95 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-700 shadow">
            No signal · {formatDuration(gap.ms / 60_000)}
          </span>
        </Marker>
      ))}
    </>
  )
}
