import { useEffect, useReducer, useRef, useState } from "react"
import type { RealtimeConnectionState } from "@/shared/realtime"
import { FEATURES, SIGNAL_TICK_MS, SNAPSHOT_REFRESH_MIN_MS } from "../constants"
import { gpsSignal } from "../lib/signal"
import { appendTrailPoint, toTrailPoint } from "../lib/trail"
import { locationUpdateSchema } from "../schemas"
import { openTrackingStream } from "../streams"
import type { Trail, TrackingSnapshot, TruckSample } from "../types"
import { useNow } from "./useNow"
import { useTrackingSnapshot } from "./useTrackingSnapshot"

interface LiveState {
  trail: Trail
  /** The newest sample seen, whether it came from GP1 or from the stream. */
  latest: TruckSample | null
  /** server time - client time at the last GP1 answer: the stream carries no server time of its own. */
  skewMs: number
}

type LiveAction = { type: "sample"; sample: TruckSample } | { type: "snapshot"; snapshot: TrackingSnapshot; receivedAt: number }

const initialState: LiveState = { trail: [], latest: null, skewMs: 0 }

function addSample(state: LiveState, sample: TruckSample): LiveState {
  const point = toTrailPoint(sample)
  if (!point) return state
  const newer = !state.latest || point.time > Date.parse(state.latest.recordedAt)
  return { ...state, trail: appendTrailPoint(state.trail, point), latest: newer ? sample : state.latest }
}

function reducer(state: LiveState, action: LiveAction): LiveState {
  if (action.type === "sample") return addSample(state, action.sample)
  const serverTime = Date.parse(action.snapshot.serverTime)
  const next = Number.isFinite(serverTime) ? { ...state, skewMs: serverTime - action.receivedAt } : state
  return action.snapshot.truck ? addSample(next, action.snapshot.truck) : next
}

/**
 * Everything the Tab GPS needs about the vehicle: GP1 snapshot, the samples that follow (hub, or GP1 polling when the
 * stream flag is off), the trail drawn from them, and the signal state. Mount it under a `key` of the transport id.
 */
export function useLiveTruck(transportId: string) {
  const realtime = FEATURES.realtimeStream
  const [live, dispatch] = useReducer(reducer, initialState)
  const [streamState, setStreamState] = useState<RealtimeConnectionState>("idle")
  const [streamError, setStreamError] = useState<string | null>(null)
  const legRef = useRef<string | null>(null)
  const refreshedAtRef = useRef(0)
  const now = useNow(SIGNAL_TICK_MS)

  const query = useTrackingSnapshot(transportId, !realtime, (snapshot) => {
    legRef.current = snapshot.truck?.routePlanRouteId ?? legRef.current
    dispatch({ type: "snapshot", snapshot, receivedAt: Date.now() })
  })
  const { refetch } = query
  // The stream only needs to run once GP1 accepted the viewer; a refused request (403, wrong status) has nothing to stream.
  const streamEnabled = realtime && query.data !== undefined

  useEffect(() => {
    if (!streamEnabled) return
    return openTrackingStream(transportId, {
      onLocation: (update) => {
        const parsed = locationUpdateSchema.safeParse(update)
        if (!parsed.success) return
        const { transportId: _ignored, ...sample } = parsed.data
        dispatch({ type: "sample", sample })
        // A sample of another leg means the next stop and the planned ETA changed: GP1 is the only source of those.
        const leg = sample.routePlanRouteId ?? null
        if (leg && legRef.current && leg !== legRef.current && Date.now() - refreshedAtRef.current > SNAPSHOT_REFRESH_MIN_MS) {
          refreshedAtRef.current = Date.now()
          void refetch()
        }
        legRef.current = leg ?? legRef.current
      },
      onState: setStreamState,
      onJoined: () => {
        setStreamError(null)
        // Samples sent while disconnected are not replayed: reload the snapshot after every join.
        refreshedAtRef.current = Date.now()
        void refetch()
      },
      onError: (error) => setStreamError(error.message),
    })
  }, [refetch, streamEnabled, transportId])

  const signal = gpsSignal(live.latest?.recordedAt, now, live.skewMs)
  return { query, snapshot: query.data, truck: live.latest, trail: live.trail, signal, now, skewMs: live.skewMs, streamState, streamError }
}
