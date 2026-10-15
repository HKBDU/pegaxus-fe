import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr"
import { env } from "@/lib/env"
import type { RealtimeConnectionState, RealtimeEventMap, RealtimeEventName } from "./types"

/**
 * The ONE SignalR connection of the app (`/hubs/notifications`). Nothing outside `shared/realtime` creates a
 * HubConnection: features subscribe with `useRealtimeEvent` and never touch the connection.
 *
 * The hub lives on the API host, not under `/api/v1`, so the URL is derived from VITE_API_URL
 * (override with VITE_SIGNALR_HUB_URL).
 */
export const HUB_URL: string =
  (import.meta.env.VITE_SIGNALR_HUB_URL as string | undefined) || `${new URL(env.API_URL).origin}/hubs/notifications`

type Handler<K extends RealtimeEventName> = (payload: RealtimeEventMap[K]) => void

/** Keep retrying forever (0s, 2s, 5s, 10s, then every 30s): the default policy gives up after four attempts. */
const RETRY_DELAYS_MS = [0, 2_000, 5_000, 10_000]
const retryPolicy = {
  nextRetryDelayInMilliseconds: ({ previousRetryCount }: { previousRetryCount: number }) =>
    RETRY_DELAYS_MS[previousRetryCount] ?? 30_000,
}

class NotificationHub {
  private connection: HubConnection | null = null
  private state: RealtimeConnectionState = "idle"
  private readonly handlers = new Map<RealtimeEventName, Set<Handler<RealtimeEventName>>>()
  private readonly stateListeners = new Set<(state: RealtimeConnectionState) => void>()
  private readonly reconnectListeners = new Set<() => void>()
  /** start/stop calls are queued so React StrictMode's double mount cannot overlap them. */
  private queue: Promise<void> = Promise.resolve()

  getState() {
    return this.state
  }

  /** Subscribe to connection state changes. Returns the unsubscribe function. */
  onStateChange(listener: (state: RealtimeConnectionState) => void) {
    this.stateListeners.add(listener)
    return () => void this.stateListeners.delete(listener)
  }

  /** Runs after the first connect AND after every automatic reconnect: the place to re-fetch what was missed. */
  onConnected(listener: () => void) {
    this.reconnectListeners.add(listener)
    return () => void this.reconnectListeners.delete(listener)
  }

  /** Subscribe to a hub event (works before and after the connection starts). Returns the unsubscribe function. */
  on<K extends RealtimeEventName>(event: K, handler: Handler<K>) {
    const set = this.handlers.get(event) ?? new Set()
    set.add(handler as Handler<RealtimeEventName>)
    this.handlers.set(event, set)
    return () => void set.delete(handler as Handler<RealtimeEventName>)
  }

  /** Open the connection. `getAccessToken` is called on every (re)connect so a refreshed JWT is always used. */
  start(getAccessToken: () => string | null | undefined) {
    return this.enqueue(async () => {
      if (this.connection) return
      const connection = new HubConnectionBuilder()
        .withUrl(HUB_URL, { accessTokenFactory: () => getAccessToken() ?? "" })
        .withAutomaticReconnect(retryPolicy)
        .configureLogging(import.meta.env.DEV ? LogLevel.Warning : LogLevel.Error)
        .build()

      for (const event of ["ReceiveNotification", "BookingEditingStarted", "BookingEditingStopped"] as const) {
        connection.on(event, (payload) => this.handlers.get(event)?.forEach((handler) => handler(payload)))
      }
      connection.onreconnecting(() => this.setState("reconnecting"))
      connection.onreconnected(() => {
        this.setState("connected")
        this.reconnectListeners.forEach((listener) => listener())
      })
      connection.onclose(() => this.setState("disconnected"))

      this.connection = connection
      this.setState("connecting")
      try {
        await connection.start()
        this.setState("connected")
        this.reconnectListeners.forEach((listener) => listener())
      } catch (error) {
        // e.g. BE down or 401: leave the app usable; REST still works. The next login / token change starts again.
        console.warn("[realtime] could not connect to the notification hub", error)
        this.connection = null
        this.setState("disconnected")
      }
    })
  }

  /** Close the connection (logout, account switch). */
  stop() {
    return this.enqueue(async () => {
      const connection = this.connection
      this.connection = null
      if (connection && connection.state !== HubConnectionState.Disconnected) await connection.stop()
      this.setState("idle")
    })
  }

  /** Tell the BE the push arrived (PENDING -> DELIVERED). Never throws: a failed ack must not break the UI. */
  async acknowledgeDelivered(notificationId: string) {
    const connection = this.connection
    if (!connection || connection.state !== HubConnectionState.Connected) return false
    try {
      await connection.invoke("AcknowledgeDelivered", notificationId)
      return true
    } catch (error) {
      console.warn("[realtime] AcknowledgeDelivered failed", error)
      return false
    }
  }

  private enqueue(task: () => Promise<void>) {
    this.queue = this.queue.then(task, task)
    return this.queue
  }

  private setState(state: RealtimeConnectionState) {
    this.state = state
    this.stateListeners.forEach((listener) => listener(state))
  }
}

export const notificationHub = new NotificationHub()
