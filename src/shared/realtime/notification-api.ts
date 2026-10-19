import apiClient from "@/lib/axios"
import type { AppNotification } from "./types"

interface Paged<T> {
  items: T[]
  pageIndex: number
  pageSize: number
  totalItems: number
  totalPages: number
}

const unwrap = <T,>(payload: unknown) => (payload as { value: T }).value

/** REST side of the notification feature. SignalR only pushes; the inbox, unread count and read state live here. */
export const notificationApi = {
  async list(params: { pageIndex?: number; pageSize?: number; unreadOnly?: boolean } = {}) {
    const payload = await apiClient.get<unknown, unknown>("notifications", {
      params: { pageIndex: params.pageIndex ?? 1, pageSize: params.pageSize ?? 20, unreadOnly: params.unreadOnly },
    })
    return unwrap<Paged<AppNotification>>(payload)
  },

  async unreadCount() {
    const payload = await apiClient.get<unknown, unknown>("notifications/unread-count")
    return unwrap<{ count: number }>(payload).count
  },

  /** Call when the user OPENS a notification. Receiving a push is not "read". */
  async markRead(notificationId: string) {
    await apiClient.patch(`notifications/${encodeURIComponent(notificationId)}/read`)
  },

  async markAllRead() {
    await apiClient.patch("notifications/read-all")
  },
}
