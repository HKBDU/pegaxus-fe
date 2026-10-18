import { previewGeoapifyRoute, type RoutingPoint } from "@/shared/utils/map/routing"
import type { RouteEstimate } from "../types"
import type { StopPoint } from "./route-stops"

type Leg = { km: number; minutes: number }

/** Legs between two stops never change while the plan stays the same, so they are fetched once per page visit. */
const stopLegs = new Map<string, Promise<Leg>>()

function stopLeg(from: StopPoint, to: StopPoint): Promise<Leg> {
  const key = `${from.id}>${to.id}`
  const cached = stopLegs.get(key)
  if (cached) return cached
  // No abort signal on purpose: the answer is shared by later calls, so one cancelled caller must not fail them.
  const request = previewGeoapifyRoute(from, to).then(
    (route): Leg => ({ km: route.distanceKm, minutes: route.durationMinutes }),
    (error: unknown) => {
      stopLegs.delete(key)
      throw error
    },
  )
  stopLegs.set(key, request)
  return request
}

/**
 * Road distance and time still to drive (O-F4-25): from the vehicle to the next stop, then through the remaining
 * stops to the destination. The BE only sends the planned ETA, so this is computed here with Geoapify routing.
 */
export async function estimateRemaining(
  vehicle: RoutingPoint,
  stops: StopPoint[],
  signal?: AbortSignal,
): Promise<Omit<RouteEstimate, "computedAt"> | null> {
  if (!stops.length) return null
  const [first, ...later] = stops
  const [toNext, laterLegs] = await Promise.all([
    previewGeoapifyRoute(vehicle, first, signal),
    Promise.all(later.map((stop, index) => stopLeg(stops[index], stop))),
  ])
  return {
    nextStopKm: toNext.distanceKm,
    nextStopMinutes: toNext.durationMinutes,
    destinationKm: toNext.distanceKm + laterLegs.reduce((sum, leg) => sum + leg.km, 0),
    destinationMinutes: toNext.durationMinutes + laterLegs.reduce((sum, leg) => sum + leg.minutes, 0),
  }
}
