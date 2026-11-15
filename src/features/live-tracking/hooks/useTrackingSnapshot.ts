import { useQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { SNAPSHOT_POLL_MS } from "../constants"
import { isRetryableTrackingError, trackingService } from "../services"
import type { TrackingSnapshot } from "../types"

export const trackingKeys = {
  snapshot: (transportId: string) => ["transport-tracking", "snapshot", transportId] as const,
}

/**
 * GP1. With the WebSocket on it is read once (and again after every hub join); `polling` (flag
 * `realtimeStream = false`) re-reads it every 15 s, but not while the browser tab is hidden (L-06).
 */
export function useTrackingSnapshot(transportId: string, polling: boolean, onSnapshot?: (snapshot: TrackingSnapshot) => void) {
  // Read inside queryFn: every answer (first load, hub rejoin, polling) feeds the live state exactly once.
  const handler = useRef(onSnapshot)
  const failures = useRef(0)
  useEffect(() => {
    handler.current = onSnapshot
  })
  return useQuery({
    queryKey: trackingKeys.snapshot(transportId),
    queryFn: async ({ signal }) => {
      try {
        const snapshot = await trackingService.getSnapshot(transportId, signal)
        failures.current = 0
        handler.current?.(snapshot)
        return snapshot
      } catch (error) {
        if (!signal.aborted) failures.current += 1
        throw error
      }
    },
    enabled: transportId.length > 0,
    // Samples go stale in seconds: never serve a cached snapshot as fresh when the tab is opened again.
    staleTime: 0,
    gcTime: 60_000,
    refetchOnWindowFocus: polling,
    refetchInterval: polling ? (query) =>
      document.hidden || !navigator.onLine ||
        (query.state.error && !isRetryableTrackingError(query.state.error))
        ? false
        : Math.min(SNAPSHOT_POLL_MS * 2 ** failures.current, 120_000)
      : false,
    retry: (count, error) => !polling && count < 2 && isRetryableTrackingError(error),
  })
}
