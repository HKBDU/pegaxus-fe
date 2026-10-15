import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuthStore } from "@/features/auth/store"
import { notificationApi, useNotificationStore } from "@/shared/realtime"

/** The BE has no search / type / read filters: only `unreadOnly`. The page filters the fetched rows. */
export function useNotificationList({ unreadOnly = false, pageSize = 20, enabled = true }: { unreadOnly?: boolean; pageSize?: number; enabled?: boolean } = {}) {
  const signedIn = useAuthStore((state) => Boolean(state.accessToken))
  const sessionVersion = useAuthStore((state) => state.sessionVersion)
  return useQuery({
    queryKey: ["notifications", "list", sessionVersion, unreadOnly, pageSize],
    queryFn: () => notificationApi.list({ pageIndex: 1, pageSize, unreadOnly }),
    enabled: signedIn && enabled,
    staleTime: 30_000,
  })
}

/** After a write the BE is the truth for the badge: re-read the count instead of trusting local arithmetic. */
async function refreshUnreadCount() {
  try {
    useNotificationStore.getState().setUnreadCount(await notificationApi.unreadCount())
  } catch {
    // keep the optimistic value
  }
}

/** Opening a notification marks it read. Receiving the push is not "read" (BE rule). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.markRead(notificationId),
    onMutate: (notificationId) => useNotificationStore.getState().markRead(notificationId),
    onError: () => toast.error("Could not mark the notification as read."),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
      await refreshUnreadCount()
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onMutate: () => useNotificationStore.getState().markAllRead(),
    onError: () => toast.error("Could not mark all notifications as read."),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] })
      await refreshUnreadCount()
    },
  })
}
