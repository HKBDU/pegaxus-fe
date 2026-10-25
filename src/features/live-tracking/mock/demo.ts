import { previewGeoapifyRoute } from "@/shared/utils/map/routing"
import { distanceMeters } from "../lib/geo"

/**
 * DEV-ONLY DEMO of a whole trip (READY -> IN_TRANSIT -> COMPLETED) so the Tab GPS can be looked at while no real
 * transport is in transit. Not backend data. Opened with `?demo=1` on the GPS tab; never reachable in a production
 * build. Delete this folder and the four `isDemoMode()` branches (services.ts, streams.ts, GpsTabPage.tsx, constants.ts)
 * to remove it.
 */
export type DemoPhase = "READY" | "IN_TRANSIT" | "COMPLETED"

export interface DemoSample {
  latitude: number
  longitude: number
  headingDegrees: number
  speedKmh: number
  accuracyMeters: number
  recordedAt: string
  routePlanRouteId: string
}

export interface DemoState {
  phase: DemoPhase
  /** The vehicle stopped sending samples (GP2 not arriving). */
  silent: boolean
  /** Distance driven along the whole route. */
  distanceM: number
  startedAt: number | null
  /** What the BE would hold in memory: the newest sample it received. */
  lastSample: DemoSample | null
}

export const DEMO_TRANSPORT_CODE = "TR-DEMO-0001"
export const DEMO_BOOKING_CODE = "REQ-DEMO-0001"
/** Planned average speed, used for planned times and the planned ETA. */
export const PLANNED_KMH = 70
/** The demo vehicle covers this much per tick so a whole trip takes about 3.5 minutes (long enough to cut the signal for over 2 min). */
export const TICK_MS = 1_500
export const TICK_DISTANCE_M = 3_500
const REPORTED_SPEED_KMH = 82

interface Stop {
  id: string
  name: string
  type: string
  city: string
  country: string
  latitude: number
  longitude: number
}

export const DEMO_STOPS: Stop[] = [
  { id: "demo-stop-1", name: "Haras de Paris", type: "STABLE", city: "Paris", country: "FR", latitude: 48.8566, longitude: 2.3522 },
  { id: "demo-stop-2", name: "Lille Rest Area", type: "REST_STOP", city: "Lille", country: "FR", latitude: 50.6292, longitude: 3.0573 },
  { id: "demo-stop-3", name: "Brussels Border Gate", type: "BORDER_GATE", city: "Brussels", country: "BE", latitude: 50.8503, longitude: 4.3517 },
  { id: "demo-stop-4", name: "The Hague Stables", type: "STABLE", city: "The Hague", country: "NL", latitude: 52.0705, longitude: 4.3007 },
]

export const DEMO_LEGS = DEMO_STOPS.slice(0, -1).map((from, index) => ({
  id: `demo-leg-${index + 1}`,
  order: index + 1,
  from,
  to: DEMO_STOPS[index + 1],
}))

let state: DemoState = { phase: "READY", silent: false, distanceM: 0, startedAt: null, lastSample: null }
const listeners = new Set<() => void>()

