import { Marker } from "react-map-gl/maplibre"

/** A ring around the stop marker the vehicle is heading to (same anchor as the map's own 16 px stop dots). */
export function NextStopHighlight({ latitude, longitude, name }: { latitude: number; longitude: number; name: string }) {
  return (
    <Marker latitude={latitude} longitude={longitude} anchor="bottom" style={{ pointerEvents: "none" }}>
      <div className="relative size-4" role="img" aria-label={`Next stop: ${name}`}>
        <span aria-hidden="true" className="absolute -inset-2 animate-pulse rounded-full border-2 border-primary motion-reduce:animate-none" />
      </div>
    </Marker>
  )
}
