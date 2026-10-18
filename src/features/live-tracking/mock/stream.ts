import type { TransportTrackingHandlers } from "@/shared/realtime"
import { advanceDemo, TICK_MS } from "./demo"

/** Stand-in for the tracking hub: the simulated vehicle sends a sample every tick while the demo trip is running. */
export function subscribeDemoTracking(transportId: string, handlers: TransportTrackingHandlers) {
  handlers.onState?.("connected")
  // Like a real join: the page reloads GP1 right after it.
  const joined = window.setTimeout(() => handlers.onJoined?.(), 0)
  let busy = false
  const timer = window.setInterval(async () => {
    if (busy) return
    busy = true
    try {
      const sample = await advanceDemo()
      if (sample) handlers.onLocation({ ...sample, transportId })
    } finally {
      busy = false
    }
  }, TICK_MS)
  return () => {
    window.clearTimeout(joined)
    window.clearInterval(timer)
  }
}
