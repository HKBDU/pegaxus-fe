import { LocateFixed, MapPinOff, ShieldCheck, TriangleAlert } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { distanceMeters, formatDistance } from "../utils"

/** The handover point and how close the device must be to complete (HO5 `geofence`). */
export interface HandoverTarget {
  latitude: number
  longitude: number
  radiusMeters: number
  name?: string
}

export interface DevicePosition {
  latitude: number
  longitude: number
  accuracy: number
}

export type PositionState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; position: DevicePosition; meters: number | null }
  | { kind: "error"; message: string }

const ERROR_TEXT: Record<number, string> = {
  1: "Location permission was denied. Allow location for this site to check your position.",
  2: "Your position is unavailable right now. Move to open sky and try again.",
  3: "Finding your position took too long. Try again.",
}

/** One-shot read of the device position (`getCurrentPosition`, never `watchPosition`). Rejects with a readable message. */
export function readPosition(): Promise<DevicePosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("This device cannot share its location."))
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      (error) => reject(new Error(ERROR_TEXT[error.code] ?? "Could not read your position.")),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    )
  })
}

/** Metres still to go before the device is inside the radius; 0 when it is inside. */
export const metersOutside = (meters: number, target: HandoverTarget) => Math.max(0, Math.ceil(meters - target.radiusMeters))

/**
 * Position of the person holding the phone against the handover point. It reads once when the form opens (so [Complete]
 * knows whether it may be enabled) and again on demand; the form reads it a last time when the button is pressed.
 */
export function useHandoverPosition(target: HandoverTarget | null) {
  const [state, setState] = useState<PositionState>({ kind: "idle" })
  // Primitives, so a new `target` object with the same point does not read the position again.
  const latitude = target?.latitude
  const longitude = target?.longitude

  const check = useCallback(async () => {
    setState({ kind: "loading" })
    try {
      const position = await readPosition()
      const point = latitude !== undefined && longitude !== undefined ? { latitude, longitude } : null
      setState({ kind: "done", position, meters: point ? distanceMeters(position, point) : null })
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Could not read your position." })
    }
  }, [latitude, longitude])

  useEffect(() => {
    void check()
  }, [check])

  const inside = state.kind === "done" && (!target || (state.meters ?? Infinity) <= target.radiusMeters)
  return { state, check, setState, inside }
}

interface Props {
  target: HandoverTarget | null
  state: PositionState
  onCheck: () => void
  /** true: [Complete] stays off until the device is inside the radius (a geofence exists). */
  required: boolean
}

export function LocationCheck({ target, state, onCheck, required }: Props) {
  if (!target && !required) return null

  const outside = target && state.kind === "done" && state.meters !== null && state.meters > target.radiusMeters
  const radius = target?.radiusMeters ?? 0

  return (
    <section aria-label="Position check" className="rounded-[2px] border border-slate-300 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-heading text-xs font-semibold tracking-[0.06em] text-gray-800 uppercase">Handover point</p>
          <p className="text-sm text-gray-600">{target?.name ?? "Your position is sent with the completion."}</p>
        </div>
        <Button type="button" variant="outline" onClick={onCheck} disabled={state.kind === "loading"} className="min-h-12 shrink-0 gap-2 rounded-[2px] sm:min-h-9">
          <LocateFixed aria-hidden="true" className="size-4" />
          {state.kind === "loading" ? "Locating…" : "Check my position"}
        </Button>
      </div>

      {state.kind === "done" && target && state.meters !== null ? (
        <p role="status" className={cn("mt-3 flex items-start gap-2 rounded-[2px] border px-3 py-2 text-sm", outside ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
          {outside ? <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
          <span>
            {outside
              ? `You are not within ${radius} m of the handover point (${formatDistance(metersOutside(state.meters, target))} to go).`
              : `You are at the handover point (about ${formatDistance(state.meters)} away).`}
            {state.position.accuracy > radius ? ` GPS accuracy is low (±${formatDistance(state.position.accuracy)}).` : ""}
          </span>
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-[2px] border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <MapPinOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.message} Your position is needed to complete the handover.
        </p>
      ) : null}
    </section>
  )
}