export const getDemoState = () => state
export function subscribeDemo(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function setState(patch: Partial<DemoState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

interface PathPoint {
  latitude: number
  longitude: number
  /** Meters from the start. */
  at: number
}
interface DemoPath {
  points: PathPoint[]
  /** Distance at the end of each leg. */
  legEnds: number[]
}

let pathPromise: Promise<DemoPath> | null = null

/** The road line of each leg (Geoapify, like the map), joined; straight lines when routing is not available. */
export function loadDemoPath(): Promise<DemoPath> {
  pathPromise ??= (async () => {
    const points: PathPoint[] = []
    const legEnds: number[] = []
    let total = 0
    for (const leg of DEMO_LEGS) {
      let line: Array<{ latitude: number; longitude: number }> = [leg.from, leg.to]
      try {
        const route = await previewGeoapifyRoute(leg.from, leg.to)
        const coordinates = route.geometry.type === "LineString" ? route.geometry.coordinates : route.geometry.coordinates.flat()
        if (coordinates.length > 1) line = coordinates.map(([longitude, latitude]) => ({ latitude, longitude }))
      } catch {
        // Straight line: good enough for a demo.
      }
      for (const point of line) {
        const previous = points.at(-1)
        if (previous) total += distanceMeters(previous, point)
        points.push({ ...point, at: total })
      }
      legEnds.push(total)
    }
    return { points, legEnds }
  })()
  return pathPromise
}

export const demoTotalMeters = (path: DemoPath) => path.legEnds.at(-1) ?? 0

/** Index of the leg a distance falls in (the last leg once past the end). */
export function legIndexAt(path: DemoPath, distanceM: number) {
  const index = path.legEnds.findIndex((end) => distanceM < end)
  return index === -1 ? DEMO_LEGS.length - 1 : index
}

function bearing(a: PathPoint, b: PathPoint) {
  const rad = Math.PI / 180
  const y = Math.sin((b.longitude - a.longitude) * rad) * Math.cos(b.latitude * rad)
  const x =
    Math.cos(a.latitude * rad) * Math.sin(b.latitude * rad) -
    Math.sin(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.cos((b.longitude - a.longitude) * rad)
  return (Math.atan2(y, x) / rad + 360) % 360
}

export function positionAt(path: DemoPath, distanceM: number) {
  const { points } = path
  const target = Math.min(Math.max(distanceM, 0), demoTotalMeters(path))
  let index = points.findIndex((point) => point.at >= target)
  if (index <= 0) index = 1
  const a = points[index - 1]
  const b = points[index]
  const span = b.at - a.at || 1
  const ratio = Math.min(1, Math.max(0, (target - a.at) / span))
  return {
    latitude: a.latitude + (b.latitude - a.latitude) * ratio,
    longitude: a.longitude + (b.longitude - a.longitude) * ratio,
    headingDegrees: Math.round(bearing(a, b)),
  }
}

function sampleAt(path: DemoPath, distanceM: number): DemoSample {
  return {
    ...positionAt(path, distanceM),
    speedKmh: REPORTED_SPEED_KMH,
    accuracyMeters: 8,
    recordedAt: new Date().toISOString(),
    routePlanRouteId: DEMO_LEGS[legIndexAt(path, distanceM)].id,
  }
}

export const demoActions = {
  start() {
    if (state.phase !== "READY") return
    setState({ phase: "IN_TRANSIT", silent: false, distanceM: 0, startedAt: Date.now(), lastSample: null })
  },
  setSilent(silent: boolean) {
    if (state.phase === "IN_TRANSIT") setState({ silent })
  },
  async finish() {
    if (state.phase === "COMPLETED") return
    const path = await loadDemoPath()
    const end = demoTotalMeters(path)
    setState({ phase: "COMPLETED", silent: false, distanceM: end, startedAt: state.startedAt ?? Date.now(), lastSample: sampleAt(path, end) })
  },
}

/**
 * One tick of the simulated vehicle: drives on, and returns the sample it sends (null while it is silent, not moving,
 * or when this tick ends the trip).
 */
export async function advanceDemo(): Promise<DemoSample | null> {
  if (state.phase !== "IN_TRANSIT") return null
  const path = await loadDemoPath()
  const distanceM = Math.min(state.distanceM + TICK_DISTANCE_M, demoTotalMeters(path))
  const sample = sampleAt(path, distanceM)
  if (distanceM >= demoTotalMeters(path)) {
    // Arriving ends the trip: the final position is reported even if the signal had been cut.
    setState({ phase: "COMPLETED", silent: false, distanceM, lastSample: sample })
    return sample
  }
  setState({ distanceM, lastSample: state.silent ? state.lastSample : sample })
  return state.silent ? null : sample
}
