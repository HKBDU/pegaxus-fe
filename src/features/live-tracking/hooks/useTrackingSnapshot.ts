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
  useEffect(() => {
    handler.current = onSnapshot
  })
  return useQuery({
    queryKey: trackingKeys.snapshot(transportId),
    queryFn: async ({ signal }) => {
      const snapshot = await trackingService.getSnapshot(transportId, signal)
      handler.current?.(snapshot)
      return snapshot
    },
    enabled: transportId.length > 0,
    // Samples go stale in seconds: never serve a cached snapshot as fresh when the tab is opened again.
    staleTime: 0,
    gcTime: 60_000,
    refetchOnWindowFocus: polling,
    refetchInterval: polling ? () => (document.hidden ? false : SNAPSHOT_POLL_MS) : false,
    retry: (count, error) => count < 2 && isRetryableTrackingError(error),
  })
}
