import { Truck } from "lucide-react"
import { Marker } from "react-map-gl/maplibre"
import { cn } from "@/lib/utils"
import { formatClock } from "../lib/format"
import { SIGNAL_LABEL } from "../lib/signal"
import type { GpsSignal, TruckSample } from "../types"

const BADGE: Record<GpsSignal, string> = {
  LIVE: "bg-emerald-600",
  DELAYED: "bg-amber-500",
  LOST: "bg-slate-500",
}
const POINTER: Record<GpsSignal, string> = {
  LIVE: "border-b-emerald-600",
  DELAYED: "border-b-amber-500",
  LOST: "border-b-slate-500",
}

/**
 * The vehicle: a truck badge coloured by signal, with a pointer on its rim turned to the heading (no pointer when the
 * heading is unknown). Pulses while `LIVE`; with a stale signal it says when it was last seen.
 */
export function TruckMarker({
  truck,
  signal,
}: {
  truck: Pick<TruckSample, "latitude" | "longitude" | "headingDegrees" | "recordedAt">
  signal: GpsSignal
}) {
  const heading = truck.headingDegrees
  const hasHeading = typeof heading === "number" && Number.isFinite(heading)
  return (
    <Marker latitude={truck.latitude} longitude={truck.longitude} anchor="center" style={{ zIndex: 5 }}>
      <div className="relative grid size-12 place-items-center" role="img" aria-label={`Vehicle position, GPS signal: ${SIGNAL_LABEL[signal]}`}>
        {signal === "LIVE" ? <span aria-hidden="true" className="absolute inset-0.5 animate-ping rounded-full bg-emerald-500/35 motion-reduce:animate-none" /> : null}
        {hasHeading ? (
          <span aria-hidden="true" className="absolute inset-0" style={{ transform: `rotate(${heading}deg)` }}>
            <span className={cn("absolute top-0 left-1/2 -translate-x-1/2 border-x-[6px] border-b-[10px] border-x-transparent drop-shadow", POINTER[signal])} />
          </span>
        ) : null}
        <span className={cn("relative grid size-[30px] place-items-center rounded-full border-[3px] border-white text-white shadow-lg", BADGE[signal])}>
          <Truck aria-hidden="true" className="size-4" />
        </span>
        {signal !== "LIVE" ? (
          <span className="absolute top-full left-1/2 mt-0.5 -translate-x-1/2 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-slate-700 shadow">
            Last seen {formatClock(truck.recordedAt)}
          </span>
        ) : null}
      </div>
    </Marker>
  )
}
