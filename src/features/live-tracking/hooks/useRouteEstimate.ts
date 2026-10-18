import { useEffect, useRef, useState } from "react"
import { ESTIMATE_MIN_INTERVAL_MS, ESTIMATE_MIN_MOVE_METERS } from "../constants"
import { estimateRemaining } from "../lib/eta"
import { distanceMeters } from "../lib/geo"
import type { StopPoint } from "../lib/route-stops"
import type { RouteEstimate, TruckSample } from "../types"

/**
 * Remaining road distance and ETA from the vehicle to the next stop and the destination (O-F4-25). Geoapify routing is
 * called again only after the vehicle moved 500 m AND 30 s passed (or the stops changed), and the previous request is
 * cancelled when a new one starts.
 */
export function useRouteEstimate(truck: TruckSample | null, stops: StopPoint[]) {
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null)
  const [failed, setFailed] = useState(false)
  const last = useRef<{ latitude: number; longitude: number; at: number; stops: StopPoint[] } | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!truck || !stops.length) return
    const previous = last.current
    const settled =
      previous &&
      previous.stops === stops &&
      distanceMeters(previous, truck) < ESTIMATE_MIN_MOVE_METERS
    const tooSoon = previous && Date.now() - previous.at < ESTIMATE_MIN_INTERVAL_MS && previous.stops === stops
    if (settled || tooSoon) return

    last.current = { latitude: truck.latitude, longitude: truck.longitude, at: Date.now(), stops }
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    estimateRemaining(truck, stops, request.signal)
      .then((result) => {
        if (request.signal.aborted) return
        setEstimate(result ? { ...result, computedAt: Date.now() } : null)
        setFailed(false)
      })
      .catch(() => {
        if (!request.signal.aborted) setFailed(true)
      })
  }, [truck, stops])

  useEffect(() => () => controller.current?.abort(), [])

  return { estimate: truck && stops.length ? estimate : null, failed }
}
