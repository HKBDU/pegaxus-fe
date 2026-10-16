import { useBookingHistories } from "@/features/booking/hooks"
import { BookingStatusBadge } from "@/features/booking/components/BookingStatusBadge"
import type { BookingAudience } from "@/features/booking/types"
import { formatBookingDate } from "@/features/booking/utils"
import { ErrorState } from "@/shared/components/common"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { EntityId } from "@/shared/types"

const actionLabels = {
  CREATED: "Request created",
  UPDATED: "Request updated",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
} as const

interface BookingHistoryDialogProps {
  bookingId: EntityId
  bookingCode: string
  audience: BookingAudience
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BookingHistoryDialog({ bookingId, bookingCode, audience, open, onOpenChange }: BookingHistoryDialogProps) {
  const historiesQuery = useBookingHistories(bookingId, open)
  const entries = historiesQuery.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] overflow-y-auto rounded-[2px] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Status history</DialogTitle>
          <DialogDescription>{bookingCode}</DialogDescription>
        </DialogHeader>

        {historiesQuery.isLoading ? <Skeleton className="h-32 w-full rounded-[2px]" /> : null}
        {historiesQuery.isError ? <ErrorState message="Unable to load the status history." onRetry={() => void historiesQuery.refetch()} /> : null}

        <ol className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.historyId} className="border-l-2 border-primary pl-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{actionLabels[entry.action] ?? entry.action}</span>
                {entry.previousStatus !== entry.newStatus ? <BookingStatusBadge status={entry.newStatus} audience={audience} /> : null}
              </div>
              <p className="text-xs text-gray-600">
                {formatBookingDate(entry.changedAt, true)} · {entry.changedBy.fullName} ({entry.changedBy.role.replaceAll("_", " ").toLowerCase()})
              </p>
              {entry.reason ? <p className="mt-0.5 text-xs text-gray-700">{entry.reason}</p> : null}
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
