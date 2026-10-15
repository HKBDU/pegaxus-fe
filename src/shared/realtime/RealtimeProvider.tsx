import { useEffect, type ReactNode } from "react"
import { toast } from "sonner"
import { useAuthStore } from "@/features/auth/store"
import { queryClient } from "@/lib/queryClient"
import { notificationHub } from "./hub"
import { notificationApi } from "./notification-api"
import { resolveNotificationPath } from "./notification-routes"
import { useNotificationStore } from "./notification-store"
import type { AppNotification } from "./types"

interface RealtimeProviderProps {
  children: ReactNode
  /** Used when the user clicks a toast. Pass `router.navigate` (the provider sits outside the router). */
  onNavigate?: (path: string) => void
}

/** Re-read what SignalR could not deliver (offline, reconnect): unread count + latest unread rows. */
async function syncFromRest() {
  const store = useNotificationStore.getState()
  try {
    const [count, page] = await Promise.all([notificationApi.unreadCount(), notificationApi.list({ pageSize: 20, unreadOnly: true })])
    store.setUnreadCount(count)
    store.upsert(page.items)
  } catch (error) {
    console.warn("[realtime] could not sync notifications", error)
  }
}

function showToast(notification: AppNotification, onNavigate?: (path: string) => void) {
  // LOW / NORMAL: bell + inbox only. HIGH: toast. URGENT: toast that stays until dismissed.
  if (notification.priority !== "HIGH" && notification.priority !== "URGENT") return
  const principal = useAuthStore.getState().principal
  const path = resolveNotificationPath(notification, principal)
  const urgent = notification.priority === "URGENT"
  const open = urgent ? toast.warning : toast.info
  open(notification.title, {
    id: notification.id,
    description: notification.message,
    duration: urgent ? Infinity : 8_000,
    action: path && onNavigate ? { label: "Open", onClick: () => onNavigate(path) } : undefined,
  })
}

/**
 * Owns the single SignalR connection: opens it once the user is signed in, closes it on logout / account switch,
 * keeps the notification store in sync (hub push + REST backfill) and acknowledges delivery.
 * Mount it ONCE, inside QueryProvider (see app/App.tsx).
 */
export function RealtimeProvider({ children, onNavigate }: RealtimeProviderProps) {
  const signedIn = useAuthStore((state) => Boolean(state.accessToken))
  // setAuth() bumps this on every login; token refreshes do not, so a refresh never reconnects.
  const sessionVersion = useAuthStore((state) => state.sessionVersion)

  useEffect(() => {
    const store = useNotificationStore.getState()
    const offState = notificationHub.onStateChange(store.setConnection)
    const offConnected = notificationHub.onConnected(() => void syncFromRest())
    const offPush = notificationHub.on("ReceiveNotification", (notification) => {
      const isNew = useNotificationStore.getState().upsert([notification])
      if (isNew && notification.status !== "READ") {
        useNotificationStore.setState((state) => ({ unreadCount: state.unreadCount + 1 }))
        showToast(notification, onNavigate)
      }
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
      void notificationHub.acknowledgeDelivered(notification.id)
    })
    return () => {
      offState()
      offConnected()
      offPush()
    }
  }, [onNavigate])

  useEffect(() => {
    if (!signedIn) {
      void notificationHub.stop()
      useNotificationStore.getState().reset()
      return
    }
    void notificationHub.start(() => useAuthStore.getState().accessToken)
    return () => {
      void notificationHub.stop()
      useNotificationStore.getState().reset()
    }
  }, [signedIn, sessionVersion])

  return <>{children}</>
}
