import type { BookingAudience, BookingStatus } from "@/features/booking/types"
import { getBookingStatusLabel } from "@/features/booking/utils"
import { StatusBadge } from "@/shared/components/ui/status-badge"
import type { StatusBadgeTone } from "@/shared/components/ui/status-badge-tones"

const statusTones: Record<BookingStatus, StatusBadgeTone> = {
  PENDING: "amber",
  APPROVED: "emerald",
  CANCELLED: "slate",
  REJECTED: "red",
  DRAFT: "sky",
}

interface BookingStatusBadgeProps {
  status: BookingStatus
  audience?: BookingAudience
  className?: string
}

export function BookingStatusBadge({ status, audience = "customer", className }: BookingStatusBadgeProps) {
  return (
    <StatusBadge tone={statusTones[status]} className={className}>
      {getBookingStatusLabel(status, audience)}
    </StatusBadge>
  )
}
