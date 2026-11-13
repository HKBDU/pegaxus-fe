import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuthStore } from "@/features/auth/store"
import { isNotificationVisibleToPrincipal, notificationApi, useNotificationStore } from "@/shared/realtime"
import { captureNotificationSession, isNotificationSessionCurrent } from "@/shared/realtime/session"

/** The BE has no search / type / read filters: only `unreadOnly`. The page filters the fetched rows. */
export function useNotificationList({ unreadOnly = false, pageSize = 20, enabled = true }: { unreadOnly?: boolean; pageSize?: number; enabled?: boolean } = {}) {
  const signedIn = useAuthStore((state) => Boolean(state.accessToken))
  const sessionVersion = useAuthStore((state) => state.sessionVersion)
  return useQuery({
    queryKey: ["notifications", "list", sessionVersion, unreadOnly, pageSize],
    queryFn: async ({ signal }) => {
      const owner = captureNotificationSession()
      const page = await notificationApi.list({ pageIndex: 1, pageSize, unreadOnly }, signal)
      if (!isNotificationSessionCurrent(owner)) throw new DOMException("Session changed", "AbortError")
      const principal = owner.principal
      return { ...page, items: page.items.filter((item) => isNotificationVisibleToPrincipal(item, principal)) }
    },
    enabled: signedIn && enabled,
    staleTime: 30_000,
  })
}

/** After a write the BE is the truth for the badge: re-read the count instead of trusting local arithmetic. */
async function refreshUnreadCount(owner = captureNotificationSession()) {
  if (!isNotificationSessionCurrent(owner)) return
  try {
    const principal = owner.principal
    if (principal?.roles.includes("CUSTOMER")) {
      const page = await notificationApi.list({ pageSize: 100, unreadOnly: true })
      if (!isNotificationSessionCurrent(owner)) return
      useNotificationStore.getState().setUnreadCount(
        page.items.filter((item) => isNotificationVisibleToPrincipal(item, principal)).length,
      )
      return
    }
    const count = await notificationApi.unreadCount()
    if (isNotificationSessionCurrent(owner)) useNotificationStore.getState().setUnreadCount(count)
  } catch {
    // keep the optimistic value
  }
}

/** Opening a notification marks it read. Receiving the push is not "read" (BE rule). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.markRead(notificationId),
    onMutate: (notificationId) => {
      const owner = captureNotificationSession()
      if (isNotificationSessionCurrent(owner)) useNotificationStore.getState().markRead(notificationId)
      return owner
    },
    onError: (_error, _id, owner) => { if (owner && isNotificationSessionCurrent(owner)) toast.error("Could not mark the notification as read.") },
    onSettled: async (_data, _error, _id, owner) => {
      if (!owner || !isNotificationSessionCurrent(owner)) return
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
      await refreshUnreadCount(owner)
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onMutate: () => {
      const owner = captureNotificationSession()
      if (isNotificationSessionCurrent(owner)) useNotificationStore.getState().markAllRead()
      return owner
    },
    onError: (_error, _variables, owner) => { if (owner && isNotificationSessionCurrent(owner)) toast.error("Could not mark all notifications as read.") },
    onSettled: async (_data, _error, _variables, owner) => {
      if (!owner || !isNotificationSessionCurrent(owner)) return
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
      await refreshUnreadCount(owner)
    },
  })
}
