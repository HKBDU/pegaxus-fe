import { LocateFixed, MapPinOff, ShieldCheck, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { HANDOVER_GEOFENCE_METERS } from "../constants"
import { distanceMeters, formatDistance } from "../utils"

interface Props {
  target: { latitude: number; longitude: number; name?: string } | null
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; meters: number; accuracy: number }
  | { kind: "error"; message: string }

const ERROR_TEXT: Record<number, string> = {
  1: "Location permission was denied. Allow location for this site to check your position.",
  2: "Your position is unavailable right now. Move to open sky and try again.",
  3: "Finding your position took too long. Try again.",
}

/**
 * One-shot position check (`getCurrentPosition`, never `watchPosition`): is the person holding the phone at the handover
 * point? It is advisory: the BE has no distance rule for signing, so a far result warns but never blocks the signature.
 */
export function LocationCheck({ target }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" })
  if (!target) return null

  const check = () => {
    if (!("geolocation" in navigator)) {
      setState({ kind: "error", message: "This device cannot share its location." })
      return
    }
    setState({ kind: "loading" })
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setState({
          kind: "done",
          meters: distanceMeters(position.coords, target),
          accuracy: position.coords.accuracy,
        }),
      (error) => setState({ kind: "error", message: ERROR_TEXT[error.code] ?? "Could not read your position." }),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    )
  }

  const near = state.kind === "done" && state.meters <= HANDOVER_GEOFENCE_METERS

  return (
    <section aria-label="Position check" className="rounded-[2px] border border-slate-300 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="font-heading text-xs font-semibold tracking-[0.06em] text-gray-800 uppercase">Handover point</p>
          <p className="text-sm text-gray-600">{target.name ?? "Check that you are at the handover point before signing."}</p>
        </div>
        <Button type="button" variant="outline" onClick={check} disabled={state.kind === "loading"} className="min-h-12 shrink-0 gap-2 rounded-[2px] sm:min-h-9">
          <LocateFixed aria-hidden="true" className="size-4" />
          {state.kind === "loading" ? "Locating…" : state.kind === "idle" ? "Check my position" : "Check again"}
        </Button>
      </div>

      {state.kind === "done" ? (
        <p role="status" className={cn("mt-3 flex items-start gap-2 rounded-[2px] border px-3 py-2 text-sm", near ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-900")}>
          {near ? <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />}
          <span>
            {near
              ? `You are at the handover point (about ${formatDistance(state.meters)} away).`
              : `You are about ${formatDistance(state.meters)} from the handover point, beyond ${HANDOVER_GEOFENCE_METERS} m. You can still sign, but make sure this is the right place.`}
            {state.accuracy > HANDOVER_GEOFENCE_METERS ? ` GPS accuracy is low (±${formatDistance(state.accuracy)}).` : ""}
          </span>
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-[2px] border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <MapPinOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {state.message} You can still sign.
        </p>
      ) : null}
    </section>
  )
}
