import { AlertTriangle, Info, WifiOff } from "lucide-react"
import type { RealtimeConnectionState } from "@/shared/realtime"
import { SNAPSHOT_POLL_MS } from "../constants"
import { formatClock } from "../lib/format"
import type { GpsSignal, TrackingSnapshot, TruckSample } from "../types"

interface SignalNoticesProps {
  snapshot: TrackingSnapshot
  truck: TruckSample | null
  signal: GpsSignal
  realtime: boolean
  streamState: RealtimeConnectionState
  streamError: string | null
}

function Notice({ tone, icon, children }: { tone: "warn" | "info" | "error"; icon: React.ReactNode; children: React.ReactNode }) {
  const styles = {
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    info: "border-slate-200 bg-slate-50 text-slate-700",
    error: "border-red-200 bg-red-50 text-red-700",
  }
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded border px-3 py-2 text-xs ${styles[tone]}`}>
      <span aria-hidden="true" className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

/** What the viewer must know besides the map: stale or missing signal, a dropped live connection, the polling mode. */
export function SignalNotices({ snapshot, truck, signal, realtime, streamState, streamError }: SignalNoticesProps) {
  const completed = snapshot.transportStatus === "COMPLETED"
  const started = snapshot.transportStatus === "IN_TRANSIT"
  return (
    <div className="grid gap-2 empty:hidden">
      {completed ? (
        <Notice tone="info" icon={<Info className="size-4" />}>
          This transport is completed.{truck ? ` The last known position (${formatClock(truck.recordedAt)}) is shown.` : ""}
        </Notice>
      ) : null}

      {!completed && !truck ? (
        <Notice tone="info" icon={<Info className="size-4" />}>
          {started
            ? "No signal yet. The vehicle appears here as soon as the driver's first position arrives."
            : "The transport has not started yet. The vehicle appears here once the driver starts sharing the location."}
        </Notice>
      ) : null}

      {!completed && truck && signal !== "LIVE" ? (
        <Notice tone="warn" icon={<AlertTriangle className="size-4" />}>
          {signal === "DELAYED"
            ? `GPS signal is delayed. The last position was received at ${formatClock(truck.recordedAt)}.`
            : `GPS signal interrupted at ${formatClock(truck.recordedAt)}. Showing the last known position; when the signal returns the gap is marked on the map and a new trail starts.`}
        </Notice>
      ) : null}

      {realtime && streamError ? (
        <Notice tone="error" icon={<WifiOff className="size-4" />}>
          Live updates are unavailable: {streamError}
        </Notice>
      ) : null}

      {realtime && !streamError && (streamState === "reconnecting" || streamState === "disconnected") ? (
        <Notice tone="warn" icon={<WifiOff className="size-4" />}>
          The live connection was lost. Reconnecting, positions sent meanwhile will be reloaded.
        </Notice>
      ) : null}

      {!realtime && !completed ? (
        <Notice tone="info" icon={<Info className="size-4" />}>
          Live streaming is off: the position refreshes every {SNAPSHOT_POLL_MS / 1000} seconds while this tab is visible.
        </Notice>
      ) : null}
    </div>
  )
}
