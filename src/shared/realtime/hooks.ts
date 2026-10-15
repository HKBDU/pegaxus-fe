import { useEffect, useRef } from "react"
import { notificationHub } from "./hub"
import { useNotificationStore } from "./notification-store"
import type { RealtimeEventMap, RealtimeEventName } from "./types"

/**
 * Subscribe a component to a hub event for as long as it is mounted, e.g. an ephemeral event the BE emits:
 *
 *   useRealtimeEvent("BookingEditingStarted", (e) => { if (e.bookingId === id) setLocked(true) })
 *
 * `ReceiveNotification` is already handled once by RealtimeProvider; subscribe to it only for a feature-specific reaction
 * (for example refetching a list), never to build your own inbox.
 */
export function useRealtimeEvent<K extends RealtimeEventName>(event: K, handler: (payload: RealtimeEventMap[K]) => void) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => notificationHub.on(event, (payload) => latest.current(payload)), [event])
}

/** Unread notifications of the signed-in user (for a bell badge). */
export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount)

/** Recent notifications, newest first (for an inbox list). */
export const useNotifications = () => useNotificationStore((state) => state.items)

/** idle | connecting | connected | reconnecting | disconnected */
export const useRealtimeConnectionState = () => useNotificationStore((state) => state.connection)
