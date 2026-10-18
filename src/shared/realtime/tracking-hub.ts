import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr"
import { env } from "@/lib/env"
import type { RealtimeConnectionState, TransportLocationUpdate } from "./types"

/**
 * Vehicle positions of ONE transport (`/hubs/transport-tracking`, API contract 7.3). A separate hub from the
 * notification one: the viewer joins a group per transport, so each Tab GPS opens its own short-lived connection
 * and closes it on unmount. Nothing outside `shared/realtime` creates a HubConnection.
 *
 * The BE keeps the group per (transport, account): after EVERY (re)connect `JoinTransport` must be called again,
 * and the caller must reload the GP1 snapshot (`onJoined`) because samples sent meanwhile are not replayed.
 */
export const TRACKING_HUB_URL: string =
  (import.meta.env.VITE_TRACKING_HUB_URL as string | undefined) || `${new URL(env.API_URL).origin}/hubs/transport-tracking`

/** Same policy as the notification hub: retry forever (0s, 2s, 5s, 10s, then every 30s). */
const RETRY_DELAYS_MS = [0, 2_000, 5_000, 10_000]
const retryDelay = (retryCount: number) => RETRY_DELAYS_MS[retryCount] ?? 30_000

/** Join errors the viewer cannot fix by retrying: the connection is closed and the caller shows the error. */
const FATAL_CODES = new Set(["UNAUTHORIZED", "FORBIDDEN", "TRANSPORT_NOT_FOUND"])

/** A `HubException("CODE: message")` thrown by the BE. SignalR wraps it, so the code is parsed out of the text. */
export class TrackingHubError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = "TrackingHubError"
    this.code = code
  }
}

export function parseTrackingHubError(error: unknown): TrackingHubError {
  const text = error instanceof Error ? error.message : String(error)
  const match = /HubException:\s*([A-Z][A-Z_]+):\s*(.*)$/s.exec(text) ?? /\b([A-Z][A-Z_]{3,}):\s*(.*)$/s.exec(text)
  return match ? new TrackingHubError(match[1], match[2].trim()) : new TrackingHubError("TRACKING_HUB_ERROR", text)
}

export interface TransportTrackingHandlers {
  /** Called on every (re)connect so a refreshed JWT is always used. */
  getAccessToken: () => string | null | undefined
  /** One GPS sample of this transport (already filtered by `transportId`). */
  onLocation: (update: TransportLocationUpdate) => void
  onState?: (state: RealtimeConnectionState) => void
  /** After every successful `JoinTransport` (first connect and each reconnect): reload the snapshot. */
  onJoined?: () => void
  /** The BE refused the join (for example 403) or it failed for another reason. */
  onError?: (error: TrackingHubError) => void
}

/** Open the stream for one transport. Returns the cleanup function (leave the group, close the connection). */
export function subscribeTransportTracking(transportId: string, handlers: TransportTrackingHandlers): () => void {
  let disposed = false
  let retryTimer: number | undefined
  let connection: HubConnection | null = null

  const setState = (state: RealtimeConnectionState) => {
    if (!disposed) handlers.onState?.(state)
  }

  const join = async (active: HubConnection) => {
    try {
      await active.invoke("JoinTransport", transportId)
      if (!disposed) handlers.onJoined?.()
    } catch (error) {
      if (disposed) return
      const parsed = parseTrackingHubError(error)
      handlers.onError?.(parsed)
      if (FATAL_CODES.has(parsed.code)) {
        disposed = true
        setState("disconnected")
        await active.stop().catch(() => undefined)
      }
    }
  }

  const connect = async (attempt: number) => {
    if (disposed) return
    const active = new HubConnectionBuilder()
      .withUrl(TRACKING_HUB_URL, { accessTokenFactory: () => handlers.getAccessToken() ?? "" })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: ({ previousRetryCount }) => retryDelay(previousRetryCount) })
      .configureLogging(import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error)
      .build()
    connection = active

    active.on("LocationUpdated", (update: TransportLocationUpdate) => {
      if (update?.transportId === transportId) handlers.onLocation(update)
    })
    active.onreconnecting(() => setState("reconnecting"))
    active.onreconnected(() => {
      setState("connected")
      void join(active)
    })
    active.onclose(() => setState("disconnected"))

    setState(attempt === 0 ? "connecting" : "reconnecting")
    try {
      await active.start()
      if (disposed) {
        await active.stop().catch(() => undefined)
        return
      }
      setState("connected")
      await join(active)
    } catch (error) {
      connection = null
      if (disposed) return
      // First connect failed (BE down, 401, network): try again later; the snapshot (REST) keeps working meanwhile.
      console.warn("[realtime] could not connect to the transport tracking hub", error)
      setState("disconnected")
      retryTimer = window.setTimeout(() => void connect(attempt + 1), retryDelay(attempt))
    }
  }

  void connect(0)

  return () => {
    disposed = true
    window.clearTimeout(retryTimer)
    const active = connection
    connection = null
    if (!active || active.state === HubConnectionState.Disconnected) return
    void (async () => {
      try {
        if (active.state === HubConnectionState.Connected) await active.invoke("LeaveTransport", transportId)
      } catch {
        // Closing the connection removes the group anyway.
      }
      await active.stop().catch(() => undefined)
    })()
  }
}
