import { CircleCheck, ChevronRight, Search } from "lucide-react"
import { useMemo, useState, type KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"

import { useAuthStore } from "@/features/auth/store"
import { NotificationTypeIcon } from "@/features/notification/components/NotificationTypeIcon"
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationList } from "@/features/notification/hooks"
import { formatNotificationTime, getRelatedLabel, getTypeMeta, isUnread, NOTIFICATION_TYPES, PRIORITY_CLASSES } from "@/features/notification/utils"
import { cn } from "@/lib/utils"
import { EmptyState, ErrorState } from "@/shared/components/common"
import { TablePagination } from "@/shared/components/common/TablePagination"
import { Input } from "@/shared/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { resolveNotificationPath, useUnreadCount, type AppNotification } from "@/shared/realtime"

type Tab = "all" | "unread" | "read"
const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
]
const FETCH_SIZE = 100 // BE maximum
const PAGE_SIZE = 10
/** Header and body rows share this height. */
const ROW_HEIGHT = "h-14"

/** Full notification list of the signed-in user (every role). The BE only filters `unreadOnly`; the rest is done here. */
export default function NotificationsPage() {
  const navigate = useNavigate()
  const principal = useAuthStore((state) => state.principal)
  const unreadCount = useUnreadCount()
  const [tab, setTab] = useState<Tab>("all")
  const [type, setType] = useState("ALL")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const query = useNotificationList({ unreadOnly: tab === "unread", pageSize: FETCH_SIZE })
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (query.data?.items ?? []).filter(
      (item) =>
        (tab !== "read" || !isUnread(item)) &&
        (type === "ALL" || item.type === type) &&
        (!term || `${item.title} ${item.message} ${getRelatedLabel(item) ?? ""}`.toLowerCase().includes(term)),
    )
  }, [query.data, tab, type, search])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function open(notification: AppNotification) {
    if (isUnread(notification)) markRead.mutate(notification.id)
    const path = resolveNotificationPath(notification, principal)
    if (path) navigate(path)
  }

  function onRowKey(event: KeyboardEvent, notification: AppNotification) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      open(notification)
    }
  }

  const changeTab = (next: Tab) => { setTab(next); setPage(1) }

  return (
    <div className="min-h-[70dvh] px-5 py-8 font-sans sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto w-full max-w-[1280px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 font-heading text-4xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <button
            type="button"
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mark all as read
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200">
          <div role="tablist" aria-label="Notification filter" className="flex gap-6">
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={tab === item.value}
                onClick={() => changeTab(item.value)}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors",
                  tab === item.value ? "border-orange-500 font-bold text-orange-600" : "border-transparent text-slate-500 hover:text-slate-900",
                )}
              >
                {item.label}
                {item.value === "unread" && unreadCount > 0 ? <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">{unreadCount}</span> : null}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pb-3">
            <Select value={type} onValueChange={(value) => { setType(value); setPage(1) }}>
              <SelectTrigger aria-label="Filter by type" className="h-9 w-[150px] bg-white text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                {NOTIFICATION_TYPES.map((value) => <SelectItem key={value} value={value}>{getTypeMeta(value).label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                placeholder="Search notifications..."
                aria-label="Search notifications"
                className="h-9 w-[240px] bg-white pl-9 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden border border-slate-200 bg-white">
          {query.isLoading ? (
            <div className="grid gap-2 p-4">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-14 rounded-none" />)}</div>
          ) : query.isError ? (
            <ErrorState message="Unable to load notifications." onRetry={() => void query.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState message={tab === "unread" ? "No unread notifications." : "No notifications to show."} />
          ) : (
            // Fixed layout + one-line cells: every row is exactly ROW_HEIGHT tall whatever the message length (full text on hover).
            <Table className="table-fixed">
              <colgroup>
                <col className="w-16" />
                <col className="w-[22%]" />
                <col />
                <col className="w-[250px]" />
                <col className="w-[100px]" />
                <col className="w-[100px]" />
                <col className="w-[96px]" />
                <col className="w-10" />
              </colgroup>
              <TableHeader className="[&_tr]:border-0">
                <TableRow className="border-0 bg-slate-50 hover:bg-slate-50">
                  {["Type", "Title", "Message", "Related to", "Time", "Priority", "Status"].map((head) => (
                    <TableHead key={head} className={cn("px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500", ROW_HEIGHT)}>{head}</TableHead>
                  ))}
                  <TableHead className={ROW_HEIGHT}><span className="sr-only">Open</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-0">
                {visible.map((notification) => {
                  const related = getRelatedLabel(notification)
                  const unread = isUnread(notification)
                  return (
                    <TableRow
                      key={notification.id}
                      tabIndex={0}
                      role="link"
                      onClick={() => open(notification)}
                      onKeyDown={(event) => onRowKey(event, notification)}
                      className={cn("cursor-pointer border-0 focus-visible:bg-slate-100 focus-visible:outline-none", ROW_HEIGHT, unread ? "bg-orange-50/40 hover:bg-orange-50" : "hover:bg-slate-50")}
                    >
                      <TableCell className="px-3"><NotificationTypeIcon type={notification.type} className="rounded-[2px]" /></TableCell>
                      <TableCell className={cn("truncate px-3 text-sm text-slate-900", unread ? "font-bold" : "font-medium")} title={notification.title}>{notification.title}</TableCell>
                      <TableCell className="truncate px-3 text-sm text-slate-600" title={notification.message}>{notification.message}</TableCell>
                      <TableCell className="px-3">
                        {related ? <span className="block max-w-full truncate rounded-[2px] bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700" title={related}>{related}</span> : null}
                      </TableCell>
                      <TableCell className="px-3 text-sm text-slate-600">{formatNotificationTime(notification.createdAt)}</TableCell>
                      <TableCell className="px-3">
                        <span className={cn("inline-block rounded-[2px] border px-2 py-0.5 text-[11px] font-bold", PRIORITY_CLASSES[notification.priority])}>{notification.priority}</span>
                      </TableCell>
                      <TableCell className="px-3">
                        {unread ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600"><span aria-hidden="true" className="size-2 rounded-full bg-orange-500" />Unread</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><CircleCheck aria-hidden="true" className="size-3.5" />Read</span>
                        )}
                      </TableCell>
                      <TableCell className="px-1"><ChevronRight aria-hidden="true" className="size-4 text-slate-400" /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
        {rows.length > 0 ? (
          <div className="mt-3">
            <TablePagination
              meta={{
                totalItems: rows.length,
                totalPages,
                itemsPerPage: PAGE_SIZE,
                currentPage,
                hasPreviousPage: currentPage > 1,
                hasNextPage: currentPage < totalPages,
              }}
              onPageChange={setPage}
            />
          </div>
        ) : null}
        {(query.data?.totalItems ?? 0) > FETCH_SIZE ? (
          <p className="mt-2 text-xs text-slate-500">Showing the latest {FETCH_SIZE} of {query.data?.totalItems} notifications.</p>
        ) : null}
      </div>
    </div>
  )
}
