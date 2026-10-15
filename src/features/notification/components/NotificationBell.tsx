import { ArrowRight, Bell } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { ROLE_ROUTES } from "@/app/route-config"
import { useAuthStore } from "@/features/auth/store"
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationList } from "@/features/notification/hooks"
import { formatNotificationTime, getRelatedLabel, isUnread } from "@/features/notification/utils"
import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { resolveNotificationPath, useUnreadCount, type AppNotification } from "@/shared/realtime"
import { NotificationTypeIcon } from "./NotificationTypeIcon"

const PREVIEW_COUNT = 5

/** Bell of the app headers: live unread badge + the latest notifications, with a link to the full page. */
export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const principal = useAuthStore((state) => state.principal)
  const unread = useUnreadCount()
  const list = useNotificationList({ pageSize: PREVIEW_COUNT, enabled: open })
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const items = list.data?.items ?? []

  function openNotification(notification: AppNotification) {
    if (isUnread(notification)) markRead.mutate(notification.id)
    setOpen(false)
    navigate(resolveNotificationPath(notification, principal) ?? ROLE_ROUTES.notifications)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
          className={cn("relative text-[#d7d9dc] hover:bg-white/10 hover:text-white", className)}
        >
          <Bell className="size-[18px]" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(380px,calc(100vw-1.5rem))] gap-0 rounded-xl border-slate-200 p-0 text-slate-900 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="m-0 text-sm font-bold text-slate-900">Notifications</h2>
          <button
            type="button"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mark all as read
          </button>
        </div>

        <ul className="m-0 max-h-[360px] list-none divide-y divide-slate-100 overflow-y-auto border-y border-slate-100 p-0">
          {list.isLoading ? (
            Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-9 rounded-lg" />
                <Skeleton className="h-8 flex-1" />
              </li>
            ))
          ) : list.isError ? (
            <li className="px-4 py-6 text-center text-xs text-red-600">Unable to load notifications.</li>
          ) : items.length === 0 ? (
            <li className="px-4 py-8 text-center text-xs text-slate-500">You are all caught up.</li>
          ) : (
            items.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                >
                  <NotificationTypeIcon type={notification.type} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13px] text-slate-900", isUnread(notification) ? "font-bold" : "font-medium")}>{notification.title}</span>
                    <span className="block truncate text-xs text-slate-500">{getRelatedLabel(notification) ?? notification.message}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[11px] text-slate-500">{formatNotificationTime(notification.createdAt)}</span>
                    {isUnread(notification) ? <span aria-label="Unread" className="size-2 rounded-full bg-orange-500" /> : <span className="size-2" />}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate(ROLE_ROUTES.notifications)
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-100"
          >
            View all notifications
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
