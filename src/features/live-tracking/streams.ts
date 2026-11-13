import { useAuthStore } from "@/features/auth/store"
import { subscribeTransportTracking, type TransportTrackingHandlers } from "@/shared/realtime"
import { isDemoMode } from "./constants"

/** The real tracking hub, or (dev only, `?demo=1`) the demo vehicle. Returns the cleanup function. */
export function openTrackingStream(transportId: string, handlers: Omit<TransportTrackingHandlers, "getAccessToken">) {
  if (import.meta.env.DEV && isDemoMode(transportId)) {
    let cancelled = false
    let cleanup: (() => void) | undefined
    void import("./mock/stream").then((demo) => {
      if (!cancelled) cleanup = demo.subscribeDemoTracking(transportId, { ...handlers, getAccessToken: () => null })
    })
    return () => {
      cancelled = true
      cleanup?.()
    }
  }
  return subscribeTransportTracking(transportId, { ...handlers, getAccessToken: () => useAuthStore.getState().accessToken })
}
