import { useMemo } from "react"
import { Layer, Source } from "react-map-gl/maplibre"
import { trailToGeoJson } from "../lib/trail"
import type { Trail } from "../types"

/** The path the vehicle drove since this tab was opened: dashed light blue, one line per signal-gap-free stroke. */
export function TrailLayer({ trail }: { trail: Trail }) {
  const data = useMemo(() => trailToGeoJson(trail), [trail])
  if (!data.geometry.coordinates.length) return null
  return (
    <Source id="live-trail" type="geojson" data={data}>
      <Layer
        id="live-trail-line"
        type="line"
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{ "line-color": "#38bdf8", "line-width": 4, "line-opacity": 0.9, "line-dasharray": [2, 2] }}
      />
    </Source>
  )
}
