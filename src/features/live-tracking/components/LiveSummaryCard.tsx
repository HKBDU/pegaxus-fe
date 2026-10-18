import { AlertTriangle, CalendarClock, Clock, Compass, Flag, Gauge, MapPin, Radio, Timer } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { formatClock, formatCoordinates, formatDateTime, formatDuration, formatKm, formatSpeed } from "../lib/format"
import { SIGNAL_LABEL } from "../lib/signal"
import { compassDirection, pickCurrentSegment, segmentProgress } from "../lib/summary"
import type { GpsSignal, RouteEstimate, SegmentDetail, TrackingSnapshot, TransportOverview, TruckSample } from "../types"

const SIGNAL_DOT: Record<GpsSignal, string> = { LIVE: "bg-emerald-500", DELAYED: "bg-amber-500", LOST: "bg-slate-400" }
const SIGNAL_PILL: Record<GpsSignal, string> = {
  LIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  DELAYED: "border-amber-200 bg-amber-50 text-amber-700",
  LOST: "border-slate-200 bg-slate-100 text-slate-600",
}

interface LiveSummaryCardProps {
  overview: TransportOverview | undefined
  segments: SegmentDetail[]
  snapshot: TrackingSnapshot
  truck: TruckSample | null
  signal: GpsSignal
  estimate: RouteEstimate | null
  estimateFailed: boolean
  /** server time - client time, so the ETA clock is the server's. */
  skewMs: number
  now: number
}

function Tile({ icon, label, value, sub }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#e5e2d9] bg-white px-3 py-2.5">
      <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">
        <span aria-hidden="true" className="text-gray-400 [&>svg]:size-3.5">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1 text-sm leading-5 font-semibold break-words text-gray-900">{value}</dd>
      {sub ? <dd className="mt-0.5 text-[11px] leading-4 text-gray-500">{sub}</dd> : null}
    </div>
  )
}

/** "Live Tracking Summary": where the vehicle is, how fast, how far along its leg and when it arrives. */
export function LiveSummaryCard({ overview, segments, snapshot, truck, signal, estimate, estimateFailed, skewMs, now }: LiveSummaryCardProps) {
  const current = pickCurrentSegment(segments)
  const progress = segmentProgress(current, estimate?.nextStopKm ?? null)
  const incidents = overview?.activeIncidents.length ?? 0
  const arrival = (minutes: number) => formatClock((estimate?.computedAt ?? now) + skewMs + minutes * 60_000)
  const remainingMinutes = (minutes: number) => minutes - (now - (estimate?.computedAt ?? now)) / 60_000
  const direction = compassDirection(truck?.headingDegrees)
  const unavailable = estimateFailed ? "Unavailable" : "-"
  const heading = truck?.headingDegrees

  return (
    <section aria-label="Live tracking summary" className="flex h-full flex-col rounded-lg border border-[#e5e2d9] bg-[#faf9f5] p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-heading text-sm! leading-5! font-medium uppercase tracking-[0.06em]">Live Tracking Summary</h2>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", SIGNAL_PILL[signal])}>
          <span aria-hidden="true" className={cn("size-2 rounded-full", SIGNAL_DOT[signal], signal === "LIVE" && "animate-pulse motion-reduce:animate-none")} />
          {SIGNAL_LABEL[signal]}
        </span>
        {incidents > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
            <AlertTriangle aria-hidden="true" className="size-3" />
            {incidents} active {incidents === 1 ? "incident" : "incidents"}
          </span>
        ) : null}
      </header>

      {current ? (
        <div className="mb-3 rounded-lg border border-[#e5e2d9] bg-white px-3 py-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500">Current segment</p>
            {progress !== null ? <p className="text-xs font-semibold text-orange-700">{progress}% completed</p> : null}
          </div>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">
            {current.fromLocation.locationName} → {current.toLocation.locationName}
          </p>
          {progress !== null ? (
            <div
              role="progressbar"
              aria-label="Progress of the current segment"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
            >
              <div className="h-full rounded-full bg-primary transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>
      ) : null}

      <dl className="grid flex-1 auto-rows-fr grid-cols-2 gap-2">
        <Tile icon={<Clock />} label="Last updated" value={truck ? formatDateTime(truck.recordedAt) : "No position yet"} />
        <Tile icon={<MapPin />} label="Coordinates" value={truck ? formatCoordinates(truck.latitude, truck.longitude) : "-"} />
        <Tile icon={<Gauge />} label="Speed" value={formatSpeed(truck?.speedKmh)} />
        <Tile
          icon={<Compass />}
          label="Direction"
          value={direction ?? "-"}
          sub={typeof heading === "number" && Number.isFinite(heading) ? `${Math.round(heading)}°` : undefined}
        />
        <Tile
          icon={<Timer />}
          label="ETA (next stop)"
          value={estimate ? arrival(estimate.nextStopMinutes) : unavailable}
          sub={
            estimate
              ? `${formatDuration(remainingMinutes(estimate.nextStopMinutes))} left · ${formatKm(estimate.nextStopKm)}`
              : snapshot.nextStop?.locationName
          }
        />
        <Tile
          icon={<Radio />}
          label="Connectivity"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("size-2 rounded-full", SIGNAL_DOT[signal])} />
              {SIGNAL_LABEL[signal]}
            </span>
          }
        />
        <Tile
          icon={<Flag />}
          label="To destination"
          value={estimate ? formatKm(estimate.destinationKm) : unavailable}
          sub={estimate ? `ETA ${arrival(estimate.destinationMinutes)}` : undefined}
        />
        <Tile
          icon={<CalendarClock />}
          label="Planned ETA"
          value={snapshot.etaAt ? formatClock(snapshot.etaAt) : "-"}
          sub={`${formatKm(snapshot.plannedRemainingDistanceKm)} planned left`}
        />
      </dl>
    </section>
  )
}
