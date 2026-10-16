import { create } from "zustand"
import type { AppNotification, RealtimeConnectionState } from "./types"

const MAX_ITEMS = 50

interface NotificationState {
  connection: RealtimeConnectionState
  unreadCount: number
  /** Newest first, capped. Filled from REST on (re)connect and from the hub in real time. */
  items: AppNotification[]
  setConnection: (connection: RealtimeConnectionState) => void
  setUnreadCount: (count: number) => void
  /** Merge by id (the hub and REST can deliver the same row). Returns true when the row is new. */
  upsert: (notifications: AppNotification[]) => boolean
  markRead: (notificationId: string) => void
  markAllRead: () => void
  reset: () => void
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  connection: "idle",
  unreadCount: 0,
  items: [],
  setConnection: (connection) => set({ connection }),
  setUnreadCount: (unreadCount) => set({ unreadCount: Math.max(0, unreadCount) }),
  upsert: (incoming) => {
    const known = new Set(get().items.map((item) => item.id))
    const fresh = incoming.some((item) => !known.has(item.id))
    set((state) => {
      const byId = new Map(state.items.map((item) => [item.id, item]))
      for (const item of incoming) byId.set(item.id, { ...byId.get(item.id), ...item })
      const items = [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_ITEMS)
      return { items }
    })
    return fresh
  },
  markRead: (notificationId) =>
    set((state) => {
      const target = state.items.find((item) => item.id === notificationId)
      const wasUnread = target ? target.status !== "READ" : false
      return {
        items: state.items.map((item) => (item.id === notificationId ? { ...item, status: "READ" as const } : item)),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      }
    }),
  markAllRead: () => set((state) => ({ unreadCount: 0, items: state.items.map((item) => ({ ...item, status: "READ" as const })) })),
  reset: () => set({ connection: "idle", unreadCount: 0, items: [] }),
}))
