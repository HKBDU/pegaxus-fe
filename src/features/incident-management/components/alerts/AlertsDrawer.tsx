import { useState } from "react"
import { ArrowRight } from "lucide-react"

import { useMarkAllNotificationsRead } from "@/features/notification/hooks"
import { formatNotificationTime, isUnread } from "@/features/notification/utils"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { useNotificationStore, type AppNotification } from "@/shared/realtime"

interface AlertsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (notification: AppNotification) => void
  onViewAll: () => void
}

const priorityStyle: Record<string, { card: string; tag: string; label: string }> = {
  URGENT: { card: "border-red-300 bg-red-50", tag: "bg-red-600 text-white", label: "Urgent" },
  HIGH: { card: "border-amber-300 bg-amber-50", tag: "bg-amber-500 text-slate-950", label: "High" },
  NORMAL: { card: "border-sky-200 bg-sky-50/60", tag: "bg-sky-600 text-white", label: "Normal" },
  LOW: { card: "border-slate-200 bg-white", tag: "bg-slate-500 text-white", label: "Low" },
}

type Tab = "all" | "unread"

/** Right-hand drawer of SCR-F5-004: the latest notifications, coloured by priority; a click opens the target and marks it read. */
export function AlertsDrawer({ open, onOpenChange, onSelect, onViewAll }: AlertsDrawerProps) {
  const [tab, setTab] = useState<Tab>("all")
  const items = useNotificationStore((state) => state.items)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const markAll = useMarkAllNotificationsRead()
  const shown = tab === "unread" ? items.filter(isUnread) : items

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-md" aria-describedby="alerts-drawer-description">
        <SheetHeader className="gap-1 border-b border-slate-200 pr-12">
          <SheetTitle className="m-0! font-heading text-base! font-bold! uppercase tracking-[0.04em]!">Notifications</SheetTitle>
          <SheetDescription id="alerts-drawer-description" className="text-xs">{unreadCount} unread</SheetDescription>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div role="tablist" aria-label="Filter notifications" className="inline-flex rounded-[2px] border border-slate-300 bg-white p-0.5">
              {(["all", "unread"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={cn("rounded-[2px] px-3 py-1 text-xs font-medium capitalize transition-colors", tab === value ? "bg-[#17191c] text-white" : "text-slate-600 hover:bg-slate-100")}
                >
                  {value}
                </button>
              ))}
            </div>
            <button type="button" disabled={unreadCount === 0 || markAll.isPending} onClick={() => markAll.mutate()} className="text-xs font-medium text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40">
              Mark all as read
            </button>
          </div>
        </SheetHeader>

        <ul className="m-0 flex-1 list-none space-y-2 overflow-y-auto p-3">
          {shown.length === 0 ? <li className="py-10 text-center text-xs text-slate-500">{tab === "unread" ? "You are all caught up." : "No notifications yet."}</li> : null}
          {shown.map((notification) => {
            const style = priorityStyle[notification.priority] ?? priorityStyle.NORMAL
            return (
              <li key={notification.id}>
                <button type="button" onClick={() => onSelect(notification)} className={cn("w-full rounded-[2px] border px-3 py-2.5 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary", style.card)}>
                  <span className="flex items-center justify-between gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", style.tag)}>{style.label}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      {formatNotificationTime(notification.createdAt)}
                      {isUnread(notification) ? <span aria-label="Unread" className="size-2 rounded-full bg-amber-500" /> : null}
                    </span>
                  </span>
                  <span className={cn("mt-1 block text-[13px] text-slate-900", isUnread(notification) ? "font-bold" : "font-medium")}>{notification.title}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-slate-600">{notification.message}</span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-slate-200 p-3">
          <button type="button" onClick={onViewAll} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm font-semibold text-[#ef8f00] transition-colors hover:bg-amber-100">
            View all notifications
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
