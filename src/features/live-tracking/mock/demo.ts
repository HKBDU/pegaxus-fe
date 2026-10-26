import { previewGeoapifyRoute } from "@/shared/utils/map/routing"
import { distanceMeters } from "../lib/geo"

/**
 * DEV-ONLY DEMO of a whole trip (READY -> IN_TRANSIT -> COMPLETED) so the Tab GPS can be looked at while no real
 * transport is in transit. Not backend data. Opened with `?demo=1` or `transportId=demo` on the GPS tab.
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
  speedKmh: number
  isPaused: boolean
  loop: boolean
  signalLossSeconds: number
}

export const DEMO_TRANSPORT_CODE = "TR-DEMO-0001"
export const DEMO_BOOKING_CODE = "REQ-DEMO-0001"
/** Planned average speed, used for planned times and the planned ETA. */
export const PLANNED_KMH = 70
/** The demo vehicle covers this much per tick so a whole trip runs smoothly. */
export const TICK_MS = 1_500

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
  { id: "demo-stop-1", name: "Hanoi Equine Quarantine Facility", type: "STABLE", city: "Hanoi", country: "VN", latitude: 21.0285, longitude: 105.8544 },
  { id: "demo-stop-2", name: "Vinh Transit Rest Stop", type: "REST_STOP", city: "Vinh", country: "VN", latitude: 18.6796, longitude: 105.6813 },
  { id: "demo-stop-3", name: "Hue Equine Inspection Gate", type: "BORDER_GATE", city: "Hue", country: "VN", latitude: 16.4637, longitude: 107.5909 },
  { id: "demo-stop-4", name: "Danang Transit Terminal", type: "STABLE", city: "Danang", country: "VN", latitude: 16.0544, longitude: 108.2022 },
]

export const DEMO_LEGS = DEMO_STOPS.slice(0, -1).map((from, index) => ({
  id: `demo-leg-${index + 1}`,
  order: index + 1,
  from,
  to: DEMO_STOPS[index + 1],
}))

let state: DemoState = {
  phase: "READY",
  silent: false,
  distanceM: 0,
  startedAt: null,
  lastSample: null,
  speedKmh: 60,
  isPaused: false,
  loop: true,
  signalLossSeconds: 0,
}

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
export interface DemoPath {
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
        // Straight line: fallback
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

export function sampleAt(path: DemoPath, distanceM: number, speedOverride?: number): DemoSample {
  return {
    ...positionAt(path, distanceM),
    speedKmh: speedOverride ?? state.speedKmh,
    accuracyMeters: 8,
    recordedAt: new Date().toISOString(),
    routePlanRouteId: DEMO_LEGS[legIndexAt(path, distanceM)].id,
  }
}

export const demoActions = {
  start() {
    if (state.phase !== "READY") {
      setState({ isPaused: false })
      return
    }
    setState({
      phase: "IN_TRANSIT",
      silent: false,
      distanceM: 0,
      startedAt: Date.now(),
      lastSample: null,
      isPaused: false,
      signalLossSeconds: 0,
    })
  },
  pause() {
    setState({ isPaused: true })
  },
  resume() {
    setState({ isPaused: false })
  },
  togglePause() {
    setState({ isPaused: !state.isPaused })
  },
  setSpeed(speedKmh: number) {
    setState({ speedKmh })
  },
  setLoop(loop: boolean) {
    setState({ loop })
  },
  setSilent(silent: boolean) {
    setState({ silent, signalLossSeconds: silent ? 0 : 0 })
  },
  async seekRatio(ratio: number) {
    const path = await loadDemoPath()
    const total = demoTotalMeters(path)
    const distanceM = Math.min(Math.max(0, ratio * total), total)
    const sample = sampleAt(path, distanceM)
    setState({ distanceM, lastSample: sample })
  },
  async jumpNearEnd(metersBeforeEnd = 350) {
    const path = await loadDemoPath()
    const total = demoTotalMeters(path)
    const distanceM = Math.max(0, total - metersBeforeEnd)
    const sample = sampleAt(path, distanceM)
    setState({
      phase: "IN_TRANSIT",
      distanceM,
      lastSample: sample,
      isPaused: false,
    })
  },
  reset() {
    setState({
      phase: "READY",
      silent: false,
      distanceM: 0,
      startedAt: null,
      lastSample: null,
      isPaused: false,
      signalLossSeconds: 0,
    })
  },
  async finish() {
    if (state.phase === "COMPLETED") return
    const path = await loadDemoPath()
    const end = demoTotalMeters(path)
    setState({
      phase: "COMPLETED",
      silent: false,
      distanceM: end,
      startedAt: state.startedAt ?? Date.now(),
      lastSample: sampleAt(path, end),
      isPaused: false,
    })
  },
}

/**
 * One tick of the simulated vehicle: drives on, and returns the sample it sends (null while it is silent, paused,
 * or when this tick ends the trip).
 */
export async function advanceDemo(): Promise<DemoSample | null> {
  if (state.phase !== "IN_TRANSIT" || state.isPaused) return null

  // If silent, increment signal loss timer without emitting location
  if (state.silent) {
    setState({ signalLossSeconds: state.signalLossSeconds + Math.round(TICK_MS / 1000) })
    return null
  }

  const path = await loadDemoPath()
  const total = demoTotalMeters(path)
  
  // Calculate distance covered per tick dynamically based on speed
  const distancePerTick = Math.max(200, Math.round((state.speedKmh / 60) * 2000))
  let distanceM = state.distanceM + distancePerTick

  if (distanceM >= total) {
    if (state.loop) {
      distanceM = 0
    } else {
      distanceM = total
      const sample = sampleAt(path, distanceM)
      setState({ phase: "COMPLETED", silent: false, distanceM, lastSample: sample })
      return sample
    }
  }

  const sample = sampleAt(path, distanceM)
  setState({ distanceM, lastSample: sample })
  return sample
}
