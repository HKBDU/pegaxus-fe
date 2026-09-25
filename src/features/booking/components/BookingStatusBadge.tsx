import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import type { BookingAudience, BookingStatus } from "@/features/booking/types"
import { getBookingStatusLabel } from "@/features/booking/utils"
import { Badge } from "@/shared/components/ui/badge"

const statusStyles: Record<BookingStatus, string> = {
  PENDING: "border-amber-300 bg-amber-50 text-amber-700",
  APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-700",
  CANCELLED: "border-slate-300 bg-slate-100 text-slate-600",
  REJECTED: "border-red-300 bg-red-50 text-red-700",
  DRAFT: "border-sky-300 bg-sky-50 text-sky-700",
}

interface BookingStatusBadgeProps {
  status: BookingStatus
  audience?: BookingAudience
  className?: string
}

export function BookingStatusBadge({ status, audience = "customer", className }: BookingStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1 rounded-full border px-1.5 py-0 text-[0.65rem] font-medium leading-none",
        statusStyles[status],
        className,
      )}
    >
      <Circle className="size-1! fill-current" aria-hidden="true" />
      {getBookingStatusLabel(status, audience)}
    </Badge>
  )
}
