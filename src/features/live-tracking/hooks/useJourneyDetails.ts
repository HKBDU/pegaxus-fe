import { useQuery } from "@tanstack/react-query"
import { isRetryableTrackingError, trackingService } from "../services"

const REFRESH_MS = 30_000
const refetchInterval = () => (document.hidden ? false : REFRESH_MS)
const retry = (count: number, error: unknown) => count < 1 && isRetryableTrackingError(error)

export const journeyKeys = {
  segments: (transportId: string) => ["transport-tracking", "segments", transportId] as const,
  overview: (transportId: string) => ["transport-tracking", "overview", transportId] as const,
}

/**
 * OT4: the legs with distance, planned/actual times, crew and provider. `enabled` waits for GP1, so a transport the
 * BE refuses to track does not produce three failing requests. Re-read every 30 s like the other transport tabs.
 */
export function useTransportSegments(transportId: string, enabled: boolean) {
  return useQuery({
    queryKey: journeyKeys.segments(transportId),
    queryFn: ({ signal }) => trackingService.getSegments(transportId, signal),
    enabled: enabled && transportId.length > 0,
    staleTime: 15_000,
    refetchInterval,
    retry,
  })
}

/** OT3: transport code and status for the page title, horse welfare and the number of active incidents. */
export function useTransportOverview(transportId: string, enabled: boolean) {
  return useQuery({
    queryKey: journeyKeys.overview(transportId),
    queryFn: ({ signal }) => trackingService.getOverview(transportId, signal),
    enabled: enabled && transportId.length > 0,
    staleTime: 15_000,
    refetchInterval,
    retry,
  })
}
