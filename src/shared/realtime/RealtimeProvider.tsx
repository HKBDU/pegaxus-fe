import { useEffect, type ReactNode } from "react"
import { toast } from "sonner"
import { useAuthStore } from "@/features/auth/store"
import { queryClient } from "@/lib/queryClient"
import { notificationHub } from "./hub"
import { notificationApi } from "./notification-api"
import { resolveNotificationPath } from "./notification-routes"
import { isNotificationVisibleToPrincipal } from "./notification-policy"
import { useNotificationStore } from "./notification-store"
import type { AppNotification } from "./types"

interface RealtimeProviderProps {
  children: ReactNode
  /** Used when the user clicks a toast. Pass `router.navigate` (the provider sits outside the router). */
  onNavigate?: (path: string) => void
}

/**
 * A pushed notification means something changed on the server (a booking was decided, a dossier moved on, a route plan was
 * confirmed...). Query roots of the screens that show such state are re-read, so the page updates without a manual reload.
 * Catalogue / form sources (fleet, templates, requirements) are left alone so a form being typed in is not reset.
 */
const REFRESH_ON_NOTIFICATION = new Set([
  "bookings",
  "approved-bookings",
  "transport-plans",
  "ongoing-transports",
  "route-view",
  "personnel",
  "dossier",
  "dossier-booking-departure",
  "invoice",
  "handover",
  "horse-health",
])

/**
 * The push can reach the browser before the server has finished writing the change it announces (a payment is recorded,
 * the notification goes out, the invoice row is still UNPAID), so the first re-read may return the old status. Payment
 * pushes are re-read once more after this delay.
 */
const PAYMENT_REREAD_DELAY_MS = 2_000

function isPaymentNotification(notification: AppNotification) {
  return notification.type === "PAYMENT" || notification.referenceType?.toUpperCase() === "INVOICE"
}

function refreshScreensOfServerState() {
  return queryClient.invalidateQueries({ predicate: (query) => REFRESH_ON_NOTIFICATION.has(String(query.queryKey[0])) })
}

/** Re-read what SignalR could not deliver (offline, reconnect): unread count + latest unread rows. */
async function syncFromRest() {
  const store = useNotificationStore.getState()
  try {
    const principal = useAuthStore.getState().principal
    const pageSize = principal?.roles.includes("CUSTOMER") ? 100 : 20
    const [count, page] = await Promise.all([
      principal?.roles.includes("CUSTOMER") ? Promise.resolve(null) : notificationApi.unreadCount(),
      notificationApi.list({ pageSize, unreadOnly: true }),
    ])
    const visible = page.items.filter((item) => isNotificationVisibleToPrincipal(item, principal))
    store.setUnreadCount(count ?? visible.length)
    store.upsert(visible)
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
    // A push sent while the connection was down (sleep, network drop, reconnect) is never replayed, so besides the
    // notifications every open screen of server state (route plan status included) is re-read once it is back.
    const offConnected = notificationHub.onConnected(() => {
      void syncFromRest()
      void refreshScreensOfServerState()
    })
    const rereadTimers = new Set<ReturnType<typeof setTimeout>>()
    const offPush = notificationHub.on("ReceiveNotification", (notification) => {
      const principal = useAuthStore.getState().principal
      if (!isNotificationVisibleToPrincipal(notification, principal)) {
        void notificationHub.acknowledgeDelivered(notification.id)
        return
      }
      const isNew = useNotificationStore.getState().upsert([notification])
      if (isNew && notification.status !== "READ") {
        useNotificationStore.setState((state) => ({ unreadCount: state.unreadCount + 1 }))
        showToast(notification, onNavigate)
      }
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
      void refreshScreensOfServerState()
      if (isPaymentNotification(notification)) {
        const timer = setTimeout(() => {
          rereadTimers.delete(timer)
          void refreshScreensOfServerState()
        }, PAYMENT_REREAD_DELAY_MS)
        rereadTimers.add(timer)
      }
      void notificationHub.acknowledgeDelivered(notification.id)
    })
    const offRoutePlanCancelled = notificationHub.on("RoutePlanCancelled", (event) => {
      void queryClient.invalidateQueries({
        queryKey: ["route-view", "list", event.transportPlanId],
      })
      void queryClient.invalidateQueries({
        queryKey: ["route-view", "detail", event.routePlanId],
      })
    })
    return () => {
      offState()
      offConnected()
      offPush()
      offRoutePlanCancelled()
      rereadTimers.forEach(clearTimeout)
      rereadTimers.clear()
    }
  }, [onNavigate])

  useEffect(() => {
    const token = useAuthStore.getState().accessToken
    if (!signedIn || !token || token.startsWith("demo-")) {
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
